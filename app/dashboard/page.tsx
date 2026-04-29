'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function DashboardAdmin() {
  const [users, setUsers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nomClasse, setNomClasse] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (user.email !== 'liseroon3@gmail.com') { router.push('/login'); return }
    fetchUsers()
    fetchClasses()
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').eq('statut', 'en_attente')
    setUsers(data || [])
    setLoading(false)
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('created_at', { ascending: false })
    setClasses(data || [])
  }

  const creerClasse = async () => {
    if (!nomClasse.trim()) return
    const slug = nomClasse.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    await supabase.from('classes').insert({ nom: nomClasse.trim(), slug })
    setNomClasse('')
    fetchClasses()
  }

  const copierLien = (slug: string) => {
    navigator.clipboard.writeText(`https://intrascool.fr/inscription?classe=${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const validerUser = async (id: string, email: string, nom: string) => {
    await supabase.from('users').update({ statut: 'valide' }).eq('id', id)
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, type: 'validation', nom })
    })
    fetchUsers()
  }

  const refuserUser = async (id: string) => {
    await supabase.from('users').update({ statut: 'refuse' }).eq('id', id)
    fetchUsers()
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#f5f5f5'}}>
      <div className="p-6" style={{backgroundColor: '#2d4a3e'}}>
        <div className="flex items-center gap-4">
          <img src="/logo.jpg.jpg" className="w-12 h-12 rounded-full border-2" />
          <div>
            <h1 className="text-white text-xl font-bold">Dashboard Admin</h1>
            <p className="text-yellow-400 text-xs">Madrassa Argenteuil</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow">
            <p className="text-2xl font-bold" style={{color: '#2d4a3e'}}>{classes.length}</p>
            <p className="text-xs text-gray-500">Classes</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow">
            <p className="text-2xl font-bold" style={{color: '#2d4a3e'}}>{users.length}</p>
            <p className="text-xs text-gray-500">En attente</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-6 shadow">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Créer une classe</h2>
          <div className="flex gap-2">
            <input
              value={nomClasse}
              onChange={e => setNomClasse(e.target.value)}
              placeholder="Ex: Coran-Niveau1"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={creerClasse}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold"
              style={{backgroundColor: '#2d4a3e'}}
            >
              Créer
            </button>
          </div>
        </div>

        {classes.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow">
            <h2 className="text-lg font-bold text-gray-700 mb-3">Liens d'inscription par classe</h2>
            <p className="text-xs text-gray-400 mb-4">Partagez ces liens aux parents pour s'inscrire à la bonne classe.</p>
            {classes.map(classe => (
              <div key={classe.id} className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-bold text-sm text-gray-700">{classe.nom}</p>
                  <p className="text-xs text-blue-500">intrascool.fr/inscription?classe={classe.slug}</p>
                </div>
                <button
                  onClick={() => copierLien(classe.slug)}
                  className="px-3 py-1 rounded-lg text-white text-xs font-bold"
                  style={{backgroundColor: copied === classe.slug ? '#4a9b8e' : '#2d4a3e'}}
                >
                  {copied === classe.slug ? '✅ Copié' : 'Copier'}
                </button>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Inscriptions en attente ({users.length})
        </h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">Aucune inscription en attente</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-4 mb-4 shadow">
              <p className="font-bold text-gray-800">{user.nom}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <p className="text-xs text-gray-400 mb-4 capitalize">Rôle : {user.role}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => validerUser(user.id, user.email, user.nom)}
                  className="flex-1 py-2 rounded-full text-white text-sm font-bold"
                  style={{backgroundColor: '#4a9b8e'}}
                >
                  ✅ Valider
                </button>
                <button
                  onClick={() => refuserUser(user.id)}
                  className="flex-1 py-2 rounded-full text-white text-sm font-bold"
                  style={{backgroundColor: '#e74c3c'}}
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
