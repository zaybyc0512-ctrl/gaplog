'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database } from '@/types/supabase'
import { startOfWeek, subDays, format, isSameDay, eachDayOfInterval, endOfDay, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"

type Task = Database['public']['Tables']['tasks']['Row'] & {
    completed_at?: string | null
    actual_time?: number | null
    context_id?: string | null
}
type Context = Database['public']['Tables']['contexts']['Row']

interface AnalyticsViewProps {
    tasks: Task[]
    contexts: Context[]
}

export function AnalyticsView({ tasks, contexts }: AnalyticsViewProps) {
    // 1. Weekly Data (Last 7 Days)
    const today = new Date()
    const last7Days = eachDayOfInterval({
        start: subDays(today, 6),
        end: today
    })

    const weeklyData = last7Days.map(day => {
        const dayTasks = tasks.filter(t => t.completed_at && isSameDay(new Date(t.completed_at), day))
        const totalTime = dayTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0)
        return {
            name: format(day, 'M/d', { locale: ja }),
            time: totalTime,
            fullDate: format(day, 'yyyy年M月d日 (E)', { locale: ja })
        }
    })

    // 2. Context Distribution (All time or Monthly?)
    // Let's do "All completed tasks" passed in (which is usually all history)
    const contextDataMap: Record<string, number> = {}

    tasks.forEach(task => {
        if (!task.actual_time) return
        const ctxName = task.context_id
            ? contexts.find(c => c.id === task.context_id)?.name || '未分類'
            : 'Inbox'

        contextDataMap[ctxName] = (contextDataMap[ctxName] || 0) + task.actual_time
    })

    const pieData = Object.entries(contextDataMap).map(([name, value]) => ({
        name,
        value
    })).sort((a, b) => b.value - a.value)

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

    return (
        <div className="space-y-6">

            {/* Weekly Bar Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">週間学習時間 (分)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <XAxis
                                    dataKey="name"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    itemStyle={{ color: '#000' }}
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-background border rounded p-2 shadow-lg text-xs">
                                                    <p className="font-semibold mb-1">{label}</p>
                                                    <p>合計: {payload[0].value} 分</p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar
                                    dataKey="time"
                                    fill="hsl(var(--primary))"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Context Pie Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">学習内容（科目別）</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="bg-background border rounded p-2 shadow-lg text-xs">
                                                        <p className="font-semibold mb-1">{data.name}</p>
                                                        <p>{data.value} 分</p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                                データなし
                            </div>
                        )}
                        {pieData.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold">{tasks.reduce((acc, t) => acc + (t.actual_time || 0), 0)}</span>
                                <span className="text-xs text-muted-foreground">合計 (分)</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
