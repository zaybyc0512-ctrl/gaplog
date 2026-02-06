import { createClient } from '@/lib/supabase/client'
import { addDays, format, parseISO } from 'date-fns'

interface TaskStub {
    id: string
    estimated_time: number
    due_date: string | null
    created_at: string
}

export async function allocateTasks(userId: string, startFromDate?: string) {
    const supabase = createClient()

    // 1. Fetch Tasks (Unfinished)
    const { data: rawTasks, error: taskError } = await supabase
        .from('tasks')
        .select('*') // Fetch ALL columns to prevent not-null errors on upsert
        .eq('user_id', userId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false }) // deadline first
        .order('created_at', { ascending: true }) // then FIFO

    if (taskError || !rawTasks) throw taskError || new Error('No tasks found')

    const tasks = rawTasks as any[]

    // 2. Fetch Capacities (Next 30 days from start date)
    const today = startFromDate ? parseISO(startFromDate) : new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const endStr = format(addDays(today, 30), 'yyyy-MM-dd')

    const { data: capacities, error: capError } = await supabase
        .from('daily_capacities')
        .select('date, available_minutes')
        .eq('user_id', userId)
        .gte('date', todayStr)
        .lte('date', endStr)

    if (capError) throw capError

    // Map Capacity: Date -> Available Minutes
    const capMap = new Map<string, number>()
    capacities?.forEach((c: any) => {
        capMap.set(c.date, c.available_minutes || 0)
    })

    // 3. Greedy Allocation
    const updates: any[] = []

    // Simulate daily usage to track remaining capacity as we fill
    const dailyUsage = new Map<string, number>()

    let currentDayOffset = 0
    let currentDayStr = todayStr

    // Fallback: Default capacity if no record exists (e.g. 0 or reasonable default? 0 implies strictly no work unless set)
    // User requirement: "If no setting, default 0 min" -> implied strictly restricted? 
    // Usually systems default to some generic 480min if not set, but let's stick to strict 0 if map missing, 
    // implies user MUST set capacity. Or maybe better to assume small capacity like 60m?
    // User prompt: "設定がなければデフォルト0分扱い" -> OK, 0 minutes.

    for (const task of tasks) {
        let assigned = false
        const estimate = task.estimated_time || 0

        // Search for a slot from *Current Allocation Day* onwards
        // We do *not* reset date loop for each task; we stack them.
        // Wait, if it's greedy *scheduling*, high priority tasks take Today.
        // Yes, due_date sorted. So first task gets Today. Next gets Today if fits, else Tomorrow.

        // Start checking from Today (or currently filled day)
        // If we want to allow filling gaps? Complex. Simple Greedy: Just fill forward.
        // We can restart check from Today for every task? No, that's O(N*30).
        // Actually that is fine for N=100.
        // Better: Keep a cursor `currentDayOffset`?
        // If Task A fills Today, Task B checks Today, fits? Yes -> Scheduled Today.
        // If Task C checks Today, Full? Check Tomorrow.

        let dayOffset = 0 // Always try to squeeze in as early as possible? 
        // Logic: "Greedy Allocation" -> Try Today. If fit, put there. Else Next Day.

        // Safety break: 30 days
        while (dayOffset < 30) {
            const checkDate = addDays(today, dayOffset)
            const dateStr = format(checkDate, 'yyyy-MM-dd')

            const cap = capMap.get(dateStr) || 0
            const used = dailyUsage.get(dateStr) || 0

            // "入り切らない大きなタスクはその日の残りを無視して配置してOK"
            // If the day is completely empty or has space?
            // "Partially fits" -> If task > Capacity?
            // If (used == 0) -> Empty day. Even if task > cap, put it here?
            // "Take remainder of day"?

            // Interpretation:
            // If (Capacity - Used) >= Estimate: Fits perfectly.
            // If (Capacity - Used) < Estimate:
            //    Is (Capacity - Used) > 0? Maybe fill? No "タスク分割は行わない"
            //    So if it doesn't fit, go next.
            // Exception: If Task > Total Daily Capacity?
            //    It will never fit. 
            //    Rule: If it doesn't fit *anywhere* (because too big), put it in the *first empty(ish)* day?
            //    Or: "If Estimate > Capacity, occupy the WHOLE day".

            if (cap === 0) {
                // No capacity this day, skip
                dayOffset++
                continue
            }

            if (estimate <= (cap - used)) {
                // Fits!
                updates.push({ ...task, scheduled_date: dateStr })
                dailyUsage.set(dateStr, used + estimate)
                assigned = true
                break
            } else {
                // Doesn't fit.
                // Special Case: Task is bigger than the day's TOTAL capacity?
                if (estimate > cap && used === 0) {
                    // It consumes the whole day (and overflows, but we allow it per instructions "ignore remainder")
                    updates.push({ ...task, scheduled_date: dateStr })
                    dailyUsage.set(dateStr, used + estimate) // Over capacity
                    assigned = true
                    break
                }

                // Try next day
                dayOffset++
            }
        }

        // If never assigned (e.g. beyond 30 days or no capacity set), 
        // assign to 31st day or keep null?
        // Let's force assign to 30th day if not found? Or leave null?
        // "保存: 決定した scheduled_date でDBを一括更新"
        // If not assigned, maybe leave as is? Or better, dump in "Tomorrow" or "Today"?
        // Let's leave null if truly no space found (alert user?), but for now code won't update.
        // Actually, let's just dump remaining into the last checked day or "Today" + 30.
    }

    // 4. Update DB
    if (updates.length > 0) {
        const { error } = await (supabase
            .from('tasks') as any)
            .upsert(updates) // Upsert works if we provide ID. update() with case switching is harder.

        if (error) throw error
    }

    return updates.length
}
