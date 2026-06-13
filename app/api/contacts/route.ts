import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Auth via browser session cookies (same-origin fetch sends them automatically).
// No Bearer token needed — the createBrowserClient keeps cookies fresh via
// autoRefreshToken, so we never get stuck with an expired JWT.
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMap: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) cookieMap[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) { return cookieMap[name] },
      set() {},
      remove() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[contacts] cookie auth user:', user?.id, 'error:', authError?.message)
  if (!user) {
    return NextResponse.json({ contacts: [] }, { status: 401 })
  }

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me, error: meError } = await admin.from('users').select('role').eq('id', user.id).single()
  console.log('[contacts] me:', me, 'meError:', meError?.message)

  let query = admin.from('users').select('id, nom, role').neq('id', user.id).order('nom', { ascending: true })
  if (me?.role !== 'admin') {
    console.log('[contacts] non-admin — filtering to admins only')
    query = query.eq('role', 'admin')
  }

  const { data, error } = await query
  console.log('[contacts] results count:', data?.length, 'error:', error?.message)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contacts: data ?? [] })
}
