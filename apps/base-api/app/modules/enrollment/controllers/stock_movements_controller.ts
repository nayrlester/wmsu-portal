import type { HttpContext } from '@adonisjs/core/http'
import { stockMovementService } from '#modules/enrollment/services/stock_movement_service'
import {
  stockBeginningValidator,
  stockReceiveValidator,
  stockIssueValidator,
  stockTransferValidator,
  stockAdjustValidator,
  stockReturnValidator,
  stockDisposalValidator,
  stockReserveValidator,
  stockReleaseValidator,
} from '#modules/enrollment/validators/uims'

export default class StockMovementsController {
  async beginning({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockBeginningValidator)
    const txns = await stockMovementService.processBeginning(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async receive({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockReceiveValidator)
    const txns = await stockMovementService.processReceive(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async issue({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockIssueValidator)
    const txns = await stockMovementService.processIssue(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async transfer({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockTransferValidator)
    const txns = await stockMovementService.processTransfer(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async adjust({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockAdjustValidator)
    const txns = await stockMovementService.processAdjust(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async returnStock({ auth, request, response }: HttpContext) {
    const { lines, reference, notes } = await request.validateUsing(stockReturnValidator)
    const txns = await stockMovementService.processReturn(
      auth.user!.organizationId,
      lines,
      reference,
      notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async disposal({ auth, request, response }: HttpContext) {
    const { lines, reference, notes, reason } = await request.validateUsing(stockDisposalValidator)
    const txns = await stockMovementService.processDisposal(
      auth.user!.organizationId,
      lines,
      reference,
      reason ? `${reason}${notes ? ` | ${notes}` : ''}` : notes,
      auth.user!.id
    )
    return response.created({ data: txns })
  }

  async reserve({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(stockReserveValidator)
    const reservation = await stockMovementService.processReserve(
      auth.user!.organizationId,
      data,
      auth.user!.id
    )
    return response.created({ data: reservation })
  }

  async release({ auth, request, response }: HttpContext) {
    const { reservationId, quantity } = await request.validateUsing(stockReleaseValidator)
    const reservation = await stockMovementService.processRelease(
      auth.user!.organizationId,
      reservationId,
      quantity,
      auth.user!.id
    )
    return response.ok({ data: reservation })
  }

  async transactions({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const type = request.input('type')
    const result = await stockMovementService.listTransactions(
      auth.user!.organizationId,
      page,
      limit,
      type
    )
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async ledger({ auth, params, request, response }: HttpContext) {
    const warehouseId = request.input('warehouseId')
    const page = request.input('page', 1)
    const limit = request.input('limit', 50)
    const result = await stockMovementService.listLedger(
      auth.user!.organizationId,
      params.itemId,
      warehouseId,
      page,
      limit
    )
    return response.ok({ data: result.all(), meta: result.getMeta() })
  }

  async balances({ auth, request, response }: HttpContext) {
    const itemId = request.input('itemId')
    const warehouseId = request.input('warehouseId')
    const balances = await stockMovementService.getBalances(
      auth.user!.organizationId,
      itemId,
      warehouseId
    )
    return response.ok({ data: balances })
  }
}
