import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTranslation } from '@/lib/i18n'

export function QuickInput() {
    const { t } = useTranslation()
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // History State
    const [history, setHistory] = useState<string[]>([])
    const [showHistory, setShowHistory] = useState(false)

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            // Cast to any to bypass strict type check for now if types are generated weirdly
            const { data } = await (supabase
                .from('tasks')
                .select('title')
                .order('created_at', { ascending: false })
                .limit(20) as any)

            if (data) {
                // Unique titles
                // data comes as { title: string }[] but typed loosely
                const titles = data.map((t: any) => t.title).filter((t: any) => t) as string[]
                const uniqueTitles = Array.from(new Set(titles)).slice(0, 5)
                setHistory(uniqueTitles)
            }
        }
        loadHistory()
    }, [])

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && title.trim()) {
            e.preventDefault()
            setLoading(true)

            const { error } = await (supabase.from('tasks') as any).insert({
                title: title.trim(),
                bucket_type: 'daily',
                status: 'todo'
            })

            if (error) {
                console.error('Error adding task:', error)
            } else {
                setTitle('')
                router.refresh()
            }
            setLoading(false)
        }
    }

    const handleHistoryClick = (histTitle: string) => {
        setTitle(histTitle)
        setShowHistory(false)
        // Optionally focus back or submit immediately? Let's just fill for now.
    }

    const handleAddClick = async () => {
        if (!title.trim()) return
        setLoading(true)
        const { error } = await (supabase.from('tasks') as any).insert({
            title: title.trim(),
            bucket_type: 'daily',
            status: 'todo'
        })
        if (error) {
            console.error('Error adding task:', error)
        } else {
            setTitle('')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="w-full p-4 bg-background border-b sticky top-0 z-10 flex gap-2">
            <div className="relative flex-1 flex gap-2">
                <Input
                    placeholder={t('addTask') + "..."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="text-lg py-6"
                />
                <Button
                    onClick={handleAddClick}
                    disabled={loading || !title.trim()}
                    className="h-[52px] w-[52px]"
                    size="icon"
                >
                    <Plus className="w-6 h-6" />
                </Button>
            </div>

            <Popover open={showHistory} onOpenChange={setShowHistory}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-[52px] w-[52px]" title={t('quickHistory')}>
                        <Clock className="w-5 h-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2 px-2">{t('quickHistory')}</div>
                    {history.length === 0 && <div className="text-xs text-muted-foreground px-2">No history</div>}
                    <div className="flex flex-col gap-1">
                        {history.map((h, i) => (
                            <Button key={i} variant="ghost" className="justify-start h-auto py-2 text-left font-normal truncate" onClick={() => handleHistoryClick(h)}>
                                {h}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
