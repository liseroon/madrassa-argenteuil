import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Messaging contacts for the signed-in user. The users table is RLS-restricted
// so non-admins can't read other rows; we resolve the directory server-side
// with the service-role key and scope it by the caller's role:
//   - admin            -> everyone else
//   - parent/moualima  -> admins only
// Only non-sensitive fields (id, nom, role) are returned.
export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ contacts: [] }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authError } = await anon.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ contacts: [] }, { status: 401 })
  }

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single()

  let query = admin.from('users').select('id, nom, role').neq('id', user.id).order('nom', { ascending: true })
  if (me?.role !== 'admin') {
    query = query.eq('role', 'admin')
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contacts: data ?? [] })
}
