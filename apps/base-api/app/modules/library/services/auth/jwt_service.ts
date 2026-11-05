import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import env from '#start/env'

export interface JwtAccessPayload {
  sub: string
  tenantId: string
  email: string
  roles: string[]
  permissions: string[]
}

const encoder = new TextEncoder()

function getSecret(): Uint8Array {
  const secret = String(env.get('JWT_SECRET') ?? '')
  const weak =
    secret.length < 32 ||
    /change-me|changeme|secret|password|123456/i.test(secret)
  if (env.get('NODE_ENV') === 'production' && weak) {
    throw new Error(
      'JWT_SECRET is missing or too weak for production. Set a random secret ≥32 characters.'
    )
  }
  return encoder.encode(secret)
}

export default class JwtService {
  async signAccessToken(payload: JwtAccessPayload): Promise<string> {
    const expiresIn = env.get('JWT_ACCESS_EXPIRES_IN', '15m')

    return new SignJWT({
      tenant_id: payload.tenantId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(getSecret())
  }

  async verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    const { payload } = await jwtVerify(token, getSecret())

    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Invalid token subject')
    }

    const tenantId = payload.tenant_id
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Invalid token tenant')
    }

    return {
      sub: payload.sub,
      tenantId,
      email: String(payload.email ?? ''),
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
      permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
    }
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url')
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
