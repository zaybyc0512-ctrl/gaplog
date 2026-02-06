'use client'

import { useMemo, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row']

interface BlockedTime {
    id: string
    title: string
    start: string
    end: string
}

interface ScheduleViewProps {
    tasks: Task[]
    wakeTime?: string | null
    sleepTime?: string | null
    blocks?: BlockedTime[] | null
    onTaskClick?: (task: Task) => void
}

const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return -1
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
}

const minutesToTime = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function ScheduleView({ tasks, wakeTime = "07:00", sleepTime = "23:00", blocks = [], onTaskClick }: ScheduleViewProps) {
    const simulation = useMemo(() => {
        const wake = timeToMinutes(wakeTime || "07:00")
        const sleep = timeToMinutes(sleepTime || "23:00")

        let startOfDay = wake
        let endOfDay = sleep
        if (endOfDay < startOfDay) endOfDay += 1440 // Cross midnight

        // Prepare Blocks
        const sortedBlocks = (blocks || []).map(b => {
            let s = timeToMinutes(b.start)
            let e = timeToMinutes(b.end)
            if (e < s) e += 1440
            return { ...b, s, e }
        }).sort((a, b) => a.s - b.s)

        // Actually, we can just render blocks from `sortedBlocks` directly.
        // We only need to compute TASK placements.

        // Simulation State
        let currentCursor = startOfDay
        const placements: { type: 'task' | 'block', data: any, start: number, end: number, isOverflow: boolean }[] = []

        // Place Tasks (Split Logic)
        tasks.forEach(task => {
            let remaining = task.estimated_time || 30 // Default 30 min
            if (remaining <= 0) return

            let attempts = 0
            while (remaining > 0 && attempts < 50) { // Safety break
                attempts++

                // 1. Find Distance to Next Obstacle
                // Next block that starts AFTER currentCursor
                const nextBlock = sortedBlocks.find(b => b.s > currentCursor)

                // If we are INSIDE a block right now, jump out
                const insideBlock = sortedBlocks.find(b => currentCursor >= b.s && currentCursor < b.e)
                if (insideBlock) {
                    currentCursor = insideBlock.e
                    continue
                }

                // Distance to next block start
                const distToBlock = nextBlock ? (nextBlock.s - currentCursor) : Infinity

                // Distance to sleep
                const distToSleep = endOfDay - currentCursor

                // Available slot duration
                // If distToSleep < 0, we are already past sleep, handled by overflow check essentially,
                // but let's allow placing in overflow area if needed?
                // User requirement: "Overflow if past sleep". 
                // Let's assume infinite availability after sleep, but mark as overflow.

                let available = Infinity
                if (nextBlock) {
                    available = Math.min(available, distToBlock)
                }

                // If available space is 0 (should correspond to insideBlock check, but safety)
                if (available <= 0) {
                    // Should act like insideBlock
                    if (nextBlock) currentCursor = nextBlock.e
                    continue
                }

                // 2. Consume time
                const consume = Math.min(remaining, available)

                // 3. Push Segment
                placements.push({
                    type: 'task',
                    data: task,
                    start: currentCursor,
                    end: currentCursor + consume,
                    isOverflow: (currentCursor + consume) > endOfDay
                })

                currentCursor += consume
                remaining -= consume
            }
        })

        return {
            startOfDay,
            endOfDay,
            totalDuration: endOfDay - startOfDay,
            placements,
            sortedBlocks
        }

    }, [wakeTime, sleepTime, blocks, tasks])

    const { startOfDay, endOfDay, totalDuration, placements, sortedBlocks } = simulation

    // Rendering Helpers
    const getTopPct = (min: number) => {
        return ((min - startOfDay) / totalDuration) * 100
    }
    const getHeightPct = (duration: number) => {
        return (duration / totalDuration) * 100
    }

    // Time Axis
    const hours = []
    for (let h = Math.ceil(startOfDay / 60); h <= Math.floor(endOfDay / 60); h++) {
        hours.push(h * 60)
    }

    return (
        <div className="relative w-full h-[1200px] min-h-[1200px] bg-background border rounded-md overflow-hidden flex text-xs">
            {/* Time Axis */}
            <div className="w-12 bg-muted/30 border-r flex flex-col relative shrink-0 py-12">
                {hours.map(min => (
                    <div
                        key={min}
                        className="absolute w-full text-center border-t border-muted-foreground/20 text-muted-foreground -translate-y-1/2 pt-1"
                        style={{ top: `${getTopPct(min)}%` }}
                    >
                        {min % 1440 / 60}:00
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white dark:bg-zinc-950 py-12">
                {/* Guidelines */}
                {hours.map(min => (
                    <div
                        key={min}
                        className="absolute w-full border-t border-dashed border-muted/50 -translate-y-1/2"
                        style={{ top: `${getTopPct(min)}%` }}
                    />
                ))}

                {/* Fixed Blocks */}
                {sortedBlocks.map(block => (
                    <div
                        key={block.id}
                        className="absolute w-full bg-muted/80 border-l-4 border-muted-foreground px-2 py-1 overflow-hidden"
                        style={{
                            top: `${getTopPct(block.s)}%`,
                            height: `${getHeightPct(block.e - block.s)}%`,
                            zIndex: 20 // Higher than tasks
                        }}
                    >
                        <span className="font-semibold text-muted-foreground block truncate">{block.title}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                            {minutesToTime(block.s)} - {minutesToTime(block.e)}
                        </span>
                    </div>
                ))}

                {/* Tasks */}
                {placements.map((p, i) => (
                    <div
                        key={`${p.data.id}-${i}`}
                        onClick={() => onTaskClick?.(p.data)}
                        className={`
                            absolute w-[90%] left-[5%] rounded border shadow-sm px-2 py-1 cursor-pointer hover:brightness-95 transition-all overflow-hidden
                            ${p.isOverflow ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-primary/10 border-primary/30 text-primary-foreground dark:text-foreground'}
                        `}
                        style={{
                            top: `${getTopPct(p.start)}%`,
                            height: `${getHeightPct(p.end - p.start)}%`,
                            zIndex: 10 + i // tasks start at 10
                        }}
                    >
                        <div className="font-medium truncate leading-tight text-foreground">{p.data.title}</div>
                        <div className="flex justify-between items-center text-[10px] opacity-80 text-foreground">
                            <span>{p.data.estimated_time || 0}m</span>
                            <span>{minutesToTime(p.start)} - {minutesToTime(p.end)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
