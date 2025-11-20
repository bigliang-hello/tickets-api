import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUserIdWithBypass } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabase()
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).eq('user_id', userId).limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'missing body' }, { status: 400 })
  const { id } = await params
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...body })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'not found or no permission' }, { status: 404 })
  return NextResponse.json(data[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabase()
  const { error } = await supabase.from('tickets').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}