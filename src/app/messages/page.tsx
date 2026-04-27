'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type User = { id: string; nom: string; email: string; role: string }
type Message = {
  id: string
  contenu: string
  expediteur_id: string
  destinataire_id: string
  created_at: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('users').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
      const { data: allUsers } = await supabase
        .from('users').select('id, nom, email, role').neq('id', user.id)
      setUsers(allUsers || [])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedUser || !currentUser) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(expediteur_id.eq.${currentUser.id},destinataire_id.eq.${selectedUser.id}),and(expediteur_id.eq.${selectedUser.id},destinataire_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
      setMessages(data || [])
    }
    fetchMessages()
    const channel = supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedUser, currentUser])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser) return
    await supabase.from('messages').insert({
      contenu: newMessage,
      expediteur_id: currentUser.id,
      destinataire_id: selectedUser.id,
    })
    setNewMessage('')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">Chargement...</div>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/3 bg-white border-r overflow-y-auto">
        <div className="p-4 bg-[#1a3a5c] text-white font-bold text-lg">
          💬 Messagerie
        </div>
        {users.map(u => (
          <div key={u.id}
            onClick={() => setSelectedUser(u)}
            className={`p-4 cursor-pointer border-b hover:bg-orange-50 ${selectedUser?.id === u.id ? 'bg-orange-100' : ''}`}>
            <div className="font-semibold">{u.nom}</div>
            <div className="text-sm text-gray-500">{u.role}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 bg-white border-b font-bold text-[#1a3a5c]">
              Conversation avec {selectedUser.nom}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id}
                  className={`flex ${m.expediteur_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.expediteur_id === currentUser?.id ? 'bg-[#1a3a5c] text-white' : 'bg-white text-gray-800 border'}`}>
                    {m.contenu}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t flex gap-2">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-orange-400"
              />
              <button onClick={sendMessage}
                className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600">
                Envoyer
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionne une personne pour commencer
          </div>
        )}
      </div>
    </div>
  )
}