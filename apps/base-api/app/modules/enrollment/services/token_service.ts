import { randomBytes, createHash } from 'node:crypto'

class TokenService {
  generate(bytes = 48): string {
    return randomBytes(bytes).toString('hex')
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}

export const tokenService = new TokenService()
