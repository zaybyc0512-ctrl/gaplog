import { NextResponse, type NextRequest } from 'next/server'

// デバッグモード: 認証ロジックを一時的に完全に切り離す
export async function middleware(request: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
