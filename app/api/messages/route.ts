import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getCaller(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) return null
  return user
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ')
    throw new Error(`Missing env vars: ${missing}`)
  }
  return createClient(url, key)
}

export async function GET(request: Request) {
  try {
    const user = await getCaller(request)
    if (!user) return NextResponse.json({ messages: [] }, { status: 401 })

    const otherId = new URL(request.url).searchParams.get('with')
    if (!otherId) return NextResponse.json({ messages: [] }, { status: 400 })

    const admin = serviceClient()
    const { data, error } = await admin
      .from('messages')
      .select('id, contenu, expediteur_id, destinataire_id, created_at, lu')
      .or(`and(expediteur_id.eq.${user.id},destinataire_id.eq.${otherId}),and(expediteur_id.eq.${otherId},destinataire_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[GET /api/messages] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ messages: data ?? [] })
  } catch (e) {
    console.error('[GET /api/messages] uncaught:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCaller(request)
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const contenu = typeof body?.contenu === 'string' ? body.contenu.trim() : ''
    const destinataireId = typeof body?.destinataire_id === 'string' ? body.destinataire_id : ''
    if (!contenu || !destinataireId) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
    }

    const admin = serviceClient()
    const { error } = await admin.from('messages').insert({
      contenu,
      expediteur_id: user.id,
      destinataire_id: destinataireId,
      lu: false,
    })
    if (error) {
      console.error('[POST /api/messages] insert error:', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/messages] uncaught:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
