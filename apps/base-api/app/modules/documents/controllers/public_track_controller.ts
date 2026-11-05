import type { HttpContext } from '@adonisjs/core/http'
import { publicTrackService } from '#modules/documents/services/public_track_service'

export default class PublicTrackController {
  async show({ params, response }: HttpContext) {
    const tracking = await publicTrackService.getByTrackingNumber(params.trackingNumber)
    return response.ok(tracking)
  }
}
