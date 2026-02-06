import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all necessary data for the HomeClient (tasks + hierarchy for folder view)
  const todayStr = new Date().toISOString().split('T')[0]

  const [tasksRes, ctxRes, catRes, mstRes, capRes] = await Promise.all([
    supabase.from('tasks').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('contexts').select('*').order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('task_masters').select('*').order('name'),
    (supabase.from('daily_capacities').select('*').eq('user_id', user?.id).eq('date', todayStr).maybeSingle() as any)
  ])

  const tasks = tasksRes.data || []
  const contexts = ctxRes.data || []
  const categories = catRes.data || []
  const masters = mstRes.data || []
  const dailyCapacity = capRes.data?.available_minutes || 0

  return (
    <HomeClient
      tasks={tasks}
      contexts={contexts}
      categories={categories}
      masters={masters}
      dailyCapacity={capRes.data}
      userId={user?.id || ''}
    />
  )
}