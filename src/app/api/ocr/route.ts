import { NextResponse, NextRequest } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { ENV } from '@/lib/env'

export const runtime = 'nodejs'

let ocrToken: { token: string; expiresAt: number } | null = null

async function getBaiduAccessToken() {
  const now = Date.now()
  if (ocrToken && now < ocrToken.expiresAt - 60_000) return ocrToken.token
  const url = new URL('https://aip.baidubce.com/oauth/2.0/token')
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', ENV.BAIDU_OCR_API_KEY())
  url.searchParams.set('client_secret', ENV.BAIDU_OCR_SECRET_KEY())
  const res = await fetch(url, { method: 'POST' })
  const json = await res.json()
  if (!json.access_token) throw new Error('baidu token error')
  ocrToken = { token: json.access_token as string, expiresAt: Date.now() + (json.expires_in ? json.expires_in * 1000 : 24 * 3600 * 1000) }
  return ocrToken.token
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = file.stream().getReader()
    const chunks: Uint8Array[] = []
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) {
        const buf = Buffer.concat(chunks)
        resolve(buf.toString('base64'))
        return
      }
      chunks.push(Buffer.from(value))
      pump()
    }).catch(reject)
    pump()
  })
}

function parseText(text: string) {
  const train = text.match(/\b([GDFZSTK]?\d{3,5})\b/)
  const date1 = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  const date2 = text.match(/(\d{1,2})月(\d{1,2})日/)
  const date = date1 ? `${date1[1]}-${date1[2].padStart(2,'0')}-${date1[3].padStart(2,'0')}` : (date2 ? `${new Date().getFullYear()}-${date2[1].padStart(2,'0')}-${date2[2].padStart(2,'0')}` : undefined)
  const seat = (text.match(/(\d{1,2}车\d{1,2}[A-Z]?)(?:座)?/) || [])[1]
  const gate = (text.match(/检票口([A-Za-z0-9\-]+)/) || [])[1]
  const depMatch = text.match(/从(.+?)出发/) || text.match(/自(.+?)始发/) || text.match(/由(.+?)开/)
  const arrMatch = text.match(/到达(.+?)(?:。|，|,|\s|$)/) || text.match(/开往(.+?)(?:。|，|,|\s|$)/)
  const depTime = (text.match(/(\d{1,2}:\d{2}).{0,6}出发/) || [])[1]
  const arrTime = (text.match(/(\d{1,2}:\d{2}).{0,6}到达/) || [])[1]
  return {
    train_code: train?.[1],
    start_date: date,
    seat_no: seat,
    gate,
    from_station: depMatch?.[1]?.trim(),
    to_station: arrMatch?.[1]?.trim(),
    depart_time: depTime,
    arrive_time: arrTime,
  }
}

export async function POST(req: NextRequest) {
  const userId = getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let base64: string | undefined
  const ct = req.headers.get('content-type') || ''
  if (ct.startsWith('multipart/form-data')) {
    const fd = await req.formData()
    const f = fd.get('file')
    if (!(f instanceof File)) return NextResponse.json({ error: 'missing file' }, { status: 400 })
    base64 = await toBase64(f)
  } else {
    const body = await req.json().catch(() => null) as { base64?: string }
    if (!body?.base64) return NextResponse.json({ error: 'missing base64' }, { status: 400 })
    base64 = body.base64
  }

  const token = await getBaiduAccessToken()
  const ocrUrl = new URL('https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic')
  ocrUrl.searchParams.set('access_token', token)
  const form = new URLSearchParams()
  form.set('image', base64!)
  const res = await fetch(ocrUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
  const json = await res.json()
  if (!json?.words_result) return NextResponse.json({ error: 'ocr error', detail: json }, { status: 502 })
  const text = (json.words_result as Array<{ words: string }>).map(x => x.words).join('\n')
  const parsed = parseText(text)
  const fields = Object.values(parsed).filter(Boolean).length
  const confidence = fields / 7
  return NextResponse.json({ parsed, confidence, raw: json })
}