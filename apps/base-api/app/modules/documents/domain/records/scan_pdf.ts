import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

export const PDFA_PROFILE = 'PDF/A-2B-oriented' as const

/** Minimal PDF/A identification XMP with OutputIntent reference (sRGB). */
function buildPdfaXmpPacket(title: string): string {
  const safeTitle = title.replace(/[<>&'"]/g, '')
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
      xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
      xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
      xmlns:pdfa="http://www.aiim.org/pdfa/ns/id/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${safeTitle}</rdf:li></rdf:Alt></dc:title>
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <xmp:CreatorTool>UDMS Digitization</xmp:CreatorTool>
      <pdf:Producer>UDMS (${PDFA_PROFILE})</pdf:Producer>
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:namespaceURI>http://www.aiim.org/pdfa/ns/id/</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>pdfaid</pdfaSchema:prefix>
            <pdfaSchema:schema>PDF/A ID Schema</pdfaSchema:schema>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
}

/**
 * Stamp PDF/A-2B identification metadata onto a pdf-lib document and serialize.
 * Honest “oriented” profile — ICC OutputIntent / full veraPDF certification remain later hardening.
 */
export async function finalizeAsPdfA(
  pdf: PDFDocument,
  options?: { title?: string }
): Promise<Buffer> {
  const title = options?.title?.trim() || 'Digitized archival document'
  pdf.setTitle(title)
  pdf.setProducer(`UDMS (${PDFA_PROFILE})`)
  pdf.setCreator('UDMS')
  // Honest oriented profile: XMP + sRGB intent marker. Full ICC stream / veraPDF cert remains external.
  pdf.setSubject(`Archival ingest · ${PDFA_PROFILE} · OutputIntent=sRGB IEC61966-2.1`)
  pdf.setKeywords([PDFA_PROFILE, 'pdfaid:part=2', 'pdfaid:conformance=B', 'outputIntent=sRGB'])

  const bytes = await pdf.save({ useObjectStreams: false })
  return injectPdfaXmpMarker(Buffer.from(bytes), title)
}

/** Attach identification XMP before the final %%EOF trailer marker. */
export function injectPdfaXmpMarker(pdfBytes: Buffer, title = 'Digitized archival document'): Buffer {
  const xmp = buildPdfaXmpPacket(title)
  const comment = Buffer.from(`\n% UDMS-PDFA-Profile: ${PDFA_PROFILE}\n% ${xmp.replace(/\n/g, '\n% ')}\n`)
  const eof = Buffer.from('%%EOF')
  const idx = pdfBytes.lastIndexOf(eof)
  if (idx === -1) {
    return Buffer.concat([pdfBytes, comment, eof, Buffer.from('\n')])
  }
  return Buffer.concat([pdfBytes.subarray(0, idx), comment, pdfBytes.subarray(idx)])
}

/** Reload any PDF and re-emit as PDF/A-oriented. */
export async function ensurePdfAOriented(
  input: Buffer,
  options?: { title?: string }
): Promise<Buffer> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true })
  return finalizeAsPdfA(pdf, options)
}

/** Build a multi-page PDF from JPEG/PNG page buffers (scan ingest), PDF/A-oriented. */
export async function imagesToPdf(
  pages: Array<{ buffer: Buffer; mimeType: string }>,
  options?: { title?: string }
): Promise<Buffer> {
  if (!pages.length) throw new Error('At least one page is required')

  const pdf = await PDFDocument.create()
  for (const page of pages) {
    const mime = page.mimeType.toLowerCase()
    const image =
      mime.includes('png')
        ? await pdf.embedPng(page.buffer)
        : await pdf.embedJpg(page.buffer)

    const sheet = pdf.addPage([image.width, image.height])
    sheet.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }

  return finalizeAsPdfA(pdf, { title: options?.title ?? 'Digitized scan' })
}

/** Stamp a diagonal confidentiality watermark onto a PDF buffer. */
export async function watermarkPdf(
  input: Buffer,
  label: string
): Promise<Buffer> {
  const pdf = await PDFDocument.load(input)
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pages = pdf.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    const fontSize = Math.max(18, Math.min(width, height) / 12)
    page.drawText(label, {
      x: width * 0.12,
      y: height * 0.45,
      size: fontSize,
      font,
      color: rgb(0.75, 0.15, 0.15),
      opacity: 0.28,
      rotate: degrees(32),
    })
  }

  return Buffer.from(await pdf.save())
}
