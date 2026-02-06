'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from '@/lib/supabase/client'
import { Plus, X, CalendarClock, Save, Loader2 } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface CapacitySettingsModalProps {
    trigger?: React.ReactNode
    initialData?: any // 後方互換のために残すが基本使わない
}

interface BlockedTime {
    id: string
    title: string
    start: string
    end: string
}

const WEEKDAYS = [
    { id: 1, label: '月' },
    { id: 2, label: '火' },
    { id: 3, label: '水' },
    { id: 4, label: '木' },
    { id: 5, label: '金' },
    { id: 6, label: '土' },
    { id: 0, label: '日' },
]

export function CapacitySettingsModal({ trigger }: CapacitySettingsModalProps) {
    const supabase = createClient()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isFetching, setIsFetching] = useState(false)

    // Mode State
    const [mode, setMode] = useState<'auto' | 'manual'>('auto')

    // Manual State
    const [manualHours, setManualHours] = useState(0)
    const [manualMinutes, setManualMinutes] = useState(0)

    // Form State
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
    const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5])

    // Default values
    const [wakeTime, setWakeTime] = useState("07:00")
    const [sleepTime, setSleepTime] = useState("23:00")
    const [blockedList, setBlockedList] = useState<BlockedTime[]>([
        { id: '1', title: '仕事/学校', start: '09:00', end: '18:00' },
        { id: '2', title: '昼食', start: '12:00', end: '13:00' }
    ])

    const [previewMinutes, setPreviewMinutes] = useState(0)

    // Client-side Fetching Logic
    const fetchCapacity = useCallback(async (dateStr: string) => {
        setIsFetching(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: rawData, error } = await supabase
                .from('daily_capacities')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', dateStr)
                .maybeSingle()

            const data = rawData as any

            if (error) {
                console.error('Fetch error:', error)
                return
            }

            if (data) {
                // Data found for this specific date
                if (data.wake_time) setWakeTime(data.wake_time)
                if (data.sleep_time) setSleepTime(data.sleep_time)

                if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
                    setBlockedList(data.blocks.map((b: any) => ({ ...b, id: b.id || crypto.randomUUID() })))
                    setMode('auto')
                } else if (data.available_minutes !== null) {
                    // If no blocks but we have minutes, assume manual or simple auto
                    // check if calc matches
                    setManualHours(Math.floor(data.available_minutes / 60))
                    setManualMinutes(data.available_minutes % 60)
                    if (!data.blocks) setMode('manual') // Or keep auto if user prefers
                }
            } else {
                // No data found, reset to defaults? Or keep current state?
                // For now, we keep current state to act as "template"
            }
        } finally {
            setIsFetching(false)
        }
    }, [supabase])

    // Fetch on Open or Date Change
    useEffect(() => {
        if (isOpen) {
            fetchCapacity(startDate)
        }
    }, [isOpen, startDate, fetchCapacity])


    // --- Robust Calculation Logic (No Date Objects) ---
    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return -1
        const [h, m] = timeStr.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) return -1
        return h * 60 + m
    }

    const calculateDailyMinutes = useCallback(() => {
        const wake = timeToMinutes(wakeTime)
        const sleep = timeToMinutes(sleepTime)

        if (wake === -1 || sleep === -1) return 0

        // Handle cross-midnight (e.g. wake 07:00, sleep 01:00)
        let sleepAdjusted = sleep
        if (sleep < wake) sleepAdjusted += 1440 // +24 hours

        let totalMinutes = sleepAdjusted - wake

        // Create intervals
        const intervals: { start: number, end: number }[] = []
        blockedList.forEach(block => {
            const start = timeToMinutes(block.start)
            const end = timeToMinutes(block.end)
            if (start === -1 || end === -1) return

            let endAdjusted = end
            if (end < start) endAdjusted += 1440 // +24 hours

            intervals.push({ start, end: endAdjusted })
        })

        // Sort by start time
        intervals.sort((a, b) => a.start - b.start)

        // Merge Overlapping Intervals
        const merged: { start: number, end: number }[] = []
        for (const curr of intervals) {
            if (merged.length === 0 || merged[merged.length - 1].end < curr.start) {
                merged.push(curr)
            } else {
                merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, curr.end)
            }
        }

        // Sum merged durations
        let blockedTotal = 0
        for (const m of merged) {
            blockedTotal += (m.end - m.start)
        }

        return Math.max(0, totalMinutes - blockedTotal)
    }, [wakeTime, sleepTime, blockedList])

    // Update Preview
    useEffect(() => {
        if (mode === 'auto') {
            setPreviewMinutes(calculateDailyMinutes())
        } else {
            setPreviewMinutes((Number(manualHours) || 0) * 60 + (Number(manualMinutes) || 0))
        }
    }, [calculateDailyMinutes, mode, manualHours, manualMinutes])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const daysToInsert = []

            let current = start
            while (current <= end) {
                if (selectedWeekdays.includes(current.getDay())) {
                    daysToInsert.push({
                        date: format(current, 'yyyy-MM-dd'), // Local date format
                        wake_time: mode === 'auto' ? wakeTime : null,
                        sleep_time: mode === 'auto' ? sleepTime : null,
                        available_minutes: previewMinutes,
                        blocks: mode === 'auto' ? blockedList : [],
                        user_id: (await supabase.auth.getUser()).data.user?.id
                    })
                }
                current = addDays(current, 1)
            }

            if (daysToInsert.length === 0) {
                alert("対象日がありません")
                setIsSaving(false)
                return
            }

            const { error } = await (supabase.from('daily_capacities') as any).upsert(daysToInsert, {
                onConflict: 'user_id, date'
            })

            if (error) throw error

            setIsOpen(false)
            alert("保存しました")
            router.refresh()
        } catch (e) {
            alert("エラーが発生しました: " + (e as any).message)
        } finally {
            setIsSaving(false)
        }
    }

    // Helpers
    const toggleWeekday = (day: number) => {
        setSelectedWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
    }
    const addBlock = () => setBlockedList([...blockedList, { id: crypto.randomUUID(), title: '', start: '', end: '' }])
    const removeBlock = (id: string) => setBlockedList(blockedList.filter(b => b.id !== id))
    const updateBlock = (id: string, field: keyof BlockedTime, value: string) => {
        setBlockedList(blockedList.map(b => b.id === id ? { ...b, [field]: value } : b))
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <CalendarClock className="w-4 h-4" />
                        時間設定
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        1日のキャパシティ設定
                        {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>開始日</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>終了日</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Weekdays */}
                    <div className="space-y-2">
                        <Label>適用する曜日</Label>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map(day => (
                                <div
                                    key={day.id}
                                    onClick={() => toggleWeekday(day.id)}
                                    className={`
                                        w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-sm font-medium transition-colors border
                                        ${selectedWeekdays.includes(day.id)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-muted-foreground hover:bg-muted'}
                                    `}
                                >
                                    {day.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-2"></div>

                    <Tabs value={mode} onValueChange={(v) => setMode(v as 'auto' | 'manual')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="auto">自動計算 (推奨)</TabsTrigger>
                            <TabsTrigger value="manual">手動入力</TabsTrigger>
                        </TabsList>

                        <TabsContent value="auto" className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>起床時間 (Start)</Label>
                                    <Input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>就寝時間 (End)</Label>
                                    <Input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>固定の予定 (ブロック時間)</Label>
                                    <Button variant="ghost" size="sm" onClick={addBlock} className="h-6 w-6 p-0 rounded-full">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {blockedList.map(block => (
                                    <div key={block.id} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="予定名"
                                            value={block.title}
                                            onChange={e => updateBlock(block.id, 'title', e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                        />
                                        <Input
                                            type="time"
                                            value={block.start}
                                            onChange={e => updateBlock(block.id, 'start', e.target.value)}
                                            className="w-24 h-8 text-sm"
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <Input
                                            type="time"
                                            value={block.end}
                                            onChange={e => updateBlock(block.id, 'end', e.target.value)}
                                            className="w-24 h-8 text-sm"
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => removeBlock(block.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="manual" className="space-y-4 pt-4">
                            <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center space-y-4">
                                <Label className="text-base text-muted-foreground">1日に使える時間を直接入力</Label>
                                <div className="flex items-end justify-center gap-2">
                                    <div className="text-center">
                                        <Input
                                            type="number" min={0} max={24} className="w-20 text-center text-lg"
                                            value={manualHours} onChange={e => setManualHours(Number(e.target.value))}
                                        />
                                        <span className="text-xs text-muted-foreground">時間</span>
                                    </div>
                                    <span className="font-bold text-xl pb-2">:</span>
                                    <div className="text-center">
                                        <Input
                                            type="number" min={0} max={59} className="w-20 text-center text-lg"
                                            value={manualMinutes} onChange={e => setManualMinutes(Number(e.target.value))}
                                        />
                                        <span className="text-xs text-muted-foreground">分</span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                        <span className="font-medium text-sm">設定される時間 ({mode === 'auto' ? '自動' : '手動'}):</span>
                        <div className="text-right">
                            <span className="text-2xl font-bold font-mono text-primary">{Math.floor(previewMinutes / 60)}</span>
                            <span className="text-sm text-muted-foreground mx-1">時間</span>
                            <span className="text-2xl font-bold font-mono text-primary">{previewMinutes % 60}</span>
                            <span className="text-sm text-muted-foreground mx-1">分</span>
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                        <Save className="w-4 h-4" />
                        {isSaving ? "保存中..." : "この設定で保存・適用"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
