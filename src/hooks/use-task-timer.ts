import { useState, useEffect, useRef } from 'react'

interface TimerTask {
    started_at?: string | null
    elapsed_time?: number | null
}

export function useTaskTimer(task: TimerTask) {
    const [currentTime, setCurrentTime] = useState<number>(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Calculate total seconds based on initial props
    const calculateSeconds = (t: TimerTask) => {
        const elapsed = t.elapsed_time || 0
        if (t.started_at) {
            const startStr = t.started_at
            const startDate = new Date(startStr).getTime()
            const now = new Date().getTime()
            const diffSeconds = Math.floor((now - startDate) / 1000)
            return elapsed + Math.max(0, diffSeconds)
        }
        return elapsed
    }

    // Initialize state
    useEffect(() => {
        setCurrentTime(calculateSeconds(task))
    }, [task.started_at, task.elapsed_time])

    // Timer Effect
    useEffect(() => {
        if (task.started_at) {
            // Start interval
            intervalRef.current = setInterval(() => {
                setCurrentTime(prev => prev + 1)
                // Optional: Recalculate periodically to sync with system clock and avoid drift?
                // For now simple increment is fine, but resetting from prop on every render handles 'refresh' cases mostly.
                // Actually, let's recalculate from now() every tick to be robust against throttling
                setCurrentTime(calculateSeconds(task))
            }, 1000)
        } else {
            // Stop interval and sync one last time
            if (intervalRef.current) clearInterval(intervalRef.current)
            setCurrentTime(calculateSeconds(task))
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [task.started_at, task.elapsed_time]) // Re-run if status changes

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return {
        seconds: currentTime,
        formattedTime: formatTime(currentTime),
        isRunning: !!task.started_at
    }
}
