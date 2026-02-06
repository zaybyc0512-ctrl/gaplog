'use client'

import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    estimated_time?: number | null
}

interface CapacityIndicatorProps {
    tasks: Task[]
    capacityMinutes: number
}

export function CapacityIndicator({ tasks, capacityMinutes }: CapacityIndicatorProps) {
    // Determine load from tasks that are NOT done
    // Assuming passed tasks are already filtered (active tasks)
    // Filter for TODAY's scheduled tasks
    // If scheduled_date is used, we only sum tasks scheduled for today.
    const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').join('-')
    const loadMinutes = tasks.reduce((acc, t) => {
        // If task is done, ignore (already filtered outside usually, but safety check)
        if (t.status === 'done') return acc
        // Use scheduled_date if available. 
        // If scheduled_date is null? Should it count? 
        // User request: "today's remaining time calculation matches scheduled_date === Today"
        const isToday = (t as any).scheduled_date === todayStr
        if (isToday) return acc + (t.estimated_time || 0)
        return acc
    }, 0)

    // Avoid division by zero
    const effectiveCapacity = Math.max(capacityMinutes, 1)
    const percentage = Math.min((loadMinutes / effectiveCapacity) * 100, 100)

    const isOverflow = loadMinutes > capacityMinutes
    const overflowMinutes = loadMinutes - capacityMinutes
    const remainingMinutes = Math.max(0, capacityMinutes - loadMinutes)

    if (capacityMinutes === 0) return null

    return (
        <div className="w-full space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                    {isOverflow ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                    <span className={`font-semibold ${isOverflow ? 'text-destructive' : 'text-foreground'}`}>
                        {isOverflow
                            ? `${overflowMinutes}分 オーバーしています！`
                            : `残り ${Math.floor(remainingMinutes / 60)}時間 ${remainingMinutes % 60}分`}
                    </span>
                </div>
                <div className="text-muted-foreground text-xs">
                    {loadMinutes} / {capacityMinutes} 分 (キャパ {Math.round((loadMinutes / effectiveCapacity) * 100)}% 使用)
                </div>
            </div>

            <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isOverflow ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isOverflow && (
                <p className="text-xs text-destructive text-right">
                    予定を見直すか、タスクを減らしてください。
                </p>
            )}
        </div>
    )
}
