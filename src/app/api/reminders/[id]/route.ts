import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUserIdWithBypass } from '@/lib/auth'
import { nextFireAt } from '@/lib/reminders'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabase()
  const { data, error } = await supabase.from('reminders').select('*').eq('id', id).eq('user_id', userId).limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as any
  if (!body) return NextResponse.json({ error: 'missing body' }, { status: 400 })
  const { id } = await params
  let nf: Date | null = null
  if (body.startDate || body.startTime || body.remindTime || body.allDay != null || body.repeat || body.repeatDayOfWeek != null || body.endRepeat || body.endDate) {
    const current = {
      startDate: body.startDate,
      startTime: body.startTime,
      remindTime: body.remindTime,
      allDay: body.allDay ?? false,
      repeat: body.repeat ?? 'none',
      repeatDayOfWeek: body.repeatDayOfWeek,
      endRepeat: body.endRepeat ?? 'never',
      endDate: body.endDate,
    }
    nf = nextFireAt(current)
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('reminders')
    .update({ ...body, next_fire_at: nf ? nf.toISOString() : null })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found or no permission' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabase()
  const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

