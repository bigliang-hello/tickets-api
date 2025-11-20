import { NextResponse } from 'next/server'
import type { ParsedFields } from '@/lib/types'

export const runtime = 'nodejs'

function pickTrainCode(text: string): string | undefined {
  const m = text.match(/\b([GDFZSTK]?\d{3,5})\b/)
  return m?.[1]
}

function pickDate(text: string): string | undefined {
  const m1 = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (m1) {
    const y = m1[1], mo = m1[2].padStart(2, '0'), d = m1[3].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  const m2 = text.match(/(\d{1,2})月(\d{1,2})日/)
  if (m2) {
    const now = new Date()
    const y = String(now.getFullYear())
    const mo = m2[1].padStart(2, '0')
    const d = m2[2].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return undefined
}

function pickStations(text: string): { from?: string; to?: string } {
  const fromMatch = text.match(/从(.+?)出发/) || text.match(/自(.+?)始发/) || text.match(/由(.+?)开/)
  const toMatch = text.match(/到达(.+?)(?:。|，|,|\s|$)/) || text.match(/开往(.+?)(?:。|，|,|\s|$)/)
  return { from: fromMatch?.[1]?.trim(), to: toMatch?.[1]?.trim() }
}

function pickSeat(text: string): string | undefined {
  const m = text.match(/(\d{1,2}车\d{1,2}[A-Z]?)(?:座)?/)
  return m?.[1]
}

function pickTimes(text: string): { depart?: string; arrive?: string } {
  const times = [...text.matchAll(/(\d{1,2}:\d{2})/g)].map(m => m[1])
  let depart: string | undefined
  let arrive: string | undefined
  if (times.length === 1) depart = times[0]
  if (times.length >= 2) { depart = times[0]; arrive = times[1] }
  const depMatch = text.match(/(\d{1,2}:\d{2}).{0,6}出发/)
  const arrMatch = text.match(/(\d{1,2}:\d{2}).{0,6}到达/)
  depart = depMatch?.[1] || depart
  arrive = arrMatch?.[1] || arrive
  return { depart, arrive }
}

function pickGate(text: string): string | undefined {
  const m = text.match(/检票口([A-Za-z0-9\-]+)/)
  return m?.[1]
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { text?: string }
  if (!body?.text) return NextResponse.json({ error: 'missing text' }, { status: 400 })
  const text = body.text
  const parsed: ParsedFields = {
    train_code: pickTrainCode(text),
    start_date: pickDate(text),
    seat_no: pickSeat(text),
    gate: pickGate(text),
  }
  const st = pickStations(text)
  parsed.from_station = st.from
  parsed.to_station = st.to
  const tm = pickTimes(text)
  parsed.depart_time = tm.depart
  parsed.arrive_time = tm.arrive
  const fields = Object.values(parsed).filter(Boolean).length
  const confidence = fields / 7
  return NextResponse.json({ parsed, confidence })
}