'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function InscriptionPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('parent')
  const [message, setMessage] = useState('')
  const [classeId, setClasseId] = useState<string | null>(null)
  const [classeNom, setClasseNom] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const classeSlug = params.get('classe')
    if (classeSlug) {
      supabase
        .from('classes')
        .select('id, nom')
        .eq('slug', classeSlug)
        .single()
        .then(({ data }) => {
          if (data) {
            setClasseId(data.id)
            setClasseNom(data.nom)
          }
        })
    }
  }, [])

  const handleInscription = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom, role, classe_id: classeId } }
    })
    if (error) {
      setMessage('Erreur : ' + error.message)
      return
    }
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, type: 'inscription', nom })
    })
    router.push('/attente')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#2d4a3e'}}>
      <div className="flex flex-col items-center pt-12 pb-8">
        <img src="/logo.jpg.jpg" className="w-28 h-28 rounded-full mb-4 border-4 border-yellow-600" alt="logo" />
        <h1 className="text-white text-3xl font-serif">Madrassa Argenteuil</h1>
        <p className="text-yellow-400 text-xs tracking-widest mt-1">INSCRIPTION</p>
        {classeNom && (
          <p className="text-white text-sm mt-2 bg-green-700 px-4 py-1 rounded-full">
            Classe : {classeNom}
          </p>
        )}
      </div>
      <div className="flex-1 bg-gray-50 rounded-t-3xl p-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setRole('parent')}
            className={`flex-1 py-3 rounded-full text-sm font-bold ${role === 'parent' ? 'text-white' : 'border border-gray-300 text-gray-600'}`}
            style={role === 'parent' ? {backgroundColor: '#4a9b8e'} : {}}
          >
            Parent
          </button>
          <button
            onClick={() => setRole('moualima')}
            className={`flex-1 py-3 rounded-full text-sm font-bold ${role === 'moualima' ? 'text-white' : 'border border-gray-300 text-gray-600'}`}
            style={role === 'moualima' ? {backgroundColor: '#4a9b8e'} : {}}
          >
            Moualima
          </button>
        </div>
        <label className="text-xs font-bold text-gray-700 tracking-widest">NOM COMPLET</label>
        <input
          type="text"
          placeholder="Votre nom"
          className="w-full border-b border-gray-300 py-3 mb-6 bg-transparent outline-none"
          onChange={e => setNom(e.target.value)}
        />
        <label className="text-xs font-bold text-gray-700 tracking-widest">ADRESSE EMAIL</label>
        <input
          type="email"
          placeholder="votre@email.fr"
          className="w-full border-b border-gray-300 py-3 mb-6 bg-transparent outline-none"
          onChange={e => setEmail(e.target.value)}
        />
        <label className="text-xs font-bold text-gray-700 tracking-widest">MOT DE PASSE</label>
        <input
          type="password"
          className="w-full border-b border-gray-300 py-3 mb-8 bg-transparent outline-none"
          onChange={e => setPassword(e.target.value)}
        />
        <button
          onClick={handleInscription}
          className="w-full py-4 rounded-full text-white font-bold"
          style={{backgroundColor: '#4a9b8e'}}
        >
          S'INSCRIRE
        </button>
        {message && <p className="text-red-500 mt-4 text-center">{message}</p>}
      </div>
    </div>
  )
}
