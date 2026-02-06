'use client'

import { useTranslation } from '@/lib/i18n' // ★ここを追加
import { QuickInput } from '@/components/quick-input'
import { TaskList } from '@/components/task-list'
import { FolderTaskList } from '@/components/folder-task-list'
import { LogoutButton } from '@/components/logout-button'
import { TimelineView } from '@/components/timeline-view'
import { Button } from '@/components/ui/button'
import { Settings, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DetailedTaskModal } from '@/components/detailed-task-modal'
import { CapacitySettingsModal } from '@/components/capacity-settings-modal'
import { CarryOverDialog } from '@/components/carry-over-dialog'
import { FocusMode } from '@/components/focus-mode'
import { ReflectionView } from '@/components/reflection-view'
import { CalendarView } from '@/components/calendar-view'
import { AnalyticsView } from '@/components/analytics-view'
import { CapacityIndicator } from '@/components/capacity-indicator'
import { OrganizeButton } from '@/components/organize-button'
import { ScheduleStackView } from '@/components/schedule-stack-view'
import { ScheduleView } from '@/components/schedule-view'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    unit?: string | null
    started_at?: string | null
    elapsed_time?: number | null
    actual_time?: number | null
    gap_score?: number | null
    completed_at?: string | null
    context_id?: string | null
    // scheduled_date is part of Row now if SQL ran, but let's be safe
    scheduled_date?: string | null
}
type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']

interface HomeClientProps {
    tasks: Task[]
    contexts: Context[]
    categories: Category[]
    masters: Master[]
    dailyCapacity: any
}

