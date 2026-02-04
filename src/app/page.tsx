import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  // Fetch all necessary data for the HomeClient (tasks + hierarchy for folder view)
  const [tasksRes, ctxRes, catRes, mstRes] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('contexts').select('*').order('created_at'),
    supabase.from('categories').select('*').order('created_at'),
    supabase.from('task_masters').select('*').order('created_at')
  ])

  const tasks = tasksRes.data || []
  const contexts = ctxRes.data || []
  const categories = catRes.data || []
  const masters = mstRes.data || []

  return (
    <HomeClient
      tasks={tasks}
      contexts={contexts}
      categories={categories}
      masters={masters}
    />
  )
}