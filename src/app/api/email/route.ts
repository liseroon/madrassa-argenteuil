import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { to, type, nom } = await request.json()

  let subject = ''
  let html = ''

  if (type === 'inscription') {
    subject = 'Inscription reçue - Madrassa Argenteuil'
    html = `<div style="font-family: Arial, sans-serif;">
      <h2 style="color: #1a3a5c;">Madrassa Argenteuil</h2>
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre demande d'inscription a bien été reçue.</p>
      <p>L'administrateur va valider votre compte sous peu.</p>
      <p style="color: #888;">L'équipe Madrassa Argenteuil</p>
    </div>`
  }

  if (type === 'validation') {
    subject = 'Compte validé - Madrassa Argenteuil'
    html = `<div style="font-family: Arial, sans-serif;">
      <h2 style="color: #1a3a5c;">Madrassa Argenteuil</h2>
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Votre compte a été <strong style="color: green;">validé</strong>.</p>
      <p>Vous pouvez maintenant vous connecter sur le portail.</p>
      <p style="color: #888;">L'équipe Madrassa Argenteuil</p>
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