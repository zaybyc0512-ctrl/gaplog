'use client'

import { MasterManager } from '@/components/master-manager'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Database } from '@/types/supabase'

type Context = Database['public']['Tables']['contexts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Master = Database['public']['Tables']['task_masters']['Row']

interface SettingsContentProps {
    contexts: Context[]
    categories: Category[]
    masters: Master[]
}

export function SettingsContent({ contexts, categories, masters }: SettingsContentProps) {
    const { t, language, setLanguage } = useTranslation()

    return (
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">{t('settings')}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('language')}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <Label>English / 日本語</Label>
                    <div className="flex items-center gap-2">
                        <span className={language === 'en' ? 'font-bold' : 'text-muted-foreground'}>EN</span>
                        <Switch
                            checked={language === 'ja'}
                            onCheckedChange={(c) => setLanguage(c ? 'ja' : 'en')}
                        />
                        <span className={language === 'ja' ? 'font-bold' : 'text-muted-foreground'}>JA</span>
                    </div>
                </CardContent>
            </Card>

            <MasterManager
                contexts={contexts}
                categories={categories}
                masters={masters}
            />
        </div>
    )
}
