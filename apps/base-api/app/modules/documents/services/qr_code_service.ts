import QRCode from 'qrcode'
import env from '#start/env'

export class QrCodeService {
  /**
   * Prefer PUBLIC_TRACK_BASE_URL for scannable links (LAN/public hostname).
   * FRONTEND_URL alone is often localhost and fails when opened from a phone.
   */
  resolvePublicBaseUrl(): string {
    const configured =
      env.get('PUBLIC_TRACK_BASE_URL')?.trim() || env.get('FRONTEND_URL').trim()
    return configured.replace(/\/$/, '')
  }

  buildTrackingUrl(trackingNumber: string): string {
    const baseUrl = this.resolvePublicBaseUrl()
    return `${baseUrl}/track/${encodeURIComponent(trackingNumber)}`
  }

  async generateDataUrl(trackingNumber: string): Promise<string> {
    return QRCode.toDataURL(this.buildTrackingUrl(trackingNumber), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    })
  }
}

export const qrCodeService = new QrCodeService()
