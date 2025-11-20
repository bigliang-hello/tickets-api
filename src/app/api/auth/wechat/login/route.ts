import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ENV } from '@/lib/env'
import { signJwt } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
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

    const { data: users } = await supabase.from('users_wechat').select('id, openid').eq('openid', openid).limit(1)
    let userId = users?.[0]?.id as string | undefined
    if (!userId) {
      const { data: inserted, error } = await supabase
        .from('users_wechat')
        .insert({ openid, unionid, nickname: body.nickname ?? null, avatar_url: body.avatar_url ?? null })
        .select('id')
        .limit(1)
      if (error) return NextResponse.json({ error: 'db insert error', detail: error.message }, { status: 500 })
      userId = inserted?.[0]?.id
    } else {
      await supabase.from('users_wechat').update({ last_login_at: new Date().toISOString(), nickname: body.nickname ?? null, avatar_url: body.avatar_url ?? null }).eq('id', userId)
    }

    const token = signJwt(userId!)
    return NextResponse.json({ token, user: { id: userId, openid, unionid, nickname: body.nickname, avatar_url: body.avatar_url } })
  } catch (e: any) {
    return NextResponse.json({ error: 'internal', detail: e?.message }, { status: 500 })
  }
}