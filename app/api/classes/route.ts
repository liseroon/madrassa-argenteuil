import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Public list of classes for the (anonymous) inscription form.
// The classes table is RLS-restricted to authenticated reads, so we use the
// service-role key server-side and expose only non-sensitive fields.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('classes')
    .select('id, nom, slug')
    .order('nom', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ classes: data ?? [] })
}
