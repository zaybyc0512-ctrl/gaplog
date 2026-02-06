import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Create response to potentially modify cookies
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 2. Create Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // 3. Refresh session (this updates cookies if needed)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 4. Route Protection Logic
    // If no user and asking for protected route -> Login
    // Protected: / (home), /settings
    // Public: /login, /about? 
    // The middleware matches everything, so we filter by path.

    const path = request.nextUrl.pathname

    // Public paths
    if (path === '/login') {
        // If user IS logged in, redirect to home
        if (user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        // Allow access to login
        return response
    }

    // Protected paths (everything else basically, assuming strict app)
    // For now, let's explicitly protect `/` and `/settings`.
    // Or simpler: If NOT /login and NO user -> Redirect to /login
    if (!user && !path.startsWith('/login') && !path.startsWith('/auth')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return response
}
