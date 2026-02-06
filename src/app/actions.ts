'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeTask(taskId: string, actualTime: number) {
    // ★修正: クライアント自体を any にキャストして型チェックを無効化
    const supabase = (await createClient()) as any

    const { error } = await supabase
        .from('tasks')
        .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            actual_time: actualTime
        })
        .eq('id', taskId)

    if (error) {
        console.error('Task completion error:', error)
        throw new Error('Failed to complete task')
    }

    revalidatePath('/')
}

export async function moveTask(taskId: string, categoryId: string) {
    // ★修正: ここも any にキャスト
    const supabase = (await createClient()) as any

    const { error } = await supabase
        .from('tasks')
        .update({ category_id: categoryId })
        .eq('id', taskId)

    if (error) throw new Error('Failed to move task')

    revalidatePath('/')
}
