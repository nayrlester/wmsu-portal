import { createGzip, createBrotliCompress, constants as zlibConstants } from 'node:zlib'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const MIN_COMPRESS_BYTES = 1024

function pickEncoding(acceptEncoding: string | undefined): 'br' | 'gzip' | null {
  const header = acceptEncoding?.toLowerCase() ?? ''
  if (header.includes('br')) return 'br'
  if (header.includes('gzip')) return 'gzip'
  return null
}

export default class CompressionMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    await next()

    const encoding = pickEncoding(request.header('accept-encoding'))
    if (!encoding) return

    const body = response.getBody()
    if (typeof body !== 'string' || body.length < MIN_COMPRESS_BYTES) return
    if (response.getHeader('content-encoding')) return

    const buffer = Buffer.from(body, 'utf8')
    if (buffer.byteLength < MIN_COMPRESS_BYTES) return

    const compressed =
      encoding === 'br'
        ? await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            const stream = createBrotliCompress({
              params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
            })
            stream.on('data', (chunk) => chunks.push(chunk as Buffer))
            stream.on('error', reject)
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.end(buffer)
          })
        : await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            const stream = createGzip({ level: 6 })
            stream.on('data', (chunk) => chunks.push(chunk as Buffer))
            stream.on('error', reject)
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.end(buffer)
          })

    response.header('content-encoding', encoding)
    response.header('vary', 'Accept-Encoding')
    response.removeHeader('content-length')
    response.send(compressed)
  }
}
