'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/supabase'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card'
import { Play, Pause } from 'lucide-react'

type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null, started_at?: string | null, elapsed_time?: number | null }

interface ScheduleStackViewProps {
    tasks: Task[]
    dailyCapacityMinutes: number
    onTaskClick?: (task: Task) => void
}

function SortableStackItem({
    task,
    cumulativeTime,
    dailyCapacityMinutes,
    onClick
}: {
    task: Task
    cumulativeTime: number
    dailyCapacityMinutes: number
    onClick?: (task: Task) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none'
    }

    const { t } = useTranslation()
    const estimate = task.estimated_time || 0
    const isOverflow = cumulativeTime > dailyCapacityMinutes

    // Indicator Scale: 1min = 1px? Or percentage?
    // User requested "absolute length" if possible. 
    // Let's use 1min = 2px for visibility, maxing out at card height - padding?
    // Or just simple px. 
    const indicatorHeight = Math.max(4, estimate * 1.5) // 10min -> 15px

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2">
            <Card
                className={`
                    flex flex-row items-center gap-3 p-0 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors
                    min-h-[50px]
                    ${isOverflow ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-card'}
                `}
                onClick={(e) => {
                    // Prevent click if dragging? 
                    // dnd-kit handles this usually.
                    if (!isDragging) onClick?.(task)
                }}
            >
                {/* Indicator Bar Container */}
                <div className="w-1.5 self-stretch bg-muted flex flex-col justify-end">
                    <div
                        className={`w-full ${isOverflow ? 'bg-red-400' : 'bg-primary'}`}
                        style={{ height: `${indicatorHeight}px`, maxHeight: '100%' }}
                    />
                </div>

                <div className="flex-1 py-3 pr-4 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className={`font-medium text-sm truncate ${isOverflow ? 'text-red-700 dark:text-red-300' : ''}`}>
                            {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{estimate}m</span>
                            {isOverflow && <span className="text-red-500 text-[10px]">(Capacity Exceeded)</span>}
                        </div>
                    </div>

                    {/* Visual spacer for "time mass" maybe? */}
                    {/* Just keep it simple as requested */}
                </div>
            </Card>
        </div>
    )
}

export function ScheduleStackView({ tasks, dailyCapacityMinutes, onTaskClick }: ScheduleStackViewProps) {
    const supabase = createClient()

    // Sort logic should be handled by display_order from parent, 
    // but we need local state for immediate DnD feedback.
    const [localTasks, setLocalTasks] = useState(tasks)

    // Sync when props change (careful not to overwrite during drag? DnD handles order)
    useMemo(() => {
        // Only update if IDs change to avoid resetting order while dragging if something triggers re-render?
        // Actually simplest is just syncing.
        setLocalTasks(tasks)
    }, [tasks])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = localTasks.findIndex(t => t.id === active.id)
        const newIndex = localTasks.findIndex(t => t.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        const newTasks = arrayMove(localTasks, oldIndex, newIndex)
        setLocalTasks(newTasks)

        // DB Update Logic (Identical to TaskList)
        const activeId = String(active.id)
        const prevTask = newTasks[newIndex - 1]
        const nextTask = newTasks[newIndex + 1]

        let newOrder = 0
        const prevOrder = prevTask ? (prevTask.display_order || 0) : null
        const nextOrder = nextTask ? (nextTask.display_order || 0) : null

        if (prevOrder !== null && nextOrder !== null) {
            newOrder = (prevOrder + nextOrder) / 2
        } else if (prevOrder !== null) {
            newOrder = prevOrder + 10000
        } else if (nextOrder !== null) {
            newOrder = nextOrder - 10000
        } else {
            newOrder = new Date().getTime() / 1000
        }

        // Optimistic update
        await (supabase.from('tasks') as any).update({ display_order: newOrder }).eq('id', activeId)
    }

    // Cumulative Time Calculation for Overflow
    let runningTotal = 0
    const taskNodes = localTasks.map(task => {
        const est = task.estimated_time || 0
        runningTotal += est
        return {
            task,
            cumulative: runningTotal
        }
    })

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="w-full pb-20 pt-2">
                <SortableContext
                    items={localTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {taskNodes.map(({ task, cumulative }) => (
                        <SortableStackItem
                            key={task.id}
                            task={task}
                            cumulativeTime={cumulative}
                            dailyCapacityMinutes={dailyCapacityMinutes}
                            onClick={onTaskClick}
                        />
                    ))}
                </SortableContext>

                {localTasks.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        No tasks scheduled for this day
                    </div>
                )}
            </div>
        </DndContext>
    )
}
