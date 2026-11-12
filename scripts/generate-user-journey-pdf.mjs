import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = path.join(root, 'apps/web-portal/public/docs/WMSU-Platform-User-Journeys.html')
const outPortal = path.join(root, 'apps/web-portal/public/docs/WMSU-Platform-User-Journeys.pdf')
const outDocs = path.join(root, 'docs/WMSU-Platform-User-Journeys.pdf')

if (!fs.existsSync(htmlPath)) {
  console.error('Missing HTML:', htmlPath)
  process.exit(1)
}

const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`

let browser
try {
  browser = await chromium.launch()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Executable doesn') || msg.includes('browserType.launch')) {
    console.error(
      'Playwright browser missing. One-time setup from repo root:\n' +
        '  cd WMSU/e2e\n' +
        '  pnpm exec playwright install chromium\n' +
        'Then run: cd ../wmsu-platform && pnpm run docs:user-journey-pdf'
    )
  }
  throw err
}
const page = await browser.newPage()
await page.goto(fileUrl, { waitUntil: 'load' })
await page.pdf({
  path: outPortal,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
})
fs.mkdirSync(path.dirname(outDocs), { recursive: true })
fs.copyFileSync(outPortal, outDocs)
await browser.close()

console.log('Generated:', outPortal)
console.log('Copied:  ', outDocs)
