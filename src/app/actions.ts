'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

export async function completeTask(taskId: string, actualTime: number) {
    const supabase = (await createClient()) as SupabaseClient<Database>

    const { error } = await supabase
        .from('tasks')
        .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            actual_time: actualTime
        } as any) // ★修正: as any を追加して型チェックをバイパス
        .eq('id', taskId)

    if (error) {
        console.error('Task completion error:', error)
        throw new Error('Failed to complete task')
    }

    revalidatePath('/')
}

export async function moveTask(taskId: string, categoryId: string) {
    const supabase = (await createClient()) as SupabaseClient<Database>

    const { error } = await supabase
        .from('tasks')
        .update({ category_id: categoryId } as any) // ★修正: as any を追加

    if (error) throw new Error('Failed to move task')

    revalidatePath('/')
}
