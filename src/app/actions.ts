'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeTask(taskId: string, actualTime: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tasks')
        .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            actual_time: actualTime
        })
        .eq('id', taskId)

    if (error) {
        throw new Error('Failed to complete task')
    }

    revalidatePath('/')
}

export async function moveTask(taskId: string, categoryId: string) {
    const supabase = await createClient()

    // We update category_id. 
    // Optimization: If the master's category is ALREADY this category, we could set category_id to null?
    // But simplest is just set it.

    const { error } = await supabase
        .from('tasks')
        .update({ category_id: categoryId })
        .eq('id', taskId)

    if (error) throw new Error('Failed to move task')

    revalidatePath('/')
}
