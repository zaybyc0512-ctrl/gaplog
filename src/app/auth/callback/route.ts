// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server' 
// ※もしcreateClientの場所が違う場合は適宜合わせてください（前回のAntigravityの構成に従います）
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // ログイン後に移動するページ（指定がなければトップページへ）
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // エラーがあった場合はログイン画面に戻す
  return NextResponse.redirect(`${origin}/login?error=Could not login with Google`)
}