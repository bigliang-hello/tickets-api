import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('tickets').select('*').eq('id', params.id).eq('user_id', userId).limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'missing body' }, { status: 400 })
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...body })
    .eq('id', params.id)
    .eq('user_id', userId)
    .select('*')
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found or no permission' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { error } = await supabase.from('tickets').delete().eq('id', params.id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}