'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Post {
  id: string
  contenu: string
  created_at: string
  file_url?: string
  file_type?: string
  classe_id: string
  auteur_id: string
  users: { nom: string; role: string }
}

interface Comment {
  id: string
  post_id: string
  contenu: string
  created_at: string
  users: { nom: string }
}

interface Classe {
  id: string
  nom: string
  slug: string
}

export default function MurClassePage() {
  const params = useParams()
  const classeId = params.classeId as string
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [classe, setClasse] = useState<Classe | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const [newPost, setNewPost] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkUser()
    fetchClasse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) setUserRole(profile.role)
  }

  async function fetchClasse() {
    const { data } = await supabase
      .from('classes')
      .select('id, nom, slug')
      .eq('id', classeId)
      .single()
    if (data) {
      setClasse(data)
      fetchPosts()
    } else {
      router.push('/dashboard')
    }
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, users(nom, role)')
      .eq('classe_id', classeId)
      .order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      data.forEach((post: Post) => fetchComments(post.id))
    }
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase
      .from('commentaires')
      .select('*, users(nom)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setComments(prev => ({ ...prev, [postId]: data }))
  }

  async function uploadFile(file: File): Promise<{ url: string; type: string } | null> {
    const ext = file.name.split('.').pop()
    const fileName = `${classeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('class-files')
      .upload(fileName, file)
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from('class-files').getPublicUrl(fileName)
    const fileType = file.type.startsWith('image/') ? 'image' : 'document'
    return { url: data.publicUrl, type: fileType }
  }

  async function handlePostSubmit() {
    if (!newPost.trim() && !selectedFile) return
    if (!canPost) return
    setUploading(true)
    let fileData: { url: string; type: string } | null = null
    if (selectedFile) fileData = await uploadFile(selectedFile)
    await supabase.from('posts').insert({
      contenu: newPost,
      auteur_id: userId,
      classe_id: classeId,
      file_url: fileData?.url || null,
      file_type: fileData?.type || null,
    })
    setNewPost('')
    setSelectedFile(null)
    setUploading(false)
    fetchPosts()
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Supprimer ce post ?')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  function startEdit(post: Post) {
    setEditingPostId(post.id)
    setEditContent(post.contenu)
    setEditFile(null)
  }

  async function handleEditSubmit(post: Post) {
    setUploading(true)
    let fileUrl = post.file_url
    let fileType = post.file_type
    if (editFile) {
      const uploaded = await uploadFile(editFile)
      if (uploaded) {
        fileUrl = uploaded.url
        fileType = uploaded.type
      }
    }
    await supabase
      .from('posts')
      .update({ contenu: editContent, file_url: fileUrl, file_type: fileType })
      .eq('id', post.id)
    setEditingPostId(null)
    setEditFile(null)
    setUploading(false)
    fetchPosts()
  }

  async function handleCommentSubmit(postId: string) {
    const content = newComments[postId]
    if (!content?.trim()) return
    await supabase.from('commentaires').insert({
      post_id: postId,
      contenu: content,
      auteur_id: userId,
    })
    setNewComments(prev => ({ ...prev, [postId]: '' }))
    fetchComments(postId)
  }

  const isAdmin = userRole.toLowerCase() === 'admin'
  const canPost = ['admin', 'moualima', 'parent'].includes(userRole.toLowerCase())

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div>
            <a href="/dashboard" className="text-xs text-gray-400 hover:text-green-600 mb-1 inline-block">
              ← Dashboard
            </a>
            <h1 className="text-2xl font-bold text-green-700">
              Mur — {classe?.nom || '...'}
            </h1>
          </div>
          <a
          href="/messages"
            className="bg-[#1a3a5c] text-white px-4 py-2 rounded-full text-sm hover:bg-orange-500 transition"
          >
            💬 Messages
          </a>
        </div>

        {canPost && (
          <div className="bg-white rounded-xl shadow p-4 mb-6 border-l-4 border-green-500">
            <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">
              ✏️ Publier un message
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              rows={3}
              placeholder="Écrire un message pour cette classe..."
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                <span>📎 {selectedFile ? selectedFile.name : 'Joindre photo ou document'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
              {selectedFile && (
                <button onClick={() => setSelectedFile(null)} className="text-xs text-red-400 hover:text-red-600">
                  ✕ Retirer
                </button>
              )}
            </div>
            {selectedFile?.type.startsWith('image/') && (
              // next/image cannot render blob: object-URL previews
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="preview"
                className="mt-3 max-h-40 rounded-lg object-cover"
              />
            )}
            <button
              onClick={handlePostSubmit}
              disabled={uploading || (!newPost.trim() && !selectedFile)}
              className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition"
            >
              {uploading ? 'Envoi en cours...' : 'Publier'}
            </button>
          </div>
        )}

        {posts.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">
            Aucun post pour cette classe pour l&apos;instant.
          </div>
        )}

        {posts.map((post: Post) => (
          <div key={post.id} className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                  {post.users?.nom?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{post.users?.nom || 'Inconnu'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {isAdmin && editingPostId !== post.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(post)}
                    className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 rounded px-2 py-1 transition"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded px-2 py-1 transition"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              )}
            </div>

            {isAdmin && editingPostId === post.id ? (
              <div className="mt-2">
                <textarea
                  className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={3}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                />
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-lg px-3 py-1">
                    <span>📎 {editFile ? editFile.name : 'Remplacer le fichier'}</span>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => setEditFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {editFile && (
                    <button onClick={() => setEditFile(null)} className="text-xs text-red-400 hover:text-red-600">
                      ✕ Annuler fichier
                    </button>
                  )}
                </div>
                {editFile?.type.startsWith('image/') && (
                  // next/image cannot render blob: object-URL previews
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(editFile)} alt="preview" className="mt-2 max-h-32 rounded-lg object-cover" />
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEditSubmit(post)}
                    disabled={uploading}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {uploading ? 'Sauvegarde...' : '✓ Sauvegarder'}
                  </button>
                  <button
                    onClick={() => setEditingPostId(null)}
                    className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-200 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                {post.contenu && <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{post.contenu}</p>}
                {post.file_url && post.file_type === 'image' && (
                  <div className="relative w-full h-64 mb-3">
                    <Image
                      src={post.file_url}
                      alt="fichier joint"
                      fill
                      sizes="(max-width: 768px) 100vw, 672px"
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                {post.file_url && post.file_type === 'document' && (
                  <a href={post.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3">
                    📄 Voir le document
                  </a>
                )}
              </>
            )}

            <div className="border-t pt-3 mt-2 space-y-2">
              {(comments[post.id] || []).map((c: Comment) => (
                <div key={c.id} className="text-sm text-gray-600">
                  <span className="font-medium">{c.users?.nom} : </span>{c.contenu}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                  placeholder="Commenter..."
                  value={newComments[post.id] || ''}
                  onChange={e => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                />
                <button
                  onClick={() => handleCommentSubmit(post.id)}
                  className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
