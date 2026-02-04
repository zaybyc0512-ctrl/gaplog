'use client'

import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    completed_at?: string | null
    actual_time?: number | null
}

interface CalendarViewProps {
    tasks: Task[]
}

export function CalendarView({ tasks }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const dateFormat = "d"
    const rows = []
    let days = []
    let day = startDate
    let formattedDate = ""

    const weekDays = ['日', '月', '火', '水', '木', '金', '土']

    // Get tasks for selected date
    const selectedTasks = selectedDate
        ? tasks.filter(task => task.completed_at && isSameDay(new Date(task.completed_at), selectedDate))
        : []

    const totalTimeForSelectedDate = selectedTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0)

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    // Fix loop logic to use date-fns addDays to ensure correctness
    // Re-implementing generation loop properly
    const calendarGrid = []
    let currentDayIter = startDate

    while (currentDayIter <= endDate) {
        const weekRow = []
        for (let i = 0; i < 7; i++) {
            // ... logic same as above
            const cloneDay = new Date(currentDayIter)
            const dayTasks = tasks.filter(task => task.completed_at && isSameDay(new Date(task.completed_at), cloneDay))
            const totalTime = dayTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0)

            let bgClass = "hover:bg-muted"
            let textClass = "text-foreground"

            if (!isSameMonth(cloneDay, monthStart)) {
                textClass = "text-muted-foreground/30"
            }

            if (totalTime > 0) {
                textClass = "text-primary-foreground"
                if (totalTime > 120) bgClass = "bg-primary" // > 2h
                else if (totalTime > 60) bgClass = "bg-primary/70" // > 1h
                else bgClass = "bg-primary/40"
            }

            const isSelected = selectedDate && isSameDay(cloneDay, selectedDate)

            weekRow.push(
                <div
                    key={cloneDay.toISOString()}
                    onClick={() => setSelectedDate(cloneDay)}
                    className={`
                        h-9 w-9 flex items-center justify-center rounded-full cursor-pointer text-xs font-medium transition-all
                        ${bgClass} ${textClass}
                        ${isSelected ? "ring-2 ring-offset-2 ring-primary z-10" : ""}
                        ${isToday(cloneDay) && !isSelected && totalTime === 0 ? "border border-primary text-primary" : ""}
                    `}
                >
                    {format(cloneDay, 'd')}
                </div>
            )
            currentDayIter = new Date(currentDayIter.setDate(currentDayIter.getDate() + 1))
        }
        calendarGrid.push(<div key={currentDayIter.toISOString()} className="grid grid-cols-7 gap-1 justify-items-center mb-1">{weekRow}</div>)
    }

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="font-bold text-lg">
                        {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                            {day}
                        </div>
                    ))}
                </div>

                <div>
                    {calendarGrid}
                </div>
            </Card>

            {selectedDate && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="text-sm font-semibold text-muted-foreground pl-1">
                        {format(selectedDate, 'M月d日 (E)', { locale: ja })} の活動
                    </h3>

                    {selectedTasks.length > 0 ? (
                        <Card className="p-3 bg-muted/20">
                            <div className="mb-2 text-right">
                                <span className="text-xs text-muted-foreground">合計学習時間: </span>
                                <span className="text-lg font-bold font-mono text-primary">{Math.floor(totalTimeForSelectedDate / 60)}h {totalTimeForSelectedDate % 60}m</span>
                            </div>
                            <div className="space-y-2">
                                {selectedTasks.map(task => (
                                    <div key={task.id} className="flex justify-between items-center text-sm border-b border-border/50 last:border-0 pb-1 last:pb-0">
                                        <span className="truncate max-w-[70%]">{task.title}</span>
                                        <span className="font-mono text-xs whitespace-nowrap">{task.actual_time}分</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        <div className="text-sm text-muted-foreground p-2 text-center border-2 border-dashed rounded-lg">
                            活動記録はありません
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
