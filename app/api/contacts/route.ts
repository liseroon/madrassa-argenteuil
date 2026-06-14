import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Prefer Bearer token (explicit, always fresh after getUser()+getSession())
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (token) {
    const anon = createClient(url, anonKey)
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) return user
  }

  // Fallback: session cookies (set by createBrowserClient)
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMap: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) cookieMap[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: { get: (name) => cookieMap[name], set: () => {}, remove: () => {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ contacts: [] }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

    const admin = createClient(url, serviceKey)
    const { data: me } = await admin.from('users').select('role').eq('id', user.id).single()

    let query = admin.from('users').select('id, nom, role').neq('id', user.id).order('nom', { ascending: true })
    if (me?.role !== 'admin') query = query.eq('role', 'admin')

    const { data, error } = await query
    if (error) {
      console.error('[GET /api/contacts]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ contacts: data ?? [] })
  } catch (e) {
    console.error('[GET /api/contacts] uncaught:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
