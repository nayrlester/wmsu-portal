import { describe, expect, it } from 'vitest'
import { getFilePreviewMode, isDocxFile } from './file-preview'
import { findPandaDocFrame } from './pandadoc-embed'

describe('file-preview', () => {
  it('routes docx to formatted html preview', () => {
    expect(
      getFilePreviewMode(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'manual.docx'
      )
    ).toBe('docx-html')
    expect(isDocxFile('application/octet-stream', 'notes.DOCX')).toBe(true)
  })

  it('keeps pdf/images as inline iframe/image', () => {
    expect(getFilePreviewMode('application/pdf', 'a.pdf')).toBe('iframe')
    expect(getFilePreviewMode('image/png', 'a.png')).toBe('image')
  })

  it('falls back for unsupported office types', () => {
    expect(
      getFilePreviewMode(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'sheet.xlsx'
      )
    ).toBe('text-fallback')
  })
})

describe('findPandaDocFrame', () => {
  it('detects iframe that replaced the host element (same id)', () => {
    const iframe = document.createElement('iframe')
    iframe.id = 'pandadoc-host'
    document.body.appendChild(iframe)

    expect(findPandaDocFrame('pandadoc-host')).toBe(iframe)

    iframe.remove()
  })

  it('detects nested iframe when host div remains', () => {
    const host = document.createElement('div')
    host.id = 'pandadoc-nested'
    const iframe = document.createElement('iframe')
    host.appendChild(iframe)
    document.body.appendChild(host)

    expect(findPandaDocFrame('pandadoc-nested')).toBe(iframe)

    host.remove()
  })
})
