import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { sendSubscribeMessage } from '@/lib/wechat'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  const supabase = getSupabase()
  const nowISO = new Date().toISOString()
  const { data: due, error } = await supabase
    .from('reminder_subscriptions')
    .select('id, reminder_id, user_id, template_id, send_at, status')
    .lte('send_at', nowISO)
    .eq('status', 'pending')
    .limit(50)
  if (error) return NextResponse.json({ error: 'db error', detail: (error as any).message }, { status: 500 })
  const results: any[] = []
  for (const row of due ?? []) {
    // 获取 openid
    const { data: users } = await supabase.from('users_wechat').select('openid').eq('id', row.user_id).limit(1)
    const openid = users?.[0]?.openid
    if (!openid) {
      await supabase.from('reminder_dispatch_log').insert({ reminder_id: row.reminder_id, subscription_id: row.id, due_time: row.send_at, status: 'skip', detail: 'missing openid' })
      continue
    }
    const { data: rem } = await supabase.from('reminders').select('title, description').eq('id', row.reminder_id).limit(1)
    const title = rem?.[0]?.title || '提醒'
    const remark = rem?.[0]?.description || ''
    const sendTimeText = new Date(row.send_at).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
    const payload = {
      touser: openid,
      template_id: row.template_id,
      data: { thing1: { value: title }, time3: { value: sendTimeText }, thing5: { value: remark } },
    }
    const resp = await sendSubscribeMessage(payload as any)
    const ok = !resp.errcode
    results.push({ id: row.id, ok, resp })
    await supabase.from('reminder_dispatch_log').insert({ reminder_id: row.reminder_id, subscription_id: row.id, due_time: row.send_at, status: ok ? 'success' : 'fail', detail: JSON.stringify(resp), sent_at: new Date().toISOString() })
    await supabase.from('reminder_subscriptions').update({ status: ok ? 'sent' : 'failed', result_code: resp.errcode ?? null, result_msg: resp.errmsg ?? null }).eq('id', row.id)
    // 更新 reminders 的 next_fire_at（简化为清空，真实逻辑应重算下一次）
    await supabase.from('reminders').update({ next_fire_at: null }).eq('id', row.reminder_id)
  }
  return NextResponse.json({ processed: results.length, results })
}
