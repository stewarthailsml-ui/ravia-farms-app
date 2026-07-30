import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handle, requireAdmin, json, HttpError } from '../_shared/auth.ts'
import { StaffInviteSchema, StaffUpdateSchema } from '../_shared/schemas.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'

// Service-role client — used ONLY for auth.admin.inviteUserByEmail, which needs
// elevated privilege to create an auth.users row and send the invite email.
// Every other operation here (list/patch) goes through ctx.supabase (the
// caller's own JWT-bound client), so RLS still applies to those.
function adminClient() {
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

serve(handle(async (req, ctx) => {
  requireAdmin(ctx)

  if (req.method === 'GET') {
    const { data, error } = await ctx.supabase
      .from('users')
      .select('id, email, name, role, archived_at, created_at')
      .eq('farm_id', ctx.farmId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = StaffInviteSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    // handle_new_user (20240101000001_roles_and_provisioning.sql) reads farm_id +
    // role from this metadata and joins the invitee to THIS farm at THIS role,
    // instead of the default behaviour of spinning up a brand-new farm for them.
    const { data, error } = await adminClient().auth.admin.inviteUserByEmail(body.email, {
      data: { farm_id: ctx.farmId, role: body.role, name: body.name },
      redirectTo: `${appUrl}/auth/set-password`,
    })
    if (error) throw new HttpError(400, error.message)
    return json(data.user)
  }

  if (req.method === 'PATCH') {
    const raw = await req.json()
    const parsed = StaffUpdateSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    if (body.userId === ctx.userId && (body.deactivate || body.role)) {
      throw new HttpError(400, 'Cannot change your own role or deactivate your own account')
    }

    const patch: Record<string, unknown> = {}
    if (body.role) patch.role = body.role
    if (body.deactivate) patch.archived_at = new Date().toISOString()

    const { data, error } = await ctx.supabase
      .from('users')
      .update(patch)
      .eq('id', body.userId)
      .eq('farm_id', ctx.farmId)
      .select('id, email, name, role, archived_at')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new HttpError(404, 'Staff member not found')
    return json(data)
  }

  throw new HttpError(405, 'Method not allowed')
}))
