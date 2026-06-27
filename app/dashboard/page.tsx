'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Classe {
  id: string
  nom: string
  slug: string
  created_at?: string
}

interface UserRow {
  id: string
  nom: string
  email: string
  role: string
  statut: string
  classe_id?: string | null
}

export default function DashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [parents, setParents] = useState<UserRow[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [nomClasse, setNomClasse] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Full-page redirect (not router.push) so all client state is cleared and
    // the proxy re-evaluates the now-removed auth cookie on the next request.
    window.location.href = '/login'
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

  const fetchParents = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, nom, email, role, statut, classe_id')
      .eq('role', 'parent')
      .order('nom', { ascending: true })
    setParents(data || [])
  }

  async function checkUserAndFetch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let { data: profile } = await supabase
      .from('users')
      .select('role, nom, statut')
      .eq('id', user.id)
      .single()

    if (!profile) {
      const meta = user.user_metadata
      const role = meta?.role || 'admin'
      const nom = meta?.nom || user.email?.split('@')[0] || 'Admin'
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        nom,
        role,
        statut: 'actif',
      })
      profile = { role, nom, statut: 'actif' }
    }

    if (profile.statut === 'en_attente') {
      router.push('/attente')
      return
    }

    setUserRole(profile.role)
    setUserName(profile.nom)

    fetchClasses()

    if (profile.role === 'admin') {
      fetchUsers()
      fetchParents()
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    // State is only set after awaited auth/data calls, not synchronously on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkUserAndFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
const validerUser = async (id: string, email: string, nom: string) => {
    await supabase.from('users').update({ statut: 'actif' }).eq('id', id)
    if  (email && nom) {
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: email, type: 'validation', nom: nom }),
        })
      } catch (e) { console.error('email validation:', e) }
    }
    fetchUsers()
    fetchParents()
  }

  const assignClasse = async (id: string, classeId: string | null) => {
    await supabase.from('users').update({ classe_id: classeId }).eq('id', id)
    fetchParents()
  }

  const refuserUser = async (id: string) => {
    await supabase.from('users').delete().eq('id', id)
    fetchUsers()
  }

  const creerClasse = async () => {
    if (!nomClasse.trim()) return
    const slug = nomClasse.toLowerCase().replace(/\s+/g, '-')
    await supabase.from('classes').insert({ nom: nomClasse, slug })
    setNomClasse('')
    fetchClasses()
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`intrascool.fr/inscription?classe=${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const isAdmin = userRole === 'admin'

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <div className="bg-[#1a3a5c] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center font-bold text-lg">
            {userName?.[0]?.toUpperCase() || 'M'}
          </div>
          <div>
            <p className="font-bold text-lg">
              {isAdmin ? 'Dashboard Admin' : `Bienvenue, ${userName}`}
            </p>
            <p className="text-xs text-orange-300">Madrassa Argenteuil</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-white bg-red-500 px-3 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Deconnexion
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {isAdmin && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 text-center shadow">
                <p className="text-3xl font-bold text-[#1a3a5c]">{classes.length}</p>
                <p className="text-sm text-gray-500">Classes</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow">
                <p className="text-3xl font-bold text-orange-500">{users.length}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h2 className="font-bold text-[#1a3a5c] mb-3">Creer une classe</h2>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  placeholder="Ex: Coran-Niveau1"
                  value={nomClasse}
                  onChange={e => setNomClasse(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && creerClasse()}
                />
                <button
                  onClick={creerClasse}
                  className="bg-[#1a3a5c] text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-500 transition"
                >
                  Creer
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h2 className="font-bold text-[#1a3a5c] mb-3">Liens d&apos;inscription par classe</h2>
              <p className="text-xs text-gray-400 mb-3">Partagez ces liens aux parents pour s&apos;inscrire a la bonne classe.</p>
              {classes.map((classe: Classe) => (
                <div key={classe.id} className="mb-4 border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{classe.nom}</p>
                      <p className="text-xs text-blue-500">intrascool.fr/inscription?classe={classe.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyLink(classe.slug)}
                        className="text-xs bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition"
                      >
                        {copied === classe.slug ? '✓ Copie' : 'Copier'}
                      </button>
                      <a
                        href={`/mur/${classe.id}`}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition"
                      >
                        Mur
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h2 className="font-bold text-[#1a3a5c] mb-3">Affecter une classe aux parents</h2>
              <p className="text-xs text-gray-400 mb-3">Choisissez la classe de chaque parent.</p>
              {parents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Aucun parent inscrit.</p>
              )}
              {parents.map((parent: UserRow) => (
                <div key={parent.id} className="mb-3 border-b pb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{parent.nom}</p>
                    <p className="text-xs text-gray-500 truncate">{parent.email}</p>
                    <p className="text-xs text-gray-400">
                      {parent.statut === 'en_attente' ? 'En attente' : 'Actif'}
                    </p>
                  </div>
                  <select
                    value={parent.classe_id ?? ''}
                    onChange={e => assignClasse(parent.id, e.target.value || null)}
                    className="border rounded-lg px-2 py-1 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  >
                    <option value="">— Aucune —</option>
                    {classes.map((classe: Classe) => (
                      <option key={classe.id} value={classe.id}>{classe.nom}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-[#1a3a5c] mb-3">Inscriptions en attente ({users.length})</h2>
              {loading && <p className="text-sm text-gray-400">Chargement...</p>}
              {users.map((user: UserRow) => (
                <div key={user.id} className="mb-4 border-b pb-3">
                  <p className="font-semibold text-sm">{user.nom}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">Role : {user.role}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                     onClick={() => validerUser(user.id, user.email, user.nom)}
                      className="flex-1 bg-teal-500 text-white py-2 rounded-lg text-sm hover:bg-teal-600 transition"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => refuserUser(user.id)}
                      className="flex-1 bg-red-400 text-white py-2 rounded-lg text-sm hover:bg-red-500 transition"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
              {!loading && users.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune inscription en attente</p>
              )}
            </div>
          </>
        )}

        {!isAdmin && (
          <>
            <h2 className="font-bold text-[#1a3a5c] text-lg mb-4">Mes classes</h2>
            {loading ? (
              <p className="text-sm text-gray-400">Chargement...</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune classe disponible pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {classes.map((classe: Classe) => (
                  <a
                    key={classe.id}
                    href={`/mur/${classe.id}`}
                    className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition"
                  >
                    <p className="font-semibold text-[#1a3a5c]">{classe.nom}</p>
                    <p className="text-xs text-gray-400 mt-1">Acceder au mur de la classe</p>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
