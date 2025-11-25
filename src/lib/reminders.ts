export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'
export type EndRepeat = 'never' | 'date'

export function nextFireAt(opts: {
  startDate: string
  startTime?: string
  remindTime: string
  allDay: boolean
  repeat: RepeatRule
  repeatDayOfWeek?: number
  endRepeat: EndRepeat
  endDate?: string
  from?: Date
}): Date | null {
  const tzOffset = 8 * 60
  function toDate(dateStr: string, timeStr?: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number)
    const utc = Date.UTC(y, m - 1, d, hh - (tzOffset / 60), mm)
    return new Date(utc)
  }
  function addDays(dt: Date, n: number) { const t = new Date(dt.getTime()); t.setUTCDate(t.getUTCDate() + n); return t }
  function addMonths(dt: Date, n: number) { const t = new Date(dt.getTime()); t.setUTCMonth(t.getUTCMonth() + n); return t }

  const startBase = toDate(opts.startDate, opts.allDay ? opts.remindTime : (opts.startTime || opts.remindTime))
  const now = opts.from || new Date()
  let candidate = startBase

  const endDate = opts.endRepeat === 'date' && opts.endDate ? toDate(opts.endDate, '23:59') : null

  if (opts.repeat === 'none') {
    if (candidate < now) return null
    return candidate
  }
  if (opts.repeat === 'daily') {
    while (candidate < now) candidate = addDays(candidate, 1)
    if (endDate && candidate > endDate) return null
    return candidate
  }
  if (opts.repeat === 'weekly') {
    const targetDow = (opts.repeatDayOfWeek ?? 0)
    while (candidate < now || candidate.getUTCDay() !== targetDow) candidate = addDays(candidate, 1)
    if (endDate && candidate > endDate) return null
    return candidate
  }
  if (opts.repeat === 'monthly') {
    const startDay = startBase.getUTCDate()
    while (candidate < now) candidate = addMonths(candidate, 1)
    const candDay = candidate.getUTCDate()
    if (candDay !== startDay) {
      // 调整到该月最后一天（兼容 31 号）
      const t = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0))
      t.setUTCHours(candidate.getUTCHours(), candidate.getUTCMinutes(), 0, 0)
      candidate = t
    }
    if (endDate && candidate > endDate) return null
    return candidate
  }
  return null
}

