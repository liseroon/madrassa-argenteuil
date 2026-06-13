'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  nom: string
  role: string
}

interface Message {
  id: string
  contenu: string
  expediteur_id: string
  destinataire_id: string
  created_at: string
  lu: boolean
  expediteur: { nom: string }
  destinataire: { nom: string }
}

export default function MessagesPage() {
  const [userId, setUserId] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedUser) fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    fetchContacts(user.id, profile?.role ?? '')
  }

  async function fetchContacts(currentUserId: string, currentUserRole: string) {
    let query = supabase
      .from('users')
      .select('id, nom, role')
      .neq('id', currentUserId)
      .order('nom', { ascending: true })
    if (currentUserRole !== 'admin') {
      query = query.eq('role', 'admin')
    }
    const { data, error } = await query
    if (!error && data) setProfiles(data)
  }

  async function fetchMessages() {
    if (!selectedUser) return
    // Like the contacts, the conversation is resolved server-side: RLS on the
    // messages table hides admin-sent rows from parents when queried directly.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/messages?with=${selectedUser.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    const { messages } = await res.json()
    setMessages(messages ?? [])
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ contenu: newMessage, destinataire_id: selectedUser.id }),
      })
    }
    setNewMessage('')
    setSending(false)
    fetchMessages()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-md p-4">
        <h2 className="text-lg font-bold text-green-700 mb-4">Messages</h2>
        <div className="space-y-2">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => setSelectedUser(profile)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedUser?.id === profile.id ? 'bg-green-100 text-green-700 font-semibold' : 'hover:bg-gray-100'}`}
            >
              <p className="font-medium">{profile.nom}</p>
              <p className="text-xs text-gray-400">{profile.role}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="bg-white shadow px-6 py-4">
              <h3 className="font-semibold text-gray-800">{selectedUser.nom}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`max-w-sm px-4 py-2 rounded-xl text-sm ${msg.expediteur_id === userId ? 'ml-auto bg-green-500 text-white' : 'bg-white shadow text-gray-700'}`}
                >
                  <p>{msg.contenu}</p>
                  <p className="text-xs opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
            <div className="bg-white p-4 flex gap-3">
              <input
                className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ecrire un message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={sending}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Selectionnez une conversation
          </div>
        )}
      </div>
    </div>
  )
}
