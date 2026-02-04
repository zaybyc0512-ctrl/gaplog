'use client'

import { useEffect, useState } from 'react'
import { Play, Pause, Minimize2, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaskTimer } from '@/hooks/use-task-timer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CompleteTaskDialog } from './complete-task-dialog'
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    unit?: string | null,
    started_at?: string | null,
    elapsed_time?: number | null
}

interface FocusModeProps {
    task: Task
    onMinimize: () => void
}

export function FocusMode({ task, onMinimize }: FocusModeProps) {
    const { formattedTime, isRunning, seconds } = useTaskTimer(task)
    const supabase = createClient()
    const router = useRouter()
    const [progress, setProgress] = useState(0)

    // Calculate progress bar
    useEffect(() => {
        if (task.estimated_time && task.estimated_time > 0) {
            const estimatedSeconds = task.estimated_time * 60
            const p = Math.min(100, (seconds / estimatedSeconds) * 100)
            setProgress(p)
        }
    }, [seconds, task.estimated_time])

    const toggleTimer = async () => {
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
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={onMinimize} className="h-10 w-10 rounded-full hover:bg-muted">
                    <Minimize2 className="w-6 h-6" />
                </Button>
            </div>

            <div className="max-w-2xl w-full flex flex-col items-center gap-8 text-center">

                {/* Task Info */}
                <div className="space-y-2">
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">Running Task</div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{task.title}</h1>
                    {task.estimated_time && (
                        <div className="text-lg text-muted-foreground">
                            予測: {task.estimated_time} 分
                        </div>
                    )}
                </div>

                {/* Timer Display */}
                <div className="relative">
                    <div className={`text-[8rem] md:text-[10rem] font-mono leading-none tracking-tighter tabular-nums ${isRunning ? 'text-primary' : 'text-muted-foreground'}`}>
                        {formattedTime}
                    </div>
                </div>

                {/* Progress Indicator */}
                {task.estimated_time && (
                    <div className="w-full max-w-md h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-red-500' : 'bg-primary'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-6 mt-8">
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-16 w-16 rounded-full border-2"
                        onClick={toggleTimer}
                    >
                        {isRunning ? <Pause className="w-8 h-8 fill-foreground" /> : <Play className="w-8 h-8 fill-foreground ml-1" />}
                    </Button>

                    <div className="scale-150">
                        <CompleteTaskDialog task={task} />
                    </div>
                </div>

                <div className="mt-8 text-sm text-muted-foreground/50">
                    Focus Mode Active
                </div>
            </div>
        </div>
    )
}
