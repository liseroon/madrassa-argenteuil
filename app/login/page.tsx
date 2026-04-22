'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#2d4a3e'}}>
      <div className="flex flex-col items-center pt-12 pb-8">
        <img src="/logo.jpg.jpg" className="w-28 h-28 rounded-full mb-4 border-4 border-yellow-600" alt="logo" />
        <h1 className="text-white text-3xl font-serif">Madrassa Argenteuil</h1>
        <p className="text-yellow-400 text-xs tracking-widest mt-1">PORTAIL DE L'ÉTABLISSEMENT</p>
      </div>
      <div className="flex-1 bg-gray-50 rounded-t-3xl p-8">
        <p className="text-gray-500 mb-6">Connectez-vous à votre espace</p>
        <label className="text-xs font-bold text-gray-700 tracking-widest">ADRESSE EMAIL</label>
        <input
          type="email"
          placeholder="admin@ecole.fr"
          className="w-full border-b border-gray-300 py-3 mb-6 bg-transparent outline-none"
          onChange={e => setEmail(e.target.value)}
        />
        <label className="text-xs font-bold text-gray-700 tracking-widest">MOT DE PASSE</label>
        <input
          type="password"
          className="w-full border-b border-gray-300 py-3 mb-2 bg-transparent outline-none"
          onChange={e => setPassword(e.target.value)}
        />
        <p className="text-right text-sm text-gray-400 mb-8">Mot de passe oublié ?</p>
        <button
          onClick={handleLogin}
          className="w-full py-4 rounded-full text-white font-bold mb-6"
          style={{backgroundColor: '#4a9b8e'}}
        >
          SE CONNECTER
        </button>
        <p className="text-center text-gray-400 text-sm mb-4">première fois ?</p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/inscription')}
            className="flex-1 py-3 border border-gray-300 rounded-full text-sm text-gray-600"
          >
            🎓 Je suis Moualima
          </button>
          <button
            onClick={() => router.push('/inscription')}
            className="flex-1 py-3 border border-gray-300 rounded-full text-sm text-gray-600"
          >
            👨‍👩‍👧 Je suis Parent
          </button>
        </div>
        {message && <p className="text-red-500 mt-4 text-center">{message}</p>}
      </div>
    </div>
  )
}
