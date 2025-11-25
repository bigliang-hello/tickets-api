import { ENV } from '@/lib/env'

let tokenCache: { token: string; expiresAt: number } | null = null

export async function getWechatAccessToken() {
  const now = Date.now()
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token
  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', ENV.WECHAT_APPID())
  url.searchParams.set('secret', ENV.WECHAT_SECRET())
  const res = await fetch(url, { method: 'GET' })
  const json = await res.json()
  if (!json.access_token) throw new Error('wechat token error')
  tokenCache = { token: json.access_token as string, expiresAt: Date.now() + (json.expires_in ? json.expires_in * 1000 : 7200_000) }
  return tokenCache.token
}

export interface SubscribeMessagePayload {
  touser: string
  template_id: string
  page?: string
  data: Record<string, { value: string }>
  miniprogram_state?: 'developer' | 'trial' | 'formal'
}

export async function sendSubscribeMessage(payload: SubscribeMessagePayload) {
  const token = await getWechatAccessToken()
  const url = new URL('https://api.weixin.qq.com/cgi-bin/message/subscribe/send')
  url.searchParams.set('access_token', token)
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const json = await res.json()
  return json
}

