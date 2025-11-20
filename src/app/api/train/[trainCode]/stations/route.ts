import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { trainCode: string } }) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'missing date' }, { status: 400 })

  const { data: cached, error } = await supabase
    .from('train_routes_cache')
    .select('route_json, cached_at')
    .eq('train_code', params.trainCode)
    .eq('depart_date', date)
    .limit(1)
  if (error) return NextResponse.json({ error: 'db error', detail: error.message }, { status: 500 })
  if (cached?.[0]?.route_json) return NextResponse.json({ train_code: params.trainCode, date, route: cached[0].route_json })

  return NextResponse.json({ error: 'not_cached', message: '该车次当日经停站尚未缓存' }, { status: 404 })
}