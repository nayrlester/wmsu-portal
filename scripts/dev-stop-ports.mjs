import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ports = [3411, 3500, 5173, 5174, 5180, 5181, 5182, 5183, 5184, 5185, 5186, 5187]

function stopPortWindows(port) {
  const script = [
    `$c = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    '| Select-Object -ExpandProperty OwningProcess -Unique',
    '| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }',
  ].join(' ')
  try {
    execSync(`powershell -NoProfile -Command "${script}"`, { stdio: 'ignore', cwd: root })
  } catch {
    /* no listener or access denied */
  }
}

function stopPortUnix(port) {
  try {
    execSync(`lsof -ti :${port} | xargs -r kill -9`, { stdio: 'ignore', cwd: root })
  } catch {
    /* no listener */
  }
}

for (const port of ports) {
  if (process.platform === 'win32') stopPortWindows(port)
  else stopPortUnix(port)
}

console.log('Stopped listeners on CIS dev ports (3411, 3500, 5173–5187). Run pnpm run dev.')
