import { NextResponse } from 'next/server'
import { ENV } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET() {
  const envs = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APP_JWT_SECRET','WECHAT_APPID','WECHAT_SECRET','BAIDU_OCR_API_KEY','BAIDU_OCR_SECRET_KEY']
  const missing = envs.filter(k => !process.env[k])
  return NextResponse.json({
    ok: missing.length === 0,
    version: process.env.npm_package_version || null,
    missing_envs: missing,
    timestamp: new Date().toISOString(),
  })
}