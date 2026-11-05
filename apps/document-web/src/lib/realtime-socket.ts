type Socket = import('socket.io-client').Socket

let socket: Socket | null = null
let socketModule: typeof import('socket.io-client') | null = null

type EventHandler = (...args: unknown[]) => void
const externalHandlers = new Map<string, Set<EventHandler>>()

function dispatch(event: string, ...args: unknown[]) {
  externalHandlers.get(event)?.forEach((handler) => handler(...args))
}

async function loadSocketModule() {
  if (!socketModule) {
    socketModule = await import('socket.io-client')
  }
  return socketModule
}

export function isRealtimeConnected(): boolean {
  return socket?.connected ?? false
}

export function getRealtimeSocket(): Socket | null {
  return socket
}

export function subscribeRealtimeEvent(event: string, handler: EventHandler) {
  if (!externalHandlers.has(event)) externalHandlers.set(event, new Set())
  externalHandlers.get(event)!.add(handler)
  return () => externalHandlers.get(event)?.delete(handler)
}

export async function connectRealtimeSocket(token: string, baseUrl: string) {
  if (socket?.connected) return socket

  const { io } = await loadSocketModule()

  socket = io(baseUrl, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => dispatch('socket:connected'))
  socket.on('disconnect', () => dispatch('socket:disconnected'))
  socket.on('document:updated', (...args) => dispatch('document:updated', ...args))
  socket.on('notification:new', (...args) => dispatch('notification:new', ...args))
  socket.on('notification', (...args) => dispatch('notification:new', ...args))
  socket.on('approval:updated', (...args) => dispatch('approval:updated', ...args))

  return socket
}

export function disconnectRealtimeSocket() {
  socket?.disconnect()
  socket = null
}
