import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUserIdWithBypass } from '@/lib/auth'
import { nextFireAt } from '@/lib/reminders'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100)
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1)
  const from = (page - 1) * limit
  const to = from + limit - 1
  const supabase = getSupabase()
  const { data, error, count } = await supabase
    .from('reminders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('next_fire_at', { ascending: true, nullsFirst: false })
    .range(from, to)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  return NextResponse.json({ items: data, page, limit, total: count ?? null })
}

export async function POST(req: NextRequest) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as any
  if (!body?.title || !body?.startDate || !body?.remindTime || typeof body?.allDay !== 'boolean' || !body?.repeat || !body?.endRepeat) {
    return NextResponse.json({ error: 'invalid fields' }, { status: 400 })
  }
  const nf = nextFireAt({
    startDate: body.startDate,
    startTime: body.startTime,
    remindTime: body.remindTime,
    allDay: body.allDay,
    repeat: body.repeat,
    repeatDayOfWeek: body.repeatDayOfWeek,
    endRepeat: body.endRepeat,
    endDate: body.endDate,
  })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      icon: body.icon ?? null,
      all_day: body.allDay,
      start_date: body.startDate,
      start_time: body.startTime ?? null,
      repeat: body.repeat,
      repeat_day_of_week: body.repeatDayOfWeek ?? null,
      end_repeat: body.endRepeat,
      end_date: body.endDate ?? null,
      remind_time: body.remindTime,
      notify_enabled: !!body.notifyEnabled,
      status: body.status ?? 'active',
      next_fire_at: nf ? nf.toISOString() : null,
    })
    .select('*')
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}

