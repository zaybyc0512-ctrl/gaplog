'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type Language = 'en' | 'ja'

type Dictionary = {
    [key: string]: string
}

const dictionaries: { [key in Language]: Dictionary } = {
    en: {
        addTask: "Add Task",
        detailed: "Detailed",
        list: "List",
        folder: "Folder",
        timeline: "Timeline",
        settings: "Settings",
        logout: "Logout",
        context: "Context",
        category: "Category",
        master: "Task Master",
        amount: "Amount",
        estimatedTime: "Estimated Time",
        actualTime: "Actual Time",
        difficulty: "Predicted Difficulty",
        draftMode: "Draft Mode",
        draftDesc: "Keep in log but don't allocate time yet",
        add: "Add",
        update: "Update",
        cancel: "Cancel",
        delete: "Delete",
        complete: "Complete",
        approx: "approx",
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        language: "Language",
        noTasks: "No active tasks",
        confirmDelete: "Are you sure you want to delete this task?",
        inbox: "Inbox",
        folders: "Folders",
        quickHistory: "Quick History",
        clear: "Clear",
        clearSelection: "Clear Selection",
        signInWithGoogle: "Sign in with Google",
        signInDesc: "Login or Create Account",
        email: "Email",
        password: "Password",
        signIn: "Sign In",
        signUp: "Sign Up",
        selectContext: "Select Context",
        selectCategory: "Select Category",
        selectMaster: "Select Task Master",
        predictedDiff: "Predicted Difficulty",
        dropToAdd: "Drop to add",
        noTasksInInbox: "No tasks in Inbox",
        deleteTask: "Delete"
    },
    ja: {
        addTask: "タスク追加",
        detailed: "詳細追加",
        list: "リスト",
        folder: "フォルダ",
        timeline: "タイムライン",
        settings: "設定",
        logout: "ログアウト",
        context: "コンテキスト",
        category: "カテゴリ",
        master: "タスクマスタ",
        amount: "量",
        estimatedTime: "予測時間",
        actualTime: "実績時間",
        difficulty: "予測難易度",
        draftMode: "ドラフトモード",
        draftDesc: "時間は確保せず、ログとして記録します",
        add: "追加",
        update: "更新",
        cancel: "キャンセル",
        delete: "削除",
        complete: "完了",
        approx: "約",
        easy: "易",
        normal: "普",
        hard: "難",
        language: "言語設定",
        noTasks: "タスクがありません",
        confirmDelete: "このタスクを削除してもよろしいですか？",
        inbox: "未整理 (Inbox)",
        folders: "フォルダ",
        quickHistory: "履歴から",
        clear: "クリア",
        clearSelection: "選択解除",
        signInWithGoogle: "Googleでログイン",
        signInDesc: "アカウントを作成またはログイン",
        email: "メールアドレス",
        password: "パスワード",
        signIn: "ログイン",
        signUp: "登録",
        selectContext: "コンテキストを選択",
        selectCategory: "カテゴリを選択",
        selectMaster: "マスタを選択",
        predictedDiff: "予測難易度",
        dropToAdd: "ドロップして追加",
        noTasksInInbox: "未整理のタスクはありません",
        deleteTask: "削除",
        unit: "単位",
        settingsTitle: "設定",
        manageContexts: "フォルダ管理",
        manageCategories: "カテゴリ管理",
        manageMasters: "タスクマスタ管理",
        name: "名前",
        actions: "操作",
        create: "作成",
        createNew: "新規作成...",
        edit: "編集",
        // Units

        page: "ページ",
        question: "問",
        set: "セット",
        min: "分",
        // New Keys
        inbox: "未整理",
        folders: "フォルダ",
        noTasksInbox: "未整理のタスクはありません",
        empty: "(空)",
        estShort: "予測", // Est:
        amtShort: "量", // Amt:
        endOfSchedule: "予定終了",
        approx: "約"
    }
}

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('ja') // Default to JA as requested

    useEffect(() => {
        const saved = localStorage.getItem('gaplog-lang') as Language
        if (saved && (saved === 'en' || saved === 'ja')) {
            setLanguage(saved)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('gaplog-lang', lang)
    }

    const t = (key: string) => {
        return dictionaries[language][key] || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useTranslation() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider')
    }
    return context
}
