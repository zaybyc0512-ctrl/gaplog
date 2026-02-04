'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']

type HierarchyProps = {
    contexts: Context[]
    categories: Category[]
    masters: Master[]
}

export function MasterManager({ contexts, categories, masters }: HierarchyProps) {
    const router = useRouter()
    const { t } = useTranslation()
    const [newContext, setNewContext] = useState('')
    // Simple state for expanded items or just list them all?
    // Let's list all for MVP.

    const [selectedContext, setSelectedContext] = useState<string | null>(null)
    const [selectCategory, setSelectedCategory] = useState<string | null>(null)

    // Forms
    const handleAddContext = async () => {
        if (!newContext) return
        await (supabase.from('contexts') as any).insert({ name: newContext })
        setNewContext('')
        router.refresh()
    }

    const handleAddCategory = async (contextId: string, name: string) => {
        if (!name) return
        await (supabase.from('categories') as any).insert({ context_id: contextId, name })
        router.refresh()
    }

    const handleAddMaster = async (categoryId: string, name: string, unit: string, time: number) => {
        if (!name) return
        await (supabase.from('task_masters') as any).insert({
            category_id: categoryId,
            name,
            default_unit: unit,
            default_unit_time: time
        })
        router.refresh()
    }

    return (
        <div className="space-y-6">
            {/* Add Context */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">1. {t('create')} {t('context')}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Input
                        placeholder={t('createNew')} // "e.g. School..."
                        value={newContext}
                        onChange={e => setNewContext(e.target.value)}
                    />
                    <Button onClick={handleAddContext}>{t('add')}</Button>
                </CardContent>
            </Card>

            {/* Hierarchy List */}
            <div className="space-y-4">
                {contexts.map(ctx => (
                    <ContextItem
                        key={ctx.id}
                        context={ctx}
                        categories={categories.filter(c => c.context_id === ctx.id)}
                        masters={masters}
                        onAddCategory={handleAddCategory}
                        onAddMaster={handleAddMaster}
                    />
                ))}
            </div>
        </div>
    )
}

function ContextItem({ context, categories, masters, onAddCategory, onAddMaster }: any) {
    const { t } = useTranslation() // Hook is better than prop drift
    const [newCat, setNewCat] = useState('')
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="border rounded-md p-3">
            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <h3 className="font-bold flex items-center gap-2">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {context.name}
                </h3>
            </div>

            {expanded && (
                <div className="pl-6 space-y-4">
                    {/* Add Category */}
                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder={t('createNew')}
                            value={newCat}
                            onChange={e => setNewCat(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Button size="sm" onClick={() => { onAddCategory(context.id, newCat); setNewCat('') }}>{t('add')}</Button>
                    </div>

                    {categories.map((cat: any) => (
                        <CategoryItem
                            key={cat.id}
                            category={cat}
                            masters={masters.filter((m: any) => m.category_id === cat.id)}
                            onAddMaster={onAddMaster}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function CategoryItem({ category, masters, onAddMaster }: any) {
    const { t } = useTranslation()
    const [newMaster, setNewMaster] = useState('')
    const [newUnit, setNewUnit] = useState('page')
    const [newTime, setNewTime] = useState(10)

    return (
        <div className="border-l-2 pl-3 py-2">
            <h4 className="font-semibold text-sm mb-2">{category.name}</h4>

            {/* Masters List */}
            <div className="space-y-1 mb-2">
                {masters.map((m: any) => (
                    <div key={m.id} className="text-sm text-muted-foreground flex justify-between bg-muted/30 p-1 px-2 rounded">
                        <span>{m.name}</span>
                        <span className="text-xs border px-1 rounded bg-background">{m.default_unit} / {m.default_unit_time}m</span>
                    </div>
                ))}
            </div>

            {/* Add Master Msg */}
            <div className="flex gap-2 items-center flex-wrap">
                <Input
                    placeholder={t('createNew')}
                    value={newMaster}
                    onChange={e => setNewMaster(e.target.value)}
                    className="h-7 text-xs w-40"
                />
                <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="page">{t('page')}</SelectItem>
                        <SelectItem value="question">{t('question')}</SelectItem>
                        <SelectItem value="set">{t('set')}</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    type="number"
                    value={newTime}
                    onChange={e => setNewTime(Number(e.target.value))}
                    className="h-7 w-16 text-xs"
                    placeholder="min"
                />
                <Button size="sm" className="h-7 px-2" onClick={() => { onAddMaster(category.id, newMaster, newUnit, newTime); setNewMaster('') }}>
                    <Plus size={14} />
                </Button>
            </div>
        </div>
    )
}
