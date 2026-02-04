'use client'

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
import { FocusMode } from '@/components/focus-mode'
import { ReflectionView } from '@/components/reflection-view'
import { CalendarView } from '@/components/calendar-view'
import { AnalyticsView } from '@/components/analytics-view'
import { useTranslation } from '@/lib/i18n'
import { Database } from '@/types/supabase'
import { useState } from 'react'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    unit?: string | null
    started_at?: string | null
    elapsed_time?: number | null
    actual_time?: number | null
    gap_score?: number | null
    completed_at?: string | null
    context_id?: string | null
}
type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']

interface HomeClientProps {
    tasks: Task[]
    contexts: Context[]
    categories: Category[]
    masters: Master[]
}

export function HomeClient({ tasks, contexts, categories, masters }: HomeClientProps) {
    const { t } = useTranslation()
    const [showFocusMode, setShowFocusMode] = useState(false)

    // Find active task (in progress and has started_at)
    const activeTask = tasks.find(t => t.started_at && t.status === 'in_progress')

    // Filter tasks
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
                    <DetailedTaskModal />
                    <LogoutButton />
                    <Link href="/settings">
                        <Button variant="ghost" size="icon">
                            <Settings className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </header>

            {showFocusMode && activeTask && (
                <FocusMode task={activeTask} onMinimize={() => setShowFocusMode(false)} />
            )}

            <Tabs defaultValue="list" className="flex-1 flex flex-col">
                <div className="px-4 py-2 border-b bg-muted/10">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="list">{t('list')}</TabsTrigger>
                        <TabsTrigger value="folder">{t('folder')}</TabsTrigger>
                        <TabsTrigger value="chart">{t('timeline')}</TabsTrigger>
                        <TabsTrigger value="reflect">振り返り</TabsTrigger>
                        <TabsTrigger value="report">レポート</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="flex-1 pb-20">
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
        </main>
    )
}
