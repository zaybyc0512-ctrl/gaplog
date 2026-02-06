'use client'

import { Database } from '@/types/supabase'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Play, Pause, Trash2 } from 'lucide-react'
import { useTaskTimer } from '@/hooks/use-task-timer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { CompleteTaskDialog } from '@/components/complete-task-dialog'
import { DetailedTaskModal } from './detailed-task-modal'

// DnD Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';

// ... existing types
type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null, started_at?: string | null, elapsed_time?: number | null }

// Sortable Wrapper
function SortableTaskItem({ task }: { task: Task }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none' // Prevent scrolling on mobile while dragging? Or handle with activation constraint
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskItem task={task} />
        </div>
    );
}

function TaskItem({ task }: { task: Task }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { formattedTime, isRunning } = useTaskTimer(task)
    const supabase = createClient()

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm') || 'Are you sure?')) return
        await supabase.from('tasks').delete().eq('id', id)
        router.refresh()
    }

    const toggleTimer = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isRunning) {
            // Stop
            const now = new Date()
            const start = new Date(task.started_at!)
            const sessionSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
            const newElapsed = (task.elapsed_time || 0) + sessionSeconds

            await (supabase.from('tasks') as any).update({
                started_at: null,
                elapsed_time: newElapsed
            }).eq('id', task.id)
        } else {
            // Start
            await (supabase.from('tasks') as any).update({
                started_at: new Date().toISOString(),
                status: 'in_progress'
            }).eq('id', task.id)
        }
        router.refresh()
    }

    return (
        <DetailedTaskModal key={task.id} task={task} trigger={
            <Card className={`p-3 flex flex-row items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${isRunning ? 'border-primary/50 bg-primary/5' : ''}`}>
                <div onClick={(e) => e.stopPropagation()}>
                    <CompleteTaskDialog task={task} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{task.title}</h3>
                        {isRunning && <span className="text-xs font-mono text-primary animate-pulse">{formattedTime}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {/* Static time if not running, or maybe just keep showing the hook value? Hook shows total. */}
                        {!isRunning && (task.elapsed_time || 0) > 0 && <span className="font-mono text-muted-foreground/80">{formattedTime}</span>}

                        {task.estimated_time !== null && (
                            <span>{t('estShort')}: {task.estimated_time} {t('min')}</span>
                        )}
                        {(task.estimated_time !== null && (task.amount || task.unit)) && <span className="text-muted-foreground/50">/</span>}
                        {(task.amount || task.unit) && (
                            <span>{t('amount')}: {task.amount || 0} {task.unit || ''}</span>
                        )}
                        {task.is_draft && <span className="text-[10px] px-1.5 py-0 border rounded-full border-dashed ml-auto">Draft</span>}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${isRunning ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={toggleTimer}
                >
                    {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
                </Button>

                <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                    className="text-muted-foreground hover:text-red-500 p-2"
                    title={t('delete')}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </Card>
        } />
    )
}

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
    const { t } = useTranslation()
    const supabase = createClient()
    const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').join('-')

    // Local state for DnD
    const [tasks, setTasks] = useState(initialTasks)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setTasks(initialTasks)
        setIsMounted(true)
    }, [initialTasks])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Better for mobile/click
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), // Hold to drag on touch? Or distance is better? Distance 8 is good usually.
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Grouping
    const unscheduled = tasks.filter(t => !(t as any).scheduled_date)
    const scheduled = tasks.filter(t => (t as any).scheduled_date)

    // Sort scheduled by date for rendering order
    scheduled.sort((a, b) => ((a as any).scheduled_date || '').localeCompare((b as any).scheduled_date || ''))

    // Group Scheduled by Date
    const grouped = scheduled.reduce((acc, task) => {
        const date = (task as any).scheduled_date
        if (!acc[date]) acc[date] = []
        acc[date].push(task)
        return acc
    }, {} as Record<string, Task[]>)

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Find tasks
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);

        if (activeIndex === -1 || overIndex === -1) return;

        // Check if same group? 
        // We can just rely on index. If we allow global reorder, `arrayMove` works.
        // But if they are visually separated, cross-group drag looks weird.
        // Let's rely on SortableContext separation. 
        // Logic: if active and over are both in `unscheduled`, good.
        // If active in `unscheduled` and over in `today`, SortableContext of `today` won't accept? No, standard DnD Kit allows cross-sortable unless restricted.
        // Actually, if we use separate SortableContexts, but ONE DndContext, drag works across them.
        // To Restrict: Check if tasks[activeIndex] and tasks[overIndex] share `scheduled_date`.

        const activeTask = tasks[activeIndex];
        const overTask = tasks[overIndex];

        const aDate = (activeTask as any).scheduled_date;
        const oDate = (overTask as any).scheduled_date;

        if (aDate !== oDate) return; // Restrict to same group

        // 1. Move Array Locally
        const newTasks = arrayMove(tasks, activeIndex, overIndex);
        setTasks(newTasks);

        // 2. Calculate New Rank
        // Find new neighbors in the NEW array
        const newActiveIndex = newTasks.findIndex(t => t.id === activeId);
        const prevTask = newTasks[newActiveIndex - 1];
        const nextTask = newTasks[newActiveIndex + 1];

        // Rank Calculation Logic
        // display_order (double)
        // If first: next.order - 1000? Or just take next.order / 2? No, if ascending...
        // Sort: ascending. 
        // First item: < next.order.
        // Last item: > prev.order.
        // Between: (prev + next) / 2.

        let newOrder = 0;
        const prevOrder = prevTask ? (prevTask.display_order || 0) : null;
        const nextOrder = nextTask ? (nextTask.display_order || 0) : null;

        if (prevOrder !== null && nextOrder !== null) {
            newOrder = (prevOrder + nextOrder) / 2;
        } else if (prevOrder !== null) {
            newOrder = prevOrder + 10000; // End
        } else if (nextOrder !== null) {
            newOrder = nextOrder - 10000; // Start
        } else {
            newOrder = new Date().getTime() / 1000; // Default
        }

        // Update active task local ordering to prevent jump
        newTasks[newActiveIndex].display_order = newOrder;
        setTasks([...newTasks]); // trigger re-render with new order applied in state?

        // 3. Save to DB
        await (supabase.from('tasks') as any).update({ display_order: newOrder }).eq('id', activeId);
    }

    // Helper to render section
    const renderSection = (title: string, groupTasks: Task[], isToday = false) => (
        <div key={title} className="space-y-2 mb-6">
            <h3 className={`font-semibold text-sm ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {title} <span className="text-xs font-normal">({groupTasks.length})</span>
            </h3>
            <div className="grid gap-2">
                {isMounted ? (
                    <SortableContext
                        items={groupTasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {groupTasks.map(task => <SortableTaskItem key={task.id} task={task} />)}
                    </SortableContext>
                ) : (
                    groupTasks.map(task => <TaskItem key={task.id} task={task} />)
                )}
            </div>
        </div>
    )

    if (!isMounted) {
        return (
            <div className="p-4 pb-20">
                {/* Static Render for SSR/Hydration */}
                {unscheduled.length > 0 && renderSection("未定 (Inbox)", unscheduled)}
                {Object.keys(grouped).map(date => {
                    const label = date === todayStr ? `今日 (${date})` : date
                    const isToday = date === todayStr
                    return renderSection(label, grouped[date], isToday)
                })}
                {initialTasks.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">No active tasks</div>
                )}
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="p-4 pb-20">
                {/* 1. Unscheduled (Inbox) */}
                {unscheduled.length > 0 && renderSection("未定 (Inbox)", unscheduled)}

                {/* 2. Scheduled Days */}
                {Object.keys(grouped).map(date => {
                    const label = date === todayStr ? `今日 (${date})` : date
                    const isToday = date === todayStr
                    return renderSection(label, grouped[date], isToday)
                })}

                {initialTasks.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        No active tasks
                    </div>
                )}
            </div>
        </DndContext>
    )
}
