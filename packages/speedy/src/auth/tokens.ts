import { createHash, randomUUID } from 'node:crypto'

import { SignJWT, jwtVerify, errors as joseErrors } from 'jose'

import { env } from '../env.js'

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

const ISSUER = 'kakdela-speedy'
const ACCESS_AUD = 'kakdela-access'
const REFRESH_AUD = 'kakdela-refresh'

export interface AccessTokenPayload {
  sub: string
  jti: string
}

export interface RefreshTokenPayload {
  sub: string
  jti: string
  exp: number
}

export async function issueAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuer(ISSUER)
    .setAudience(ACCESS_AUD)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret)
}

export async function issueRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date; hash: string }> {
  const jti = randomUUID()
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuer(ISSUER)
    .setAudience(REFRESH_AUD)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret)

  const { payload } = await jwtVerify(token, refreshSecret, { issuer: ISSUER, audience: REFRESH_AUD })
  const exp = payload.exp ?? 0

  return {
    token,
    expiresAt: new Date(exp * 1000),
    hash: hashRefreshToken(token),
  }
}

export type AccessVerifyResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; reason: 'token-expired' | 'token-invalid' }

export async function verifyAccessToken(token: string): Promise<AccessVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, { issuer: ISSUER, audience: ACCESS_AUD })
    if (!payload.sub || !payload.jti) return { ok: false, reason: 'token-invalid' }
    return { ok: true, payload: { sub: payload.sub, jti: payload.jti } }
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { ok: false, reason: 'token-expired' }
    return { ok: false, reason: 'token-invalid' }
  }
}

export type RefreshVerifyResult =
  | { ok: true; payload: RefreshTokenPayload }
  | { ok: false; reason: 'token-expired' | 'token-invalid' }

export async function verifyRefreshToken(token: string): Promise<RefreshVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret, { issuer: ISSUER, audience: REFRESH_AUD })
    if (!payload.sub || !payload.jti || !payload.exp) return { ok: false, reason: 'token-invalid' }
    return { ok: true, payload: { sub: payload.sub, jti: payload.jti, exp: payload.exp } }
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { ok: false, reason: 'token-expired' }
    return { ok: false, reason: 'token-invalid' }
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
