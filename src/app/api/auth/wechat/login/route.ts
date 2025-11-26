import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { ENV } from '@/lib/env'
import { signJwt } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { code?: string; nickname?: string; avatar_url?: string }
    if (!body?.code) return NextResponse.json({ error: 'missing code' }, { status: 400 })

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.searchParams.set('appid', ENV.WECHAT_APPID())
    url.searchParams.set('secret', ENV.WECHAT_SECRET())
    url.searchParams.set('js_code', body.code)
    url.searchParams.set('grant_type', 'authorization_code')

    const wx = await fetch(url, { method: 'GET' })
    const wxData = await wx.json()
    if (wxData.errcode) return NextResponse.json({ error: 'wx error', detail: wxData }, { status: 400 })

    const openid: string = wxData.openid
    const unionid: string | undefined = wxData.unionid
    if (!openid) return NextResponse.json({ error: 'no openid' }, { status: 400 })

    const supabase = getSupabase()
    const { data: users } = await supabase.from('users_wechat').select('id, openid').eq('openid', openid).limit(1)
    let userId = users?.[0]?.id as string | undefined
    if (!userId) {
      const nickname = body.nickname ?? `用户_${Math.random().toString(36).substring(2, 8)}`
      const avatar_url = body.avatar_url ?? null
      const { data: inserted, error } = await supabase
        .from('users_wechat')
        .insert({ openid, unionid, nickname, avatar_url })
        .select('id')
        .limit(1)
      if (error) return NextResponse.json({ error: 'db insert error', detail: error.message }, { status: 500 })
      userId = inserted?.[0]?.id as string | undefined
    } else {
      const updateData: any = { last_login_at: new Date().toISOString() }
      if (body.nickname !== undefined) updateData.nickname = body.nickname
      if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url
      await supabase
        .from('users_wechat')
        .update(updateData)
        .eq('id', userId)
    }
    const { data: userData } = await supabase.from('users_wechat').select('nickname, avatar_url').eq('id', userId).limit(1)
    const token = signJwt(userId!)
    return NextResponse.json({ token, user: { id: userId, openid, unionid, nickname: userData?.[0]?.nickname ?? null, avatar_url: userData?.[0]?.avatar_url ?? null } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'internal', detail: message }, { status: 500 })
  }
}