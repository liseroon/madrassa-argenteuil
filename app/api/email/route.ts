import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const to = typeof body?.to === 'string' ? body.to.trim().toLowerCase() : ''
    const type = typeof body?.type === 'string' ? body.type : ''
    const nom = typeof body?.nom === 'string' ? body.nom.slice(0, 100) : ''

    if (!to || !type || !nom) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })
    }
    if (type !== 'inscription' && type !== 'validation') {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // --- Securite : l'adresse doit correspondre a un utilisateur reel en base.
    //     (empeche d'envoyer des emails a des adresses arbitraires)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error('[POST /api/email] env manquante')
      return NextResponse.json({ error: 'Server config' }, { status: 500 })
    }
    const admin = createClient(url, serviceKey)

    const { data: user, error: userErr } = await admin
      .from('users')
      .select('email')
      .ilike('email', to)
      .maybeSingle()

    if (userErr) {
      console.error('[POST /api/email] lookup error:', userErr)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Destinataire non autorise' }, { status: 403 })
    }

    // --- Contenu ---
    let subject = ''
    let html = ''

    if (type === 'inscription') {
      subject = 'Inscription recue - Madrassa Argenteuil'
      html = `<div style="font-family: Arial, sans-serif;">
        <h2 style="color: #1a3a5c;">Madrassa Argenteuil</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre demande d'inscription a bien ete recue.</p>
        <p>L'administrateur va valider votre compte sous peu.</p>
        <p style="color: #888;">L'equipe Madrassa Argenteuil</p>
      </div>`
    } else {
      subject = 'Compte valide - Madrassa Argenteuil'
      html = `<div style="font-family: Arial, sans-serif;">
        <h2 style="color: #1a3a5c;">Madrassa Argenteuil</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre compte a ete <strong style="color: green;">valide</strong>.</p>
        <p>Vous pouvez maintenant vous connecter sur le portail.</p>
        <p style="color: #888;">L'equipe Madrassa Argenteuil</p>
      </div>`
    }

    // --- Envoi ---
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Madrassa Argenteuil <noreply@intrascool.fr>',
      to: user.email,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[POST /api/email] uncaught:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
