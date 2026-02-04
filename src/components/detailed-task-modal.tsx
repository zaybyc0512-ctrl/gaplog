'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { calculateEstimatedTime } from '@/lib/logic/estimator'
import { Plus, Loader2, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/lib/i18n'

// Types
type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']
type Task = Database['public']['Tables']['tasks']['Row'] & { unit?: string | null, context_id?: string | null }

interface DetailedTaskModalProps {
    task?: Task
    trigger?: React.ReactNode
}

export function DetailedTaskModal({ task, trigger }: DetailedTaskModalProps) {
    const router = useRouter()
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)

    // Data State
    const [contexts, setContexts] = useState<Context[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [masters, setMasters] = useState<Master[]>([])
    const [loadingValues, setLoadingValues] = useState(false)

    // Form State
    const [selectedContextId, setSelectedContextId] = useState<string>('')
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [selectedMasterId, setSelectedMasterId] = useState<string>('')

    const [title, setTitle] = useState(task?.title || '')
    const [amount, setAmount] = useState<number>(task?.amount || 1)
    const [unit, setUnit] = useState(task?.unit || '')

    const [difficulty, setDifficulty] = useState<number>(task?.difficulty_level || 3)
    const [isDraft, setIsDraft] = useState(task?.is_draft || false)

    const [estimatedTime, setEstimatedTime] = useState<number>(task?.estimated_time || 0)
    const [isCalculating, setIsCalculating] = useState(false)

    // Inline Create State
    const [isCreatingContext, setIsCreatingContext] = useState(false)
    const [newContextName, setNewContextName] = useState('')

    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')

    const [isCreatingMaster, setIsCreatingMaster] = useState(false)
    const [newMasterName, setNewMasterName] = useState('')
    const [newMasterUnit, setNewMasterUnit] = useState('page')
    const [newMasterTime, setNewMasterTime] = useState(10)

    const [isCreatingUnit, setIsCreatingUnit] = useState(false)

    // Chips State
    const [recentContexts, setRecentContexts] = useState<Context[]>([])
    const [recentMasters, setRecentMasters] = useState<Master[]>([])
    const [historyUnits, setHistoryUnits] = useState<string[]>([])

    // Load Data
    useEffect(() => {
        if (open) {
            setLoadingValues(true)
            Promise.all([
                (supabase.from('contexts').select('*') as any),
                (supabase.from('categories').select('*') as any),
                (supabase.from('task_masters').select('*') as any)
            ]).then(([ctxRes, catRes, mstRes]) => {
                if (ctxRes.data) setContexts(ctxRes.data)
                const cats: Category[] = catRes.data || []
                setCategories(cats)
                const msts: Master[] = mstRes.data || []
                setMasters(msts)

                if (task && task.master_id) {
                    const m = msts.find(x => x.id === task.master_id)
                    if (m) {
                        setSelectedMasterId(m.id)
                        const c = categories.find(x => x.id === m.category_id)
                        if (c) {
                            setSelectedCategoryId(c.id)
                            setSelectedContextId(c.context_id)
                        }
                    }
                }
                setLoadingValues(false)
            })

            // Load Chips History
            const loadHistory = async () => {
                const { data: tasks } = await (supabase
                    .from('tasks')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50) as any)

                if (tasks) {
                    // Units
                    const units = tasks.map((t: any) => t.unit).filter((u: any) => u) as string[]
                    setHistoryUnits(Array.from(new Set(units)).slice(0, 5))

                    // Contexts & Masters if we have data loaded
                    // We will just do a simple mapping here if data is already loaded in state. 
                    // But state loading is async.
                    // Let's rely on a separate effect or just check IDs here if possible.
                    // For now, let's keep it simple: we need master/context IDs from history.
                }
            }
            loadHistory()
        }
    }, [open, task])

    // Update Chips when contexts/masters update
    useEffect(() => {
        if (!contexts.length || !masters.length) return

        const updateChips = async () => {
            const { data: tasks } = await (supabase
                .from('tasks')
                .select('master_id, category_id') // We need to join to get context, but simplified: assume consistent hierarchy
                .order('created_at', { ascending: false })
                .limit(20) as any)

            if (tasks) {
                const usedMasterIds = new Set<string>()
                const usedContextIds = new Set<string>()

                tasks.forEach((t: any) => {
                    if (t.master_id) usedMasterIds.add(t.master_id)

                    // Try to find context from master
                    const m = masters.find(ma => ma.id === t.master_id)
                    if (m) {
                        const c = categories.find(ca => ca.id === m.category_id)
                        if (c) usedContextIds.add(c.context_id)
                    }
                })

                setRecentMasters(masters.filter(m => usedMasterIds.has(m.id)).slice(0, 5))
                setRecentContexts(contexts.filter(c => usedContextIds.has(c.id)).slice(0, 5))
            }
        }
        updateChips()
    }, [open, contexts, masters, categories])


    const handleCreateContext = async () => {
        if (!newContextName) return
        const { data, error } = await (supabase.from('contexts') as any).insert({ name: newContextName }).select()
        if (data && data[0]) {
            setContexts([...contexts, data[0]])
            setSelectedContextId(data[0].id)
            setIsCreatingContext(false)
            setNewContextName('')
        }
    }

    const handleCreateCategory = async () => {
        if (!newCategoryName) return
        const payload = {
            name: newCategoryName,
            context_id: selectedContextId || null
        }
        const { data, error } = await (supabase.from('categories') as any).insert(payload).select()
        if (data && data[0]) {
            setCategories([...categories, data[0]])
            setSelectedCategoryId(data[0].id)
            setIsCreatingCategory(false)
            setNewCategoryName('')
        }
    }

    const handleCreateMaster = async () => {
        if (!newMasterName) return
        const payload = {
            category_id: selectedCategoryId || null,
            name: newMasterName,
            default_unit: 'ページ', // Default fixed
            default_unit_time: 10   // Default fixed
        }
        const { data, error } = await (supabase.from('task_masters') as any).insert(payload).select()
        if (data && data[0]) {
            setMasters([...masters, data[0]])
            setSelectedMasterId(data[0].id)
            setTitle(data[0].name) // Name only
            // setUnit(data[0].default_unit) // Optional: keep default unit if needed? User wants decoupled title logic.
            // Let's set unit but NOT title
            setUnit(data[0].default_unit)

            setIsCreatingMaster(false)
            setNewMasterName('')
        }
    }

    const handleContextChange = (val: string) => {
        setSelectedContextId(val)
        setSelectedCategoryId('')
        setSelectedMasterId('')
    }
    const handleCategoryChange = (val: string) => {
        setSelectedCategoryId(val)
        setSelectedMasterId('')
    }
    const handleMasterChange = (val: string) => {
        setSelectedMasterId(val)
        const m = masters.find(m => m.id === val)
        if (m) {
            setTitle(m.name) // Name only
            setUnit(m.default_unit || '')
        }
    }

    // Auto-Estimate
    useEffect(() => {
        if (!selectedMasterId) return
        const m = masters.find(m => m.id === selectedMasterId)
        if (!m) return

        if (!task) setTitle(m.name) // Name only

        const performCalc = async () => {
            setIsCalculating(true)
            const { data: logs } = await (supabase
                .from('tasks')
                .select('*')
                .eq('master_id', m.id)
                .not('actual_time', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10) as any)

            const workLogs: any[] = (logs || []).map((l: any) => ({
                id: l.id,
                master_id: l.master_id,
                estimated_time: l.estimated_time,
                actual_time: l.actual_time,
                difficulty_level: l.difficulty_level,
                amount: l.amount,
                created_at: l.created_at
            }))

            const time = calculateEstimatedTime(m, amount, difficulty, workLogs)
            setEstimatedTime(time)
            setIsCalculating(false)
        }
        performCalc()
    }, [selectedMasterId, amount, difficulty, task])

    // ... handleSubmit ...
    const handleSubmit = async () => {
        const payload = {
            title,
            master_id: selectedMasterId || null,
            category_id: selectedCategoryId || null,
            context_id: selectedContextId || null,
            bucket_type: 'daily',
            status: task?.status || 'todo',
            amount,
            unit,
            difficulty_level: difficulty,
            estimated_time: estimatedTime,
            is_draft: isDraft
        }

        let error;
        if (task) {
            const res = await (supabase.from('tasks') as any).update(payload).eq('id', task.id)
            error = res.error
        } else {
            const res = await (supabase.from('tasks') as any).insert(payload)
            error = res.error
        }
        if (!error) {
            setOpen(false)
            router.refresh()
            if (!task) {
                // Reset form
                setTitle('')
                setAmount(1)
                setUnit('')
                setDifficulty(3)
                setIsDraft(false)
                setSelectedContextId('')
                setSelectedCategoryId('')
                setSelectedMasterId('')
                setEstimatedTime(0)
            }
        }
    }

    // ... Sorting Logic ...
    const sortedCategories = [...categories].sort((a, b) => {
        // Recommended (matching context) first
        const aMatch = a.context_id === selectedContextId ? 1 : 0
        const bMatch = b.context_id === selectedContextId ? 1 : 0
        if (aMatch !== bMatch) return bMatch - aMatch
        return a.name.localeCompare(b.name)
    })

    const sortedMasters = [...masters].sort((a, b) => {
        // Recommended (matching category) first
        const aMatch = a.category_id === selectedCategoryId ? 1 : 0
        const bMatch = b.category_id === selectedCategoryId ? 1 : 0
        if (aMatch !== bMatch) return bMatch - aMatch
        return a.name.localeCompare(b.name)
    })

    // ... History ...
    const [history, setHistory] = useState<Task[]>([])
    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        if (open) {
            const loadHistory = async () => {
                const { data } = await (supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(10) as any)
                if (data) setHistory(data)
            }
            loadHistory()
        }
    }, [open])

    const handleHistoryClick = (histTask: Task) => {
        setTitle(histTask.title)
        setAmount(histTask.amount || 1)
        setUnit(histTask.unit || '')
        setDifficulty(histTask.difficulty_level || 3)
        setEstimatedTime(histTask.estimated_time || 0)

        // Set IDs (Chip-like behavior: auto-set all)
        if (histTask.context_id) setSelectedContextId(histTask.context_id)
        if (histTask.category_id) setSelectedCategoryId(histTask.category_id)
        if (histTask.master_id) setSelectedMasterId(histTask.master_id)

        // Fallback for legacy history if needed
        if (!histTask.context_id && histTask.master_id) {
            const m = masters.find(x => x.id === histTask.master_id)
            if (m) {
                setSelectedMasterId(m.id)
                const c = categories.find(x => x.id === m.category_id)
                if (c) {
                    setSelectedCategoryId(c.id)
                    setSelectedContextId(c.context_id)
                }
            }
        }
        setShowHistory(false)
    }

    // Chips Helper
    const renderChips = (items: { label: string, value: string }[], onClick: (val: string) => void) => (
        <div className="flex gap-2 mb-1 overflow-x-auto pb-1 no-scrollbar min-h-[28px]">
            {items.map((item, i) => (
                <Badge key={i} variant="outline" className="cursor-pointer hover:bg-muted whitespace-nowrap px-2 py-0.5 text-xs bg-muted/20" onClick={() => onClick(item.value)}>
                    {item.label}
                </Badge>
            ))}
        </div>
    )

    // Unit Options - include current unit if valid
    const unitOptions = Array.from(new Set([...historyUnits, 'ページ', '問', 'セット', '分', unit].filter(Boolean)))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" size="sm" className="gap-1 h-9" onClick={(e) => e.stopPropagation()}>
                        <Plus className="w-4 h-4" />
                        詳細
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>{task ? t('update') : t('detailed')}</DialogTitle>
                    <Popover open={showHistory} onOpenChange={setShowHistory}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" title="履歴から入力">
                                <Clock className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-0">
                            <div className="text-sm font-medium text-muted-foreground p-2 border-b">入力履歴</div>
                            <div className="max-h-60 overflow-y-auto">
                                {history.length === 0 && <div className="text-xs text-muted-foreground p-2">履歴なし</div>}
                                {history.map((h) => (
                                    <Button key={h.id} variant="ghost" className="w-full justify-start h-auto py-2 px-3 text-left font-normal truncate flex flex-col items-start gap-0.5" onClick={() => handleHistoryClick(h)}>
                                        <span className="truncate w-full">{h.title}</span>
                                        <span className="text-[10px] text-muted-foreground">{h.estimated_time}分 / 難度: {h.difficulty_level}</span>
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </DialogHeader>
                <DialogDescription className="sr-only">Make changes to the task here.</DialogDescription>

                <div className="grid gap-4 py-4">
                    {/* 1. Context */}
                    <div className="grid gap-1">
                        <div className="flex justify-between items-center h-6">
                            <Label>{t('context')}</Label>
                            {recentContexts.length > 0 && renderChips(recentContexts.map(c => ({ label: c.name, value: c.id })), handleContextChange)}
                        </div>
                        {!isCreatingContext ? (
                            <div className="flex gap-2">
                                <Select value={selectedContextId || '_unset_'} onValueChange={handleContextChange}>
                                    <SelectTrigger><SelectValue placeholder="文脈を選択..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_unset_">(未設定)</SelectItem>
                                        {contexts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" onClick={() => setIsCreatingContext(true)} title={t('createNew')}><Plus className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input placeholder={t('createNew')} value={newContextName} onChange={e => setNewContextName(e.target.value)} />
                                <Button size="sm" onClick={handleCreateContext}>{t('add')}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setIsCreatingContext(false)}>×</Button>
                            </div>
                        )}
                    </div>

                    {/* 2. Category */}
                    <div className="grid gap-1">
                        <Label>{t('category')}</Label>
                        {!isCreatingCategory ? (
                            <div className="flex gap-2">
                                <Select value={selectedCategoryId || '_unset_'} onValueChange={handleCategoryChange}>
                                    <SelectTrigger><SelectValue placeholder="カテゴリを選択..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_unset_">(未設定)</SelectItem>
                                        {sortedCategories.map(c => (
                                            <SelectItem key={c.id} value={c.id} className={c.context_id !== selectedContextId && selectedContextId ? "text-muted-foreground text-xs pl-6" : ""}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Removed disabled prop */}
                                <Button variant="outline" size="icon" onClick={() => setIsCreatingCategory(true)} title={t('createNew')}><Plus className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input placeholder={t('createNew')} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <Button size="sm" onClick={handleCreateCategory}>{t('add')}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setIsCreatingCategory(false)}>×</Button>
                            </div>
                        )}
                    </div>

                    {/* 3. Master */}
                    <div className="grid gap-1">
                        <div className="flex justify-between items-center h-6">
                            <Label>{t('master')}</Label>
                            {recentMasters.length > 0 && renderChips(recentMasters.map(m => ({ label: m.name, value: m.id })), (val) => {
                                // Chip Click Handler: Auto-set all (Reverse Lookup)
                                const m = masters.find(x => x.id === val)
                                if (m) {
                                    handleMasterChange(val) // sets master
                                    const c = categories.find(x => x.id === m.category_id)
                                    if (c) {
                                        setSelectedCategoryId(c.id)
                                        setSelectedContextId(c.context_id)
                                    }
                                }
                            })}
                        </div>
                        {!isCreatingMaster ? (
                            <div className="flex gap-2">
                                <Select value={selectedMasterId || '_unset_'} onValueChange={handleMasterChange}>
                                    <SelectTrigger><SelectValue placeholder="マスタを選択..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_unset_">(未設定)</SelectItem>
                                        {sortedMasters.map(m => (
                                            <SelectItem key={m.id} value={m.id} className={m.category_id !== selectedCategoryId && selectedCategoryId ? "text-muted-foreground text-xs pl-6" : ""}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Removed disabled prop */}
                                <Button variant="outline" size="icon" onClick={() => setIsCreatingMaster(true)} title={t('createNew')}><Plus className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 border p-2 rounded bg-muted/20">
                                <Label>名称</Label>
                                <Input placeholder={t('name')} value={newMasterName} onChange={e => setNewMasterName(e.target.value)} />
                                {/* Removed Unit/Time inputs */}
                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingMaster(false)}>{t('cancel')}</Button>
                                    <Button size="sm" onClick={handleCreateMaster}>{t('add')}</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. Amount & Unit */}
                    <div className="grid gap-2">
                        <div className="flex justify-between items-center h-6">
                            <Label>{t('amount')} / {t('unit')}</Label>
                            {historyUnits.length > 0 && renderChips(historyUnits.map(u => ({ label: u, value: u })), (val) => setUnit(val))}
                        </div>

                        <div className="flex gap-2">
                            <Input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-20" />

                            <div className="flex-1">
                                {!isCreatingUnit ? (
                                    <div className="flex gap-2">
                                        <Select value={unit} onValueChange={setUnit}>
                                            <SelectTrigger><SelectValue placeholder={t('unit')} /></SelectTrigger>
                                            <SelectContent>
                                                {unitOptions.map((u, i) => <SelectItem key={i} value={u}>{u}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {unit && <Button variant="ghost" size="icon" onClick={() => setUnit('')} title={t('clear')}>×</Button>}
                                        <Button variant="outline" size="icon" onClick={() => setIsCreatingUnit(true)} title={t('createNew')}><Plus className="w-4 h-4" /></Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input placeholder="単位名" value={unit} onChange={e => setUnit(e.target.value)} />
                                        <Button size="sm" onClick={() => setIsCreatingUnit(false)}>{t('add')}</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. Estimated Time */}
                    <div className="grid gap-2">
                        <Label>{t('estimatedTime')}</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={estimatedTime}
                                onChange={e => setEstimatedTime(Number(e.target.value))}
                                className="h-10 font-semibold"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('approx')}</span>
                        </div>
                    </div>

                    {/* 6. Difficulty */}
                    <div className="grid gap-3 pt-2">
                        <Label>{t('predictedDiff')}: {difficulty}</Label>
                        <Slider min={1} max={5} step={1} value={[difficulty]} onValueChange={(v) => setDifficulty(v[0])} />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>{t('easy')}</span>
                            <span>{t('normal')}</span>
                            <span>{t('hard')}</span>
                        </div>
                    </div>

                    {/* 7. Draft */}
                    <div className="flex items-center justify-between space-x-2 pt-2">
                        <Label htmlFor="draft-mode" className="flex flex-col space-y-1">
                            <span>{t('draftMode')}</span>
                            <span className="font-normal text-xs text-muted-foreground">{t('draftDesc')}</span>
                        </Label>
                        <Switch id="draft-mode" checked={isDraft} onCheckedChange={setIsDraft} />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSubmit}>{task ? t('update') : t('add')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
