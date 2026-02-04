export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            contexts: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    color: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string
                    name: string
                    color?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    color?: string | null
                    created_at?: string
                }
            }
            categories: {
                Row: {
                    id: string
                    context_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    context_id: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    context_id?: string
                    name?: string
                    created_at?: string
                }
            }
            task_masters: {
                Row: {
                    id: string
                    category_id: string
                    name: string
                    default_unit: string
                    default_unit_time: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    category_id: string
                    name: string
                    default_unit: string
                    default_unit_time?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    category_id?: string
                    name?: string
                    default_unit?: string
                    default_unit_time?: number | null
                    created_at?: string
                }
            }
            tasks: {
                Row: {
                    id: string
                    user_id: string
                    master_id: string | null
                    title: string
                    status: 'todo' | 'in_progress' | 'done'
                    bucket_type: string // Simplified to string to avoid mismatches
                    deadline_at: string | null
                    estimated_time: number | null
                    difficulty_level: number | null
                    completed_at: string | null
                    deleted_at: string | null
                    is_draft: boolean | null
                    amount: number | null
                    category_id: string | null
                    actual_time: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string
                    master_id?: string | null
                    title: string
                    status?: 'todo' | 'in_progress' | 'done'
                    bucket_type?: string
                    deadline_at?: string | null
                    estimated_time?: number | null
                    difficulty_level?: number | null
                    completed_at?: string | null
                    deleted_at?: string | null
                    is_draft?: boolean | null
                    amount?: number | null
                    actual_time?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    master_id?: string | null
                    title?: string
                    status?: 'todo' | 'in_progress' | 'done'
                    bucket_type?: string
                    deadline_at?: string | null
                    estimated_time?: number | null
                    difficulty_level?: number | null
                    completed_at?: string | null
                    deleted_at?: string | null
                    is_draft?: boolean | null
                    amount?: number | null
                    actual_time?: number | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
