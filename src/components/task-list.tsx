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

// ... existing types
type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null, started_at?: string | null, elapsed_time?: number | null }

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
    return (
        <div className="grid gap-2 p-4 pb-20">
            {initialTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
            ))}

            {initialTasks.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">
                    No active tasks
                </div>
            )}
        </div>
    )
}
