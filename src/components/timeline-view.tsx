'use client'

import { Database } from '@/types/supabase'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null }

export function TimelineView({ tasks }: { tasks: Task[] }) {
    // Logic: Stack tasks from "Now" (or a start time)
    // We filter out 'done' tasks usually, but if 'tasks' prop includes them, handled here.
    // We assume 'tasks' are sorted by order we want to do them (or created_at desc?).
    // For a timeline, we usually want "created_at asc" or some priority. 
    // Let's assume the passed 'tasks' are in order of execution for simpler MVP.
    // Actually, standard list is created_at desc (Newest on top).
    // Timeline usually goes top->down (Future->Far Future).
    // Let's reverse for timeline if they are Newest First? Or just use as is.
    // If user adds tasks for "Today", they usually assume FIFO or LIFO?
    // Let's iterate and just accumulate time.

    // Start 9:00 AM? Or Now?
    // Let's start from nearest hour or Now.
    let currentTime = new Date()
    currentTime.setSeconds(0, 0)

    const timelineItems = tasks.map(task => {
        const duration = task.estimated_time || 15 // default 15m if missing

        const startTime = new Date(currentTime)
        const endTime = new Date(currentTime.getTime() + duration * 60000)

        if (!task.is_draft) {
            // Only advance time if NOT draft? 
            // Or draft occupies time? Requirement: "時間は確保しないが...メモしておきたい"
            // So Draft does NOT consume time.
            // But should it separate real tasks?
            // Let's keep it in the flow but duration doesn't shift start time of Next Task?
            // Or just shift? 
            // "Width ensure" = Draft is false. "Not Ensure" = Draft is true.
            // So Draft should likely NOT shift the `currentTime` pointer for the NEXT task?
            // Let's implement: Drafts appear at `currentTime` but don't push it forward.
            // Actually, visually users might want to see them in sequence.
            // Let's implement: Drafts are just 0-width block or separate visual?
            // Requirement: "Draft tasks... thin dotted line... time not allocated"
            // So 0 min duration valid? 
            currentTime = endTime
        }

        return {
            ...task,
            startTime,
            endTime,
            duration
        }
    })


    return (
        <div className="flex flex-col h-[600px] w-full border rounded-md">
            <ScrollArea className="flex-1 p-4">
                <div className="relative border-l-2 border-muted ml-4 space-y-0 pb-10">
                    {timelineItems.map((item, idx) => (
                        <div key={item.id} className="relative pl-6 pb-6">
                            {/* Time Label */}
                            <div className="absolute -left-[60px] top-0 text-xs text-muted-foreground w-[50px] text-right">
                                {formatTime(item.startTime)}
                            </div>

                            {/* Dot */}
                            <div className={cn(
                                "absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border bg-background z-10",
                                item.is_draft ? "border-dashed border-gray-400" : "border-primary bg-primary"
                            )} />


                            {/* Card */}
                            <div className={cn(
                                "p-3 rounded-lg border text-sm shadow-sm transition-all",
                                // Draft styling
                                item.is_draft
                                    ? "border-dashed border-muted-foreground/50 bg-muted/20 text-muted-foreground"
                                    : item.status === 'done'
                                        ? "bg-muted text-muted-foreground line-through opacity-60 border-transparent"
                                        : "bg-card border-border"
                            )}>
                                <div className="font-semibold">{item.title}</div>
                                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                    <span>{item.amount && `量: ${item.amount}${item.unit || ''}`}</span>
                                    <div>
                                        {item.is_draft ? "Draft" : `${item.duration} 分`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* End marker */}
                <div className="relative pl-6 ml-4">
                    <div className="absolute -left-[60px] top-0 text-xs text-muted-foreground w-[50px] text-right">
                        {formatTime(currentTime)}
                    </div>
                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border border-muted-foreground bg-muted z-10" />
                    <div className="text-xs text-muted-foreground pl-3 pt-0.5">
                        予定終了
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
