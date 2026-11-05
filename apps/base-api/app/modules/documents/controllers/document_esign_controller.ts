import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { esignService } from '#modules/documents/services/esign_service'

const sendEsignValidator = vine.compile(
  vine.object({
    fileId: vine.string().uuid().optional(),
    recipients: vine
      .array(
        vine.object({
          email: vine.string().email(),
          firstName: vine.string().trim().maxLength(100).optional(),
          lastName: vine.string().trim().maxLength(100).optional(),
          role: vine.string().trim().maxLength(100).optional(),
        })
      )
      .optional(),
    silent: vine.boolean().optional(),
    openSession: vine.boolean().optional(),
    subject: vine.string().trim().maxLength(200).optional(),
    message: vine.string().trim().maxLength(2000).optional(),
  })
)

const startEmbeddedValidator = vine.compile(
  vine.object({
    fileId: vine.string().uuid().optional(),
  })
)

export default class DocumentEsignController {
  async show({ params, auth, response }: HttpContext) {
    const envelope = await esignService.getLatestForDocument(params.id, auth.user!.id)
    if (!envelope) {
      return response.ok({ envelope: null })
    }
    return response.ok({ envelope: await esignService.serialize(envelope) })
  }

  async store({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(sendEsignValidator)
    const result = await esignService.sendForSignature(params.id, auth.user!.id, {
      ...payload,
      recipients: payload.recipients ?? [],
      openSession: payload.openSession ?? true,
      silent: payload.silent ?? true,
    })
    return response.created({
      envelope: await esignService.serialize(result.envelope),
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    })
  }

  /** Primary UX: create draft + editing session for place-fields, then finalize separately. */
  async start({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(startEmbeddedValidator)
    const result = await esignService.startEmbeddedSigning(
      params.id,
      auth.user!.id,
      payload.fileId
    )
    return response.created({
      envelope: await esignService.serialize(result.envelope),
      editorToken: result.editorToken,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    })
  }

  /** Re-open place-fields editor for an unsent envelope. */
  async placeSession({ params, auth, response }: HttpContext) {
    const result = await esignService.createPlacementSession(params.id, auth.user!.id)
    return response.ok({
      envelope: await esignService.serialize(result.envelope),
      editorToken: result.editorToken,
      expiresAt: result.expiresAt,
    })
  }

  /** After fields are placed: silent-send + return signing session. */
  async finalize({ params, auth, response }: HttpContext) {
    const result = await esignService.finalizeEmbeddedSigning(params.id, auth.user!.id)
    return response.ok({
      envelope: await esignService.serialize(result.envelope),
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    })
  }

  async session({ params, auth, response }: HttpContext) {
    const result = await esignService.createSigningSession(params.id, auth.user!.id)
    return response.ok({
      envelope: await esignService.serialize(result.envelope),
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
    })
  }

  /** Poll provider status and pull signed PDF when complete (no webhook required). */
  async sync({ params, auth, response }: HttpContext) {
    const result = await esignService.syncFromProvider(params.id, auth.user!.id)
    return response.ok({
      envelope: await esignService.serialize(result.envelope),
      synced: result.synced,
    })
  }
}
