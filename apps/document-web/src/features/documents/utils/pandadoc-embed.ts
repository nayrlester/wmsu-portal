/**
 * pandadoc-editor / pandadoc-signing replace the host element with an
 * <iframe id={containerId}>. Nested `querySelector('iframe')` therefore fails.
 */
export function findPandaDocFrame(containerId: string): HTMLIFrameElement | null {
  const el = document.getElementById(containerId)
  if (!el) return null
  if (el instanceof HTMLIFrameElement) return el
  return el.querySelector('iframe')
}

async function waitForFrameLoad(iframe: HTMLIFrameElement, settleMs = 1_400): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.setTimeout(resolve, settleMs)
    }

    try {
      // Same-origin check — PandaDoc is cross-origin; load still fires.
      if (iframe.contentDocument?.readyState === 'complete') {
        done()
        return
      }
    } catch {
      // cross-origin — fall through to load listener
    }

    iframe.addEventListener('load', done, { once: true })
    // Fallback if load already fired before we attached.
    window.setTimeout(done, 2_500)
  })
}

/**
 * Wait until PandaDoc has replaced the host with an iframe and the frame has
 * had time to paint (blank white stage should still show our loading overlay).
 */
export async function waitForPandaDocFrame(
  containerId: string,
  timeoutMs = 30_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const iframe = findPandaDocFrame(containerId)

    if (iframe) {
      // Ensure the frame fills its shell so layout doesn't jump when overlay hides.
      iframe.style.display = 'block'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.minHeight = '480px'
      iframe.style.border = '0'
      iframe.style.background = '#fff'
      await waitForFrameLoad(iframe)
      return true
    }

    await new Promise((resolve) => window.setTimeout(resolve, 80))
  }

  return false
}
