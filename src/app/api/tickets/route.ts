import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/auth'
import { TicketCreateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100)
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1)
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .range(from, to)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  return NextResponse.json({ items: data, page, limit, total: count ?? null })
}

export async function POST(req: Request) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = TicketCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid fields', detail: parsed.error.flatten() }, { status: 400 })
  const payload = { ...parsed.data, user_id: userId }
  const { data, error } = await supabase.from('tickets').insert(payload).select('*').limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}