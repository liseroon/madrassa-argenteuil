'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

interface Classe {
  id: string
  nom: string
  slug: string
}

export default function InscriptionPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('parent')
  const [message, setMessage] = useState('')
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeId, setClasseId] = useState<string | null>(null)
  const [classeNom, setClasseNom] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // The classes table is not readable anonymously (RLS), so fetch the public
    // list via the server route that uses the service-role key.
    fetch('/api/classes')
      .then(res => res.json())
      .then((data: { classes?: Classe[] }) => {
        const list = data.classes ?? []
        setClasses(list)
        const classeSlug = new URLSearchParams(window.location.search).get('classe')
        if (classeSlug) {
          const match = list.find(c => c.slug === classeSlug)
          if (match) {
            setClasseId(match.id)
            setClasseNom(match.nom)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleInscription = async () => {
    if (role === 'parent' && !classeId) {
      setMessage('Veuillez sélectionner une classe.')
      return
    }
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
        <Image src="/logo.jpg.jpg" alt="Logo Madrassa Argenteuil" width={112} height={112} className="w-28 h-28 rounded-full mb-4 border-4 border-yellow-600" />
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
        {role === 'parent' && !classeNom && (
          <>
            <label className="text-xs font-bold text-gray-700 tracking-widest">CLASSE</label>
            <select
              value={classeId ?? ''}
              onChange={e => setClasseId(e.target.value || null)}
              className="w-full border-b border-gray-300 py-3 mb-6 bg-transparent outline-none text-gray-700"
            >
              <option value="">Sélectionnez une classe</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </>
        )}
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
          S&apos;INSCRIRE
        </button>
        {message && <p className="text-red-500 mt-4 text-center">{message}</p>}
      </div>
    </div>
  )
}
