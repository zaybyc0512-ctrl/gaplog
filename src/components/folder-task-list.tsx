'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { Database } from '@/types/supabase'
import { DetailedTaskModal } from './detailed-task-modal'
import { CompleteTaskDialog } from './complete-task-dialog'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveTask } from '@/app/actions'
import { useState } from 'react'
import { GripVertical, Trash2, Plus, Play, Pause } from 'lucide-react'
import { useTaskTimer } from '@/hooks/use-task-timer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Extend Task type to include unit and context_id
type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null, context_id?: string | null, started_at?: string | null, elapsed_time?: number | null }
type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']

interface FolderTaskListProps {
    tasks: Task[]
    contexts: Context[]
    categories: Category[]
    masters: Master[]
}

// FolderTaskCard component with Timer
function FolderTaskCard({ task }: { task: Task }) {
    const { t } = useTranslation()
    const router = useRouter()
    const supabase = createClient()
    const { formattedTime, isRunning } = useTaskTimer(task)

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
        <DetailedTaskModal task={task} trigger={
            <Card className={`p-2 flex flex-row items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors w-full ${isRunning ? 'border-primary/50 bg-primary/5' : ''}`}>
                <div onClick={(e) => e.stopPropagation()}>
                    <CompleteTaskDialog task={task} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{task.title}</h3>
                        {isRunning && <span className="text-xs font-mono text-primary animate-pulse">{formattedTime}</span>}
                        {/* Show saved time if not running and exists */}
                        {!isRunning && (task.elapsed_time || 0) > 0 && <span className="text-[10px] font-mono text-muted-foreground">{formattedTime}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {task.estimated_time !== null && (<span>{t('estShort')}: {task.estimated_time}{t('min')}</span>)}
                        {(task.estimated_time !== null && (task.amount || task.unit)) && <span className="text-muted-foreground/50">/</span>}
                        {(task.amount || task.unit) && (<span>{t('amount')}: {task.amount || 0} {task.unit || ''}</span>)}
                        <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded ml-auto">Inbox</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ml-auto ${isRunning ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={toggleTimer}
                >
                    {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                </Button>

                <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }} className="text-muted-foreground hover:text-red-500 px-2 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                </button>
            </Card>
        } />
    )
}

// Sortable Task Item Component... (unchanged)
function SortableTaskItem({ task, children }: { task: Task, children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { task } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/50 hover:text-foreground p-1 transition-colors">
                <GripVertical size={16} />
            </div>
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    )
}

function CategoryDropZone({ id, label }: { id: string, label?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id })

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[50px] w-full border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground transition-colors ${isOver ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'}`}
        >
            {isOver ? (label || 'ドロップして追加') : (label || '(空) ここにドロップ')}
        </div>
    )
}

