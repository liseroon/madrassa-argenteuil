import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { to, type, nom } = await request.json()

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
  }

  if (type === 'validation') {
    subject = 'Compte valide - Madrassa Argenteuil'
    html = `<div style="font-family: Arial, sans-serif;">
      <h2 style="color: #1a3a5c;">Madrassa Argenteuil</h2>
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre compte a ete <strong style="color: green;">valide</strong>.</p>
      <p>Vous pouvez maintenant vous connecter sur le portail.</p>
      <p style="color: #888;">L'equipe Madrassa Argenteuil</p>
    </div>`
  }

  try {
    await resend.emails.send({
      from: 'Madrassa Argenteuil <noreply@intrascool.fr>',
      to,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
}
