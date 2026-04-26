'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
  role: string
}

interface Message {
  id: string
  contenu: string
  expediteur_id: string
  destinataire_id: string
  created_at: string
  lu: boolean
  expediteur: { full_name: string }
  destinataire: { full_name: string }
}

export default function MessagesPage() {
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (selectedUser) fetchMessages()
  }, [selectedUser])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) {
      setUserRole(profile.role)
      fetchProfiles(user.id, profile.role)
    }
  }

  async function fetchProfiles(uid: string, role: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('id', uid)
    if (data) {
      if (role === 'admin') {
        setProfiles(data)
      } else {
        setProfiles(data.filter((p: Profile) => p.role === 'admin'))
      }
    }
  }

  async function fetchMessages() {
    if (!selectedUser) return
    const { data } = await supabase
      .from('messages')
      .select('*, expediteur:expediteur_id(full_name), destinataire:destinataire_id(full_name)')
      .or(`and(expediteur_id.eq.${userId},destinataire_id.eq.${selectedUser.id}),and(expediteur_id.eq.${selectedUser.id},destinataire_id.eq.${userId})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser) return
    setSending(true)
    await supabase.from('messages').insert({
      contenu: newMessage,
      expediteur_id: userId,
      destinataire_id: selectedUser.id,
      lu: false,
    })
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
              <p className="font-medium">{profile.full_name}</p>
              <p className="text-xs text-gray-400">{profile.role}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="bg-white shadow px-6 py-4">
              <h3 className="font-semibold text-gray-800">{selectedUser.full_name}</h3>
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