export function FolderTaskList({ tasks, contexts, categories, masters }: FolderTaskListProps) {
    const router = useRouter()
    const supabase = createClient()
    const { t } = useTranslation()
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeTask, setActiveTask] = useState<Task | null>(null)

    // Create Context State
    const [isCreatingContext, setIsCreatingContext] = useState(false)
    const [newContextName, setNewContextName] = useState('')

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDelete = async (id: string) => {
        if (!confirm('このタスクを削除しますか？')) return
        await supabase.from('tasks').delete().eq('id', id)
        router.refresh()
    }

    const handleCreateContext = async () => {
        if (!newContextName.trim()) return
        await (supabase.from('contexts') as any).insert({ name: newContextName.trim() })
        setNewContextName('')
        setIsCreatingContext(false)
        router.refresh()
    }

    // Helper to find path for a task
    const getTaskPath = (task: Task) => {
        // Priority: Explicit -> Implicit
        if (task.context_id) {
            if (task.category_id) return { contextId: task.context_id, categoryId: task.category_id }
            return { contextId: task.context_id, categoryId: 'uncategorized' }
        }

        if (task.category_id) {
            const c = categories.find(x => x.id === task.category_id)
            if (c) return { contextId: c.context_id, categoryId: c.id }
        }

        if (task.master_id) {
            const m = masters.find(x => x.id === task.master_id)
            if (m) {
                const c = categories.find(x => x.id === m.category_id)
                if (c) return { contextId: c.context_id, categoryId: c.id }
            }
        }

        return { contextId: 'inbox', categoryId: 'inbox' }
    }

    // Grouping
    const tree: Record<string, Record<string, Task[]>> = {}

    // Seed contexts and categories
    contexts.forEach(ctx => {
        tree[ctx.id] = {}
        categories.filter(c => c.context_id === ctx.id).forEach(cat => {
            tree[ctx.id][cat.id] = []
        })
        // Always seed uncategorized bucket for context
        tree[ctx.id]['uncategorized'] = []
    })

    tree['inbox'] = { 'inbox': [] }

    tasks.forEach(task => {
        const { contextId, categoryId } = getTaskPath(task)
        if (!tree[contextId]) tree[contextId] = {} // Should exist if context exists
        if (!tree[contextId][categoryId]) tree[contextId][categoryId] = []
        tree[contextId][categoryId].push(task)
    })

    const inboxTasks = tree['inbox']['inbox'] || []

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)
        setActiveTask(active.data.current?.task || null)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setActiveTask(null)

        if (!over) return

        const activeTaskId = active.id as string
        const overId = over.id as string

        // Parse Target
        let targetContextId: string | null = null
        let targetCategoryId: string | null = null // null means 'uncategorized' or actual category id

        // Case 1: Dropped on a Task
        const overTask = tasks.find(t => t.id === overId)
        if (overTask) {
            const path = getTaskPath(overTask)
            targetContextId = path.contextId === 'inbox' ? null : path.contextId
            targetCategoryId = path.categoryId === 'inbox' || path.categoryId === 'uncategorized' ? null : path.categoryId
        } else {
            // Case 2: Dropped on Zone
            if (overId === 'inbox') {
                targetContextId = null
                targetCategoryId = null
            } else if (overId.includes('::uncategorized')) {
                // Format: contextId::uncategorized
                targetContextId = overId.split('::')[0]
                targetCategoryId = null
            } else {
                // Assume category ID
                const cat = categories.find(c => c.id === overId)
                if (cat) {
                    targetContextId = cat.context_id
                    targetCategoryId = cat.id
                }
            }
        }

        // Update
        // We use supabase directly to update both context and category
        await (supabase.from('tasks') as any).update({
            context_id: targetContextId,
            category_id: targetCategoryId
        }).eq('id', activeTaskId)

        router.refresh()
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="pb-20 space-y-6">

                {/* SECTION A: INBOX */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{t('inbox')}</h2>
                    <div className="bg-muted/30 rounded-lg p-2 min-h-[50px] border border-dashed">
                        <SortableContext items={inboxTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {inboxTasks.length === 0 && (
                                    <CategoryDropZone id="inbox" label={t('noTasksInbox')} />
                                )}
                                {inboxTasks.map(task => (
                                    <SortableTaskItem key={task.id} task={task}>
                                        <FolderTaskCard task={task} />
                                    </SortableTaskItem>
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                </div>

                {/* SECTION B: FOLDERS */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('folders')}</h2>
                        {!isCreatingContext ? (
                            <Button variant="ghost" size="sm" onClick={() => setIsCreatingContext(true)} className="h-6 text-xs gap-1">
                                <Plus className="w-3 h-3" /> フォルダ作成
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Input className="h-7 w-32 text-xs" placeholder="フォルダ名" value={newContextName} onChange={e => setNewContextName(e.target.value)} />
                                <Button size="sm" className="h-7 text-xs" onClick={handleCreateContext}>追加</Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsCreatingContext(false)}>×</Button>
                            </div>
                        )}
                    </div>

                    <Accordion type="multiple" className="w-full space-y-2">
                        {contexts.map((ctx) => {
                            const catMap = tree[ctx.id] || {}
                            // Count all tasks in context (categories + keys)
                            const contextTaskCount = Object.values(catMap).reduce((acc: number, list: any) => acc + list.length, 0)

                            return (
                                <AccordionItem value={ctx.id} key={ctx.id} className="border rounded-md px-2 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="font-semibold text-foreground">{ctx.name}</span>
                                            <Badge variant="secondary">{contextTaskCount}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-2 pr-0 pt-0 pb-2 space-y-2">
                                        {/* Uncategorized Zone */}
                                        <div className="border-l-2 border-dashed border-muted pl-3 py-1 mt-2">
                                            <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                (未設定)
                                                <span className="text-[10px] bg-muted px-1.5 rounded-full">{(catMap['uncategorized'] || []).length}</span>
                                            </div>
                                            <SortableContext items={(catMap['uncategorized'] || []).map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2">
                                                    {(catMap['uncategorized'] || []).length === 0 && (
                                                        <CategoryDropZone id={`${ctx.id}::uncategorized`} label="(未設定) ドロップして移動" />
                                                    )}
                                                    {(catMap['uncategorized'] || []).map((task: Task) => (
                                                        <SortableTaskItem key={task.id} task={task}>
                                                            <FolderTaskCard task={task} />
                                                        </SortableTaskItem>
                                                    ))}
                                                    {(catMap['uncategorized'] || []).length > 0 && (
                                                        <CategoryDropZone id={`${ctx.id}::uncategorized`} label="ここにもドロップ可能" />
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </div>

                                        {/* Categories */}
                                        {categories.filter(c => c.context_id === ctx.id).map((cat) => {
                                            const tasksInCat = (catMap[cat.id] || []) as Task[]
                                            return (
                                                <div key={cat.id} className="border-l-2 border-muted pl-3 py-1 mt-2">
                                                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                        {cat.name}
                                                        <span className="text-[10px] bg-muted px-1.5 rounded-full">{tasksInCat.length}</span>
                                                    </div>
                                                    <SortableContext items={tasksInCat.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-2">
                                                            {tasksInCat.map(task => (
                                                                <SortableTaskItem key={task.id} task={task}>
                                                                    <FolderTaskCard task={task} />
                                                                </SortableTaskItem>
                                                            ))}
                                                            <CategoryDropZone id={cat.id} />
                                                        </div>
                                                    </SortableContext>
                                                </div>
                                            )
                                        })}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                </div>
            </div>
            <DragOverlay>
                {activeTask ? (
                    <Card className="p-2 flex flex-row items-center gap-2 bg-background border shadow-lg opacity-80 cursor-grabbing">
                        <div className="w-5 h-5 rounded-full border opacity-50"></div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{activeTask.title}</h3>
                        </div>
                    </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
