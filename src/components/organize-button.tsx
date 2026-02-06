'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { allocateTasks } from '@/lib/logic/scheduler' // Warning: This logic uses node modules (fs?) No, it uses supabase-js. But it's in lib/logic.
// Wait, allocateTasks uses logic that might be server-side? 
// No, scheduler.ts uses `createClient` from `@/lib/supabase/client`. It should be client-safe if it doesn't use node-only libs.
// `date-fns` is fine.

interface OrganizeButtonProps {
    tasks: any[] // Task type
    userId: string
}

export function OrganizeButton({ tasks, userId }: OrganizeButtonProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    // Check for unallocated tasks (Status != done AND scheduled_date is null)
    const hasUnscheduled = tasks.some(t => t.status !== 'done' && !t.scheduled_date)

    const handleOrganize = async () => {
        setIsLoading(true)
        try {
            // We need to call the logic. 
            // Ideally this logic should be in a Server Action to ensure consistency and speed, 
            // but `scheduler.ts` was written using `createClient` (client/browser). 
            // If it runs on client, it does many selects/upserts. 
            // Let's wrap it in a client function here.

            await allocateTasks(userId)

            alert('スケジュールを整理しました')
            router.refresh()
        } catch (e) {
            console.error(e)
            alert('スケジュールの整理に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant={hasUnscheduled ? "default" : "secondary"}
            size="sm"
            onClick={handleOrganize}
            disabled={isLoading}
            className={`
                gap-1 transition-all px-2
                ${hasUnscheduled ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' : 'text-muted-foreground'}
            `}
            title="自動スケジューリング実行"
        >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">反映</span>
        </Button>
    )
}
