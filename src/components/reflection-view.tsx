'use client'

import { Card } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Database } from '@/types/supabase'
import { useTranslation } from '@/lib/i18n'
import { CheckCircle2 } from 'lucide-react'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    unit?: string | null,
    started_at?: string | null,
    elapsed_time?: number | null,
    actual_time?: number | null,
    gap_score?: number | null,
    completed_at?: string | null
}

interface ReflectionViewProps {
    tasks: Task[]
}

export function ReflectionView({ tasks }: ReflectionViewProps) {
    const { t } = useTranslation()

    // Sort by completion date descending
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.completed_at) return 1
        if (!b.completed_at) return -1
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    })

    const getGapBadge = (gap: number | null) => {
        if (gap === null) return <Badge variant="outline" className="text-muted-foreground">データなし</Badge>

        if (gap === 0) return <Badge variant="secondary" className="text-muted-foreground">誤差なし</Badge>
        if (gap > 0) return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">{gap}% 短縮</Badge>
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">{Math.abs(gap)}% 超過</Badge>
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                <p>完了したタスクはまだありません。</p>
                <p className="text-sm mt-2">タスクを完了すると、ここに振り返りレポートが表示されます。</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {sortedTasks.map(task => (
                <Card key={task.id} className="p-3">
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm line-through text-muted-foreground decoration-border/50 truncate">
                                {task.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                <span className="text-muted-foreground">{formatDate(task.completed_at)}</span>
                                <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
                                    <span className="text-muted-foreground">実績</span>
                                    <span className="font-semibold">{task.actual_time || '-'}分</span>
                                    <span className="text-muted-foreground text-[10px] mx-1">/</span>
                                    <span className="text-muted-foreground">予測</span>
                                    <span>{task.estimated_time || '-'}分</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            {getGapBadge(task.gap_score ?? null)}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
