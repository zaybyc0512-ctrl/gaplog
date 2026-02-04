import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'
import { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    unit?: string | null,
    started_at?: string | null,
    elapsed_time?: number | null
}

interface CompleteTaskDialogProps {
    task: Task
}

export function CompleteTaskDialog({ task }: CompleteTaskDialogProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [actualTime, setActualTime] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Initialize logic
    useEffect(() => {
        if (open) {
            let totalSeconds = task.elapsed_time || 0
            if (task.started_at) {
                const start = new Date(task.started_at).getTime()
                const now = new Date().getTime()
                totalSeconds += Math.floor((now - start) / 1000)
            }

            if (totalSeconds > 0) {
                setActualTime(Math.ceil(totalSeconds / 60))
            } else {
                setActualTime(task.estimated_time || 0)
            }
        }
    }, [open, task.elapsed_time, task.started_at, task.estimated_time])

    // Gap Calculation
    const getGapInfo = () => {
        if (!task.estimated_time || task.estimated_time === 0) return null
        const diff = task.estimated_time - actualTime
        const percent = Math.round((diff / task.estimated_time) * 100)

        if (percent === 0) return { text: '誤差なし', color: 'text-muted-foreground' }
        if (percent > 0) return { text: `${percent}% 短縮`, color: 'text-green-600 font-bold' }
        return { text: `${Math.abs(percent)}% 超過`, color: 'text-red-500 font-bold' }
    }

    const gapInfo = getGapInfo()

    const handleComplete = async () => {
        setIsSubmitting(true)
        try {
            const payload: any = {
                status: 'done',
                actual_time: actualTime,
                started_at: null,
                completed_at: new Date().toISOString()
            }

            if (task.estimated_time && task.estimated_time > 0) {
                const diff = task.estimated_time - actualTime
                const percent = Math.round((diff / task.estimated_time) * 100)
                payload.gap_score = percent
            }

            await (supabase.from('tasks') as any).update(payload).eq('id', task.id)
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleComplete()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-green-500 transition-colors bg-transparent border-0 p-1">
                    <CheckCircle2 className="w-5 h-5" />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>{t('complete')}</DialogTitle>
                    <DialogDescription className="sr-only">Enter the actual time spent on this task.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label>{t('actualTime')} (分)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={actualTime}
                                onChange={(e) => setActualTime(Number(e.target.value))}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="text-lg font-medium"
                            />
                            {gapInfo && (
                                <div className={`text-xs whitespace-nowrap ${gapInfo.color}`}>
                                    {gapInfo.text}
                                </div>
                            )}
                        </div>
                        {task.estimated_time && (
                            <div className="text-xs text-muted-foreground text-right">
                                予測: {task.estimated_time} 分
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleComplete} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : t('complete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
