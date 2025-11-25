import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUserIdWithBypass } from '@/lib/auth'
import { ENV } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null) as { tmplIds?: string[]; authorizedAt?: string; sendAt?: string }
  const tmplId = (body?.tmplIds?.[0]) || ENV.REMINDER_TMPL_ID()
  const authorizedAt = body?.authorizedAt ? new Date(body.authorizedAt) : new Date()
  const supabase = getSupabase()
  const { data: reminder, error: rerr } = await supabase.from('reminders').select('id, user_id, next_fire_at').eq('id', id).eq('user_id', userId).limit(1)
  if (rerr) return NextResponse.json({ error: 'db error', detail: (rerr as any).message }, { status: 500 })
  if (!reminder?.[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const sendAt = body?.sendAt ? new Date(body.sendAt) : (reminder[0].next_fire_at ? new Date(reminder[0].next_fire_at as any) : authorizedAt)
  const { data, error } = await supabase
    .from('reminder_subscriptions')
    .insert({
      reminder_id: id,
      user_id: userId,
      template_id: tmplId,
      authorized_at: authorizedAt.toISOString(),
      send_at: sendAt.toISOString(),
      status: 'pending',
    })
    .select('*')
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}

