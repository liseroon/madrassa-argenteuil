'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function DashboardAdmin() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('statut', 'en_attente')
    setUsers(data || [])
    setLoading(false)
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
          <img src="/logo.jpg.jpg" className="w-12 h-12 rounded-full border-2 border-yellow-600" alt="logo" />
          <div>
            <h1 className="text-white text-xl font-bold">Dashboard Admin</h1>
            <p className="text-yellow-400 text-xs">Madrassa Argenteuil</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Inscriptions en attente ({users.length})
        </h2>
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">Aucune inscription en attente</p>
        ) : (
          users.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
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
                  className="flex-1 py-2 rounded-full text-white text-sm font-bold bg-red-400"
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