import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { DoorOpen, ArrowRightCircle } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { allocateTasks } from '@/lib/logic/scheduler'

interface CarryOverDialogProps {
    tasks: any[]
    userId: string
}

export function CarryOverDialog({ tasks, userId }: CarryOverDialogProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Filter tasks aiming for today or past or unscheduled
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const targetTasks = tasks.filter(t => {
        if (t.status === 'done') return false
        // Condition: Due Date is NULL OR Before/Equal Today
        if (!t.due_date) return true
        return t.due_date <= todayStr
    })

    const count = targetTasks.length

    const handleCarryOver = async () => {
        setIsLoading(true)
        try {
            const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

            // Call Scheduler Engine starting from Tomorrow
            await allocateTasks(userId, tomorrow)

            setIsOpen(false)
            alert(`${count}個のタスクを明日に持ち越し、再スケジュールしました。`)

            // Wait slightly to ensure DB propagation before refresh
            setTimeout(() => {
                router.refresh()
            }, 500)

        } catch (e) {
            alert('エラーが発生しました')
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    if (count === 0) {
        return (
            <Button variant="ghost" size="icon" disabled className="text-muted-foreground/30" title="持ち越すタスクはありません">
                <DoorOpen className="w-5 h-5" />
            </Button>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="今日はここまで（翌日へ持ち越し）">
                    <DoorOpen className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>今日はここまで</DialogTitle>
                    <DialogDescription>
                        本日行う予定だった未完了タスクが <strong>{count}個</strong> あります。<br />
                        これらを明日の予定として持ち越しますか？
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <p>※ 対象: 実施予定日が今日または未定の未完了タスク</p>
                    <p>※ 全ての対象タスクが明日以降に再スケジュールされます。</p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>キャンセル</Button>
                    <Button onClick={handleCarryOver} disabled={isLoading} className="gap-2">
                        <ArrowRightCircle className="w-4 h-4" />
                        明日に持ち越す
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
