'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  content: string
  created_at: string
  file_url?: string
  file_type?: string
  profiles: { full_name: string; role: string }
}

interface Comment {
  id: string
  post_id: string
  content: string
  created_at: string
  profiles: { full_name: string }
}

export default function MurPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newPost, setNewPost] = useState('')
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchPosts()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) setUserRole(profile.role)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      data.forEach((post: Post) => fetchComments(post.id))
    }
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setComments(prev => ({ ...prev, [postId]: data }))
  }

  async function uploadFile(file: File): Promise<{ url: string; type: string } | null> {
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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
    setUploading(true)
    let fileData: { url: string; type: string } | null = null
    if (selectedFile) fileData = await uploadFile(selectedFile)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('posts').insert({
      content: newPost,
      user_id: user?.id,
      file_url: fileData?.url || null,
      file_type: fileData?.type || null,
    })
    setNewPost('')
    setSelectedFile(null)
    setUploading(false)
    fetchPosts()
  }

  async function handleDeletePost(postId: string) {
    await supabase.from('posts').delete().eq('id', postId)
    fetchPosts()
  }

  async function handleCommentSubmit(postId: string) {
    const content = newComments[postId]
    if (!content?.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('comments').insert({ post_id: postId, content, user_id: user?.id })
    setNewComments(prev => ({ ...prev, [postId]: '' }))
    fetchComments(postId)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-green-700 mb-6">Mur de classe</h1>

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <textarea
            className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
            rows={3}
            placeholder="Ecrire un message..."
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 border border-dashed border-gray-300 rounded-lg px-3 py-2">
              <span>{selectedFile ? selectedFile.name : 'Joindre photo ou document'}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
            {selectedFile && userRole === 'admin' && (
              <button onClick={() => setSelectedFile(null)} className="text-xs text-red-400 hover:text-red-600">
                Supprimer
              </button>
            )}
          </div>
          {selectedFile && selectedFile.type.startsWith('image/') && (
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="preview"
              className="mt-3 max-h-40 rounded-lg object-cover"
            />
          )}
          <button
            onClick={handlePostSubmit}
            disabled={uploading}
            className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Envoi en cours...' : 'Publier'}
          </button>
        </div>

        {posts.map((post: Post) => (
          <div key={post.id} className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                  {post.profiles?.full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{post.profiles?.full_name}</p>
                  <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Supprimer
                </button>
              )}
            </div>
            {post.content && <p className="text-sm text-gray-700 mb-3">{post.content}</p>}
            {post.file_url && post.file_type === 'image' && (
              <img src={post.file_url} alt="fichier joint" className="rounded-lg max-h-64 object-cover mb-3 w-full" />
            )}
            {post.file_url && post.file_type === 'document' && (
              <a
                href={post.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3"
              >
                Voir le document
              </a>
            )}
            <div className="border-t pt-3 mt-2 space-y-2">
              {(comments[post.id] || []).map((c: Comment) => (
                <div key={c.id} className="text-sm text-gray-600">
                  <span className="font-medium">{c.profiles?.full_name} : </span>{c.content}
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
                  className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200"
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
