import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Direct messages for the signed-in user. The messages table is RLS-restricted
// and parents cannot read rows where they are only the recipient, so admin
// messages never reached them when queried from the browser. Like /api/contacts,
// we verify the caller's JWT and run the query server-side with the service-role
// key, strictly scoped to conversations the caller participates in.

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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const user = await getCaller(request)
  if (!user) {
    return NextResponse.json({ messages: [] }, { status: 401 })
  }

  const otherId = new URL(request.url).searchParams.get('with')
  if (!otherId) {
    return NextResponse.json({ messages: [] }, { status: 400 })
  }

  const admin = serviceClient()
  const { data, error } = await admin
    .from('messages')
    .select('*, expediteur:expediteur_id(nom), destinataire:destinataire_id(nom)')
    .or(`and(expediteur_id.eq.${user.id},destinataire_id.eq.${otherId}),and(expediteur_id.eq.${otherId},destinataire_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const user = await getCaller(request)
  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const contenu = typeof body?.contenu === 'string' ? body.contenu.trim() : ''
  const destinataireId = typeof body?.destinataire_id === 'string' ? body.destinataire_id : ''
  if (!contenu || !destinataireId) {
    return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
  }

  const admin = serviceClient()
  // The sender is always the verified caller; the client cannot spoof it.
  const { error } = await admin.from('messages').insert({
    contenu,
    expediteur_id: user.id,
    destinataire_id: destinataireId,
    lu: false,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
