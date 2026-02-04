import { createClient } from '@/lib/supabase/server'
import { SettingsContent } from '@/components/settings-content'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: contexts } = await supabase.from('contexts').select('*').order('created_at')
    const { data: categories } = await supabase.from('categories').select('*').order('created_at')
    const { data: masters } = await supabase.from('task_masters').select('*').order('created_at')

    return (
        <SettingsContent
            contexts={contexts || []}
            categories={categories || []}
            masters={masters || []}
        />
    )
}