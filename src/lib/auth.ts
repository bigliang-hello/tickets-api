import jwt from 'jsonwebtoken'
import { ENV } from './env'

export interface JwtPayload {
  sub: string
}

export function signJwt(sub: string) {
  return jwt.sign({ sub } as JwtPayload, ENV.APP_JWT_SECRET(), { algorithm: 'HS256', expiresIn: '30d' })
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ENV.APP_JWT_SECRET()) as JwtPayload
  } catch {
    return null
  }
}

export function getAuthUserId(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.*)$/)
  if (!m) return null
  const payload = verifyJwt(m[1])
  return payload?.sub || null
}