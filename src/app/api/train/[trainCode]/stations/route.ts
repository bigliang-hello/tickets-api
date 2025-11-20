import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getAuthUserIdWithBypass } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ trainCode: string }> }) {
  const userId = getAuthUserIdWithBypass(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'missing date' }, { status: 400 })

  const { trainCode } = await params
  const supabase = getSupabase()
  const { data: cached, error } = await supabase
    .from('train_routes_cache')
    .select('route_json, cached_at')
    .eq('train_code', trainCode)
    .eq('depart_date', date)
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  const rows: Array<{ route_json?: unknown }> = cached ?? []
  if (rows?.[0]?.route_json) return NextResponse.json({ train_code: trainCode, date, route: rows[0].route_json })

  return NextResponse.json({ error: 'not_cached', message: '该车次当日经停站尚未缓存' }, { status: 404 })
}