import net from 'node:net'

const required = [
  { port: 3411, label: 'Identity API (wmsu-api)' },
  { port: 3500, label: 'Base API (@wmsu/base-api)' },
]

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close(() => resolve(false))
    })
    server.listen(port, '127.0.0.1')
  })
}

const blocked = []
for (const item of required) {
  if (await portInUse(item.port)) blocked.push(item)
}

if (blocked.length > 0) {
  console.error('')
  console.error('Local dev cannot bind fixed API ports (portal and SPAs expect these):')
  for (const item of blocked) {
    console.error(`  • ${item.port} — ${item.label}`)
  }
  console.error('')
  console.error('Stop leftover Node dev processes, then run pnpm run dev again.')
  console.error('Windows: pnpm run dev:stop  (or close old terminals).')
  console.error('')
  process.exit(1)
}
