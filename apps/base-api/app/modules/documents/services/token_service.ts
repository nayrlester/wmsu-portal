import crypto from 'node:crypto'

export class TokenService {
  generate(length = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  }
}

export const tokenService = new TokenService()
