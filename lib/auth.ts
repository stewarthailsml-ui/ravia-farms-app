import { createServerSupabase } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireUser() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED')
  }
  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('users')
    .select('role, farm_id')
    .eq('id', session.user.id)
    .single()
  return { id: session.user.id, email: session.user.email!, ...(profile ?? {}) }
}
