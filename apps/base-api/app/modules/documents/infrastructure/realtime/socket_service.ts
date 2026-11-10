import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Secret } from '@adonisjs/core/helpers'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#modules/documents/models/user'
import { getSocketIoPubSubConnections } from '#infrastructure/queue/redis_connection'

type AuthenticatedSocket = Socket & {
  data: {
    userId: string
    tenantId: string
  }
}

class SocketService {
  private io: Server | null = null

  async boot(): Promise<void> {
    if (this.io || env.get('SOCKET_IO_ENABLED') === false) {
      return
    }

    const nodeServer = server.getNodeServer()
    if (!nodeServer) {
      logger.warn('[SocketService] HTTP server not ready — skipping Socket.IO boot')
      return
    }

    const frontendUrl = env.get('FRONTEND_URL').replace(/\/$/, '')
    const extraOrigins =
      env.get('CORS_ORIGIN')
        ?.split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean) ?? []
    const allowedOrigins = [...new Set([frontendUrl, ...extraOrigins])]

    this.io = new Server(nodeServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      path: env.get('SOCKET_IO_PATH') ?? '/socket.io',
    })

    if (env.get('SOCKET_IO_REDIS_ADAPTER') !== false) {
      const { pub, sub } = getSocketIoPubSubConnections()
      this.io.adapter(createAdapter(pub, sub))
    }

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const accessToken = await User.accessTokens.verify(new Secret(token))
        const user = await User.find(accessToken?.tokenableId)
        if (!user?.tenantId) {
          return next(new Error('Invalid user context'))
        }

        ;(socket as AuthenticatedSocket).data = {
          userId: user.id,
          tenantId: user.tenantId,
        }
        next()
      } catch {
        next(new Error('Unauthorized'))
      }
    })

    this.io.on('connection', (socket) => {
      const authSocket = socket as AuthenticatedSocket
      const room = this.userRoom(authSocket.data.tenantId, authSocket.data.userId)
      authSocket.join(room)

      authSocket.on('notifications:subscribe', () => {
        authSocket.join(room)
      })
    })

    logger.info('[SocketService] Socket.IO initialized')
  }

  emitToUser(tenantId: string, userId: string, event: string, payload: unknown): void {
    if (!this.io) return
    this.io.to(this.userRoom(tenantId, userId)).emit(event, payload)
  }

  private userRoom(tenantId: string, userId: string): string {
    return `tenant:${tenantId}:user:${userId}`
  }

  async shutdown(): Promise<void> {
    await this.io?.close()
    this.io = null
  }
}

export const socketService = new SocketService()