export function HomeClient({ tasks, contexts, categories, masters, dailyCapacity, userId }: HomeClientProps & { userId: string }) {
    const { t } = useTranslation()
    const [showFocusMode, setShowFocusMode] = useState(false)
    const supabase = createClient()

    // Schedule State
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<'timeline' | 'stack'>('stack')
    const [currentDailyCapacity, setCurrentDailyCapacity] = useState(dailyCapacity)

    // Fetch capacity when date changes
    useEffect(() => {
        const fetchCapacity = async () => {
            if (isSameDay(selectedDate, new Date())) {
                setCurrentDailyCapacity(dailyCapacity) // Use prop for today (cached/server)
                return
            }

            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const { data } = await supabase
                .from('daily_capacities')
                .select('*')
                .eq('user_id', userId)
                .eq('date', dateStr)
                .maybeSingle()

            setCurrentDailyCapacity(data || { available_minutes: 0, blocks: [], wake_time: '07:00', sleep_time: '23:00' }) // Default if null
        }
        fetchCapacity()
    }, [selectedDate, dailyCapacity, userId, supabase])

    // Filter Tasks for Schedule
    const filteredTasks = tasks.filter(t => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const isToday = isSameDay(selectedDate, new Date())

        if (t.scheduled_date === dateStr) return true

        if (isToday) {
            // Inbox logic: Unscheduled AND Unfinished
            if (!t.scheduled_date && t.status !== 'done') return true
            // Done today logic: Show if completed today
            if (t.status === 'done' && t.completed_at?.startsWith(dateStr)) return true
        }

        return false
    })

    // Find active task (in progress and has started_at)
    const activeTask = tasks.find(t => t.started_at && t.status === 'in_progress')

    // Filter tasks for LIST view
    const activeTasks = tasks.filter(t => t.status !== 'done')
    const doneTasks = tasks.filter(t => t.status === 'done')

    return (
        <main className="min-h-screen bg-background relative max-w-md mx-auto border-x flex flex-col">
            <header className="flex justify-between items-center p-4 border-b">
                <h1 className="font-bold text-xl">GapLog</h1>
                <div className="flex gap-2 items-center">
                    {activeTask && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-primary animate-pulse text-primary-foreground gap-1"
                            onClick={() => setShowFocusMode(true)}
                        >
                            <Maximize2 className="w-4 h-4" />
                            Focus
                        </Button>
                    )}

                    <OrganizeButton tasks={activeTasks} userId={userId} />

                    <CapacitySettingsModal />
                    <CarryOverDialog tasks={activeTasks} userId={userId} />
                    <DetailedTaskModal />
                    <LogoutButton />
                    <Link href="/settings">
                        <Button variant="ghost" size="icon">
                            <Settings className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </header>

            {
                showFocusMode && activeTask && (
                    <FocusMode task={activeTask} onMinimize={() => setShowFocusMode(false)} />
                )
            }

            <Tabs defaultValue="list" className="flex-1 flex flex-col">
                <div className="px-4 py-2 border-b bg-muted/10 overflow-x-auto no-scrollbar">
                    <TabsList className="flex w-max min-w-full justify-start">
                        <TabsTrigger value="list" className="flex-1 min-w-[60px]">{t('list')}</TabsTrigger>
                        <TabsTrigger value="folder" className="flex-1 min-w-[60px]">{t('folder')}</TabsTrigger>
                        <TabsTrigger value="schedule" className="flex-1 min-w-[60px]">予定</TabsTrigger>
                        <TabsTrigger value="chart" className="flex-1 min-w-[60px]">{t('timeline')}</TabsTrigger>
                        <TabsTrigger value="reflect" className="flex-1 min-w-[60px]">振り返り</TabsTrigger>
                        <TabsTrigger value="report" className="flex-1 min-w-[60px]">レポート</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="flex-1 pb-20">
                    <div className="px-4 pt-4">
                        <CapacityIndicator tasks={activeTasks} capacityMinutes={dailyCapacity?.available_minutes || 0} />
                    </div>
                    <QuickInput />
                    <TaskList initialTasks={activeTasks} />
                </TabsContent>

                <TabsContent value="folder" className="flex-1 pb-20 p-2">
                    <FolderTaskList
                        tasks={activeTasks}
                        contexts={contexts}
                        categories={categories}
                        masters={masters}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="flex-1 p-0 h-full overflow-hidden flex flex-col">
                    {/* Schedule Header */}
                    <div className="p-4 border-b bg-background z-10 space-y-3">
                        {/* Date Navigation */}
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={() => {
                                const prev = new Date(selectedDate)
                                prev.setDate(prev.getDate() - 1)
                                setSelectedDate(prev)
                            }}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>

                            <div className="font-semibold">
                                {format(selectedDate, 'yyyy/MM/dd')} <span className="text-sm font-normal text-muted-foreground">({format(selectedDate, 'EEE', { locale: ja })})</span>
                            </div>

                            <Button variant="ghost" size="icon" onClick={() => {
                                const next = new Date(selectedDate)
                                next.setDate(next.getDate() + 1)
                                setSelectedDate(next)
                            }}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Mode Switch & Capacity Info */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                                <Button
                                    variant={viewMode === 'stack' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setViewMode('stack')}
                                >
                                    Stack
                                </Button>
                                <Button
                                    variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setViewMode('timeline')}
                                >
                                    Timeline
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Cap: {currentDailyCapacity?.available_minutes || 0} min
                            </div>
                        </div>
                    </div>

                    {/* View Area */}
                    <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                        {viewMode === 'timeline' ? (
                            <ScheduleView
                                tasks={filteredTasks}
                                wakeTime={currentDailyCapacity?.wake_time}
                                sleepTime={currentDailyCapacity?.sleep_time}
                                blocks={currentDailyCapacity?.blocks}
                            />
                        ) : (
                            <ScheduleStackView
                                tasks={filteredTasks}
                                dailyCapacityMinutes={currentDailyCapacity?.available_minutes || 0}
                            />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="chart" className="flex-1 p-4 h-full">
                    <TimelineView tasks={[...tasks].reverse()} />
                </TabsContent>

                <TabsContent value="reflect" className="flex-1 pb-20 p-4">
                    <ReflectionView tasks={doneTasks} />
                </TabsContent>

                <TabsContent value="report" className="flex-1 pb-20 p-4 space-y-6">
                    <div className="space-y-6">
                        <CalendarView tasks={doneTasks} />
                        <AnalyticsView tasks={doneTasks} contexts={contexts} />
                    </div>
                </TabsContent>
            </Tabs>
        </main >
    )
}