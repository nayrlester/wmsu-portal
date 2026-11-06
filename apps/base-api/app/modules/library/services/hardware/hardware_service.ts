import { DateTime } from 'luxon'
import RfidTag from '#modules/library/models/rfid_tag'
import RfidGateEvent from '#modules/library/models/rfid_gate_event'
import InventoryCount from '#modules/library/models/inventory_count'
import InventoryCountLine from '#modules/library/models/inventory_count_line'
import KioskDevice from '#modules/library/models/kiosk_device'
import LibraryQueueTicket from '#modules/library/models/library_queue_ticket'
import ShelfLocation from '#modules/library/models/shelf_location'
import BookCopy from '#modules/library/models/book_copy'
import Borrowing from '#modules/library/models/borrowing'
import Member from '#modules/library/models/member'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'
import KioskService from '#modules/library/services/kiosk/kiosk_service'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export default class HardwareService {
  constructor(
    private borrowingService = new BorrowingService(),
    private kioskService = new KioskService()
  ) {}

  // --- RFID ---
  async registerRfidTag(tagUid: string, copyId?: string, copyBarcode?: string) {
    const tid = borrowingTenantId()
    const existing = await RfidTag.query().where('tenant_id', tid).where('tag_uid', tagUid).first()
    if (existing) throw new BusinessRuleException('RFID tag already registered')

    let resolvedCopyId = copyId
    if (!resolvedCopyId && copyBarcode) {
      const copy = await BookCopy.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where('barcode', copyBarcode.trim())
        .first()
      if (!copy) throw new BusinessRuleException('Item barcode not found')
      resolvedCopyId = copy.id
    }

    if (resolvedCopyId) {
      await BookCopy.query().where('id', resolvedCopyId).where('tenant_id', tid).firstOrFail()
      const linked = await RfidTag.query()
        .where('tenant_id', tid)
        .where('copy_id', resolvedCopyId)
        .where('status', 'active')
        .first()
      if (linked) throw new BusinessRuleException('This copy already has an RFID tag')
    }

    return RfidTag.create({
      tenantId: tid,
      tagUid,
      copyId: resolvedCopyId ?? null,
      status: 'active',
      registeredAt: DateTime.now(),
      createdAt: DateTime.now(),
    })
  }

  async rfidCheckout(tagUid: string, memberId: string, userId: string, cardNumber?: string) {
    const member = cardNumber
      ? await this.memberByCard(cardNumber)
      : await Member.query().where('id', memberId).where('tenant_id', borrowingTenantId()).firstOrFail()
    const tag = await this.activeTag(tagUid)
    const borrowing = await this.borrowingService.directCheckout(
      { memberId: member.id, copyId: tag.copyId!, notes: `rfid:${tag.tagUid}` },
      userId,
      { userId }
    )
    const copy = await this.copySnapshot(tag.copyId!)
    return {
      borrowing: this.borrowingService.serializeBorrowing(borrowing),
      ...copy,
    }
  }

  async rfidCheckin(tagUid: string, userId: string) {
    const tag = await this.activeTag(tagUid)
    const borrowing = await Borrowing.query()
      .where('tenant_id', borrowingTenantId())
      .where('copy_id', tag.copyId!)
      .whereIn('status', ['borrowed', 'overdue'])
      .first()
    if (!borrowing) throw new BusinessRuleException('No active loan for this tag')

    const returned = await this.borrowingService.return(borrowing.id, userId, `rfid:${tag.tagUid}`, {
      userId,
    })
    const copy = await this.copySnapshot(tag.copyId!)
    return {
      borrowing: this.borrowingService.serializeBorrowing(returned),
      ...copy,
    }
  }

  async readGate(tagUid: string, gateCode: string) {
    const tid = borrowingTenantId()
    const tag = await RfidTag.query()
      .where('tenant_id', tid)
      .where('tag_uid', tagUid.trim())
      .first()

    let result = 'alarm'
    let reason = 'Unknown tag'
    let copyId: string | null = null
    let snapshot: { copyStatus: string; barcode: string; bookTitle: string | null } | null = null

    if (tag) {
      copyId = tag.copyId
      if (tag.status !== 'active') {
        reason = 'Tag is not active'
      } else if (!tag.copyId) {
        reason = 'Tag is not linked to a copy'
      } else {
        const copy = await BookCopy.query().where('id', tag.copyId).where('tenant_id', tid).preload('book').first()
        if (!copy) {
          reason = 'Copy not found'
        } else if (copy.status === 'on_loan') {
          result = 'clear'
          reason = 'Checked out'
          snapshot = {
            copyStatus: copy.status,
            barcode: copy.barcode,
            bookTitle: copy.book?.title ?? null,
          }
        } else {
          reason = 'Copy is not checked out'
          snapshot = {
            copyStatus: copy.status,
            barcode: copy.barcode,
            bookTitle: copy.book?.title ?? null,
          }
        }
      }
    }

    const event = await RfidGateEvent.create({
      tenantId: tid,
      gateCode: gateCode.trim(),
      tagUid: tagUid.trim(),
      copyId,
      result,
      reason,
      createdAt: DateTime.now(),
    })

    return {
      id: event.id,
      gateCode: event.gateCode,
      tagUid: event.tagUid,
      result: event.result,
      reason: event.reason,
      createdAt: event.createdAt.toISO(),
      barcode: snapshot?.barcode ?? null,
      bookTitle: snapshot?.bookTitle ?? null,
      copyStatus: snapshot?.copyStatus ?? null,
    }
  }

  async listGateEvents(limit = 20) {
    const rows = await RfidGateEvent.query()
      .where('tenant_id', borrowingTenantId())
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 50))
    return rows.map((event) => ({
      id: event.id,
      gateCode: event.gateCode,
      tagUid: event.tagUid,
      result: event.result,
      reason: event.reason,
      createdAt: event.createdAt.toISO(),
    }))
  }

  async listShelfCounts(limit = 8) {
    const rows = await InventoryCount.query()
      .where('tenant_id', borrowingTenantId())
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 20))
    const summaries = []
    for (const row of rows) {
      const report = await this.shelfCountReport(row.id)
      summaries.push({
        id: report.id,
        shelfCode: report.shelfCode,
        createdAt: row.createdAt?.toISO() ?? null,
        seenCount: report.seen.length,
        missingCount: report.missing.length,
        elsewhereCount: report.elsewhere.length,
        unknownCount: report.unknown.length,
      })
    }
    return summaries
  }

  async startShelfCount(shelfCode: string) {
    const code = shelfCode.trim()
    if (code.length < 2) throw new BusinessRuleException('Shelf code is required')
    const count = await InventoryCount.create({
      tenantId: borrowingTenantId(),
      shelfCode: code,
      createdAt: DateTime.now(),
    })
    return this.shelfCountReport(count.id)
  }

  async addShelfScan(countId: string, value: string) {
    const count = await this.findShelfCount(countId)
    const scanned = value.trim()
    if (scanned.length < 2) throw new BusinessRuleException('Scan a tag or barcode')
    const copy = await this.copyForScan(scanned)
    await InventoryCountLine.create({
      tenantId: count.tenantId,
      countId: count.id,
      scannedValue: scanned,
      copyId: copy?.id ?? null,
      createdAt: DateTime.now(),
    })
    return this.shelfCountReport(count.id)
  }

  async shelfCountReport(countId: string) {
    const count = await this.findShelfCount(countId)
    const lines = await InventoryCountLine.query().where('count_id', count.id).orderBy('created_at', 'asc')
    const expected = await BookCopy.query()
      .where('tenant_id', count.tenantId)
      .whereNull('deleted_at')
      .where('shelf_location', count.shelfCode)
      .preload('book')
      .orderBy('barcode', 'asc')
    const scannedCopyIds = [...new Set(lines.map((line) => line.copyId).filter((id): id is string => Boolean(id)))]
    const scannedCopies = scannedCopyIds.length
      ? await BookCopy.query().whereIn('id', scannedCopyIds).preload('book')
      : []
    const byId = new Map(scannedCopies.map((copy) => [copy.id, copy]))
    const seenIds = new Set(
      scannedCopies.filter((copy) => copy.shelfLocation === count.shelfCode).map((copy) => copy.id)
    )

    const row = (copy: BookCopy) => ({
      copyId: copy.id,
      barcode: copy.barcode,
      bookTitle: copy.book?.title ?? null,
      copyStatus: copy.status,
    })

    const elsewhere: Array<{ copyId: string; barcode: string; bookTitle: string | null; shelfLocation: string | null }> = []
    const unknown: string[] = []
    const seenElsewhere = new Set<string>()
    for (const line of lines) {
      if (!line.copyId) {
        if (!unknown.includes(line.scannedValue)) unknown.push(line.scannedValue)
        continue
      }
      const copy = byId.get(line.copyId)
      if (!copy || copy.shelfLocation === count.shelfCode || seenElsewhere.has(copy.id)) continue
      seenElsewhere.add(copy.id)
      elsewhere.push({
        copyId: copy.id,
        barcode: copy.barcode,
        bookTitle: copy.book?.title ?? null,
        shelfLocation: copy.shelfLocation,
      })
    }

    return {
      id: count.id,
      shelfCode: count.shelfCode,
      seen: expected.filter((copy) => seenIds.has(copy.id)).map(row),
      missing: expected.filter((copy) => !seenIds.has(copy.id)).map(row),
      elsewhere,
      unknown,
    }
  }

  private async findShelfCount(countId: string) {
    return InventoryCount.query()
      .where('id', countId)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()
  }

  private async copyForScan(value: string) {
    const tid = borrowingTenantId()
    const tag = await RfidTag.query().where('tenant_id', tid).where('tag_uid', value).where('status', 'active').first()
    if (tag?.copyId) {
      return BookCopy.query().where('id', tag.copyId).where('tenant_id', tid).whereNull('deleted_at').first()
    }
    return BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .where('barcode', value)
      .first()
  }

  async listRfidTags() {
    const tags = await RfidTag.query()
      .where('tenant_id', borrowingTenantId())
      .orderBy('registered_at', 'desc')
    const copyIds = tags.map((tag) => tag.copyId).filter((id): id is string => Boolean(id))
    const copies = copyIds.length
      ? await BookCopy.query().whereIn('id', copyIds).preload('book')
      : []
    const byId = new Map(copies.map((copy) => [copy.id, copy]))

    return tags.map((tag) => {
      const copy = tag.copyId ? byId.get(tag.copyId) : undefined
      return {
        id: tag.id,
        tagUid: tag.tagUid,
        copyId: tag.copyId,
        status: tag.status,
        registeredAt: tag.registeredAt.toISO(),
        barcode: copy?.barcode ?? null,
        bookTitle: copy?.book?.title ?? null,
        copyStatus: copy?.status ?? null,
      }
    })
  }

  private async activeTag(tagUid: string) {
    const tag = await RfidTag.query()
      .where('tenant_id', borrowingTenantId())
      .where('tag_uid', tagUid.trim())
      .first()
    if (!tag) throw new BusinessRuleException('RFID tag not found')
    if (tag.status !== 'active') throw new BusinessRuleException('RFID tag is not active')
    if (!tag.copyId) throw new BusinessRuleException('RFID tag is not linked to a copy')
    return tag
  }

  private async memberByCard(cardNumber: string) {
    const member = await Member.query()
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .whereILike('library_card_number', cardNumber.trim())
      .first()
    if (!member) throw new BusinessRuleException('Library card not found')
    return member
  }

  private async copySnapshot(copyId: string) {
    const copy = await BookCopy.query().where('id', copyId).preload('book').firstOrFail()
    return {
      copyStatus: copy.status,
      barcode: copy.barcode,
      bookTitle: copy.book?.title ?? null,
    }
  }

  // --- Kiosk ---
  async listKiosks() {
    const rows = await KioskDevice.query()
      .where('tenant_id', borrowingTenantId())
      .orderBy('name', 'asc')
    return rows.map((k) => this.kioskService.serializeDevice(k))
  }

  async upsertKiosk(input: {
    name: string
    deviceCode: string
    location?: string
    isEnabled?: boolean
    idleTimeoutSeconds?: number
    rotateApiKey?: boolean
  }) {
    const tid = borrowingTenantId()
    const existing = await KioskDevice.query()
      .where('tenant_id', tid)
      .where('device_code', input.deviceCode)
      .first()

    if (existing) {
      existing.name = input.name
      existing.location = input.location ?? existing.location
      if (input.isEnabled !== undefined) existing.isEnabled = input.isEnabled
      if (input.idleTimeoutSeconds !== undefined) existing.idleTimeoutSeconds = input.idleTimeoutSeconds
      existing.lastSeenAt = DateTime.now()

      let plaintext: string | undefined
      if (input.rotateApiKey || !existing.apiKeyHash) {
        const key = await this.kioskService.generateApiKey()
        existing.apiKeyHash = key.hash
        existing.apiKeyPrefix = key.prefix
        plaintext = key.plaintext
      }

      await existing.save()
      return this.kioskService.serializeDevice(existing, plaintext)
    }

    const key = await this.kioskService.generateApiKey()
    const created = await KioskDevice.create({
      tenantId: tid,
      name: input.name,
      deviceCode: input.deviceCode,
      location: input.location ?? null,
      isEnabled: input.isEnabled ?? true,
      idleTimeoutSeconds: input.idleTimeoutSeconds ?? 60,
      config: { selfService: true },
      apiKeyHash: key.hash,
      apiKeyPrefix: key.prefix,
      lastSeenAt: DateTime.now(),
      createdAt: DateTime.now(),
    })

    return this.kioskService.serializeDevice(created, key.plaintext)
  }

  async setKioskEnabled(id: string, isEnabled: boolean) {
    const kiosk = await KioskDevice.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()
    kiosk.isEnabled = isEnabled
    await kiosk.save()
    return this.kioskService.serializeDevice(kiosk)
  }

  async rotateKioskApiKey(id: string) {
    const kiosk = await KioskDevice.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()
    const key = await this.kioskService.generateApiKey()
    kiosk.apiKeyHash = key.hash
    kiosk.apiKeyPrefix = key.prefix
    kiosk.lastSeenAt = DateTime.now()
    await kiosk.save()
    return this.kioskService.serializeDevice(kiosk, key.plaintext)
  }

  async listKioskTransactions(kioskId?: string, limit = 50) {
    return this.kioskService.listTransactions(kioskId, limit)
  }

  // --- Queue ---
  async issueQueueTicket(serviceType: string, patronName?: string, memberId?: string) {
    const tid = borrowingTenantId()
    const count = await LibraryQueueTicket.query()
      .where('tenant_id', tid)
      .whereRaw("created_at::date = CURRENT_DATE")
      .count('* as total')
      .first()

    const seq = Number(count?.$extras.total ?? 0) + 1
    const ticketNumber = `${serviceType.slice(0, 1).toUpperCase()}${String(seq).padStart(3, '0')}`

    return LibraryQueueTicket.create({
      tenantId: tid,
      ticketNumber,
      serviceType,
      status: 'waiting',
      memberId: memberId ?? null,
      patronName: patronName ?? null,
      createdAt: DateTime.now(),
    })
  }

  async callNextTicket(serviceType?: string) {
    const query = LibraryQueueTicket.query()
      .where('tenant_id', borrowingTenantId())
      .where('status', 'waiting')
      .orderBy('created_at', 'asc')

    if (serviceType) query.where('service_type', serviceType)

    const ticket = await query.first()
    if (!ticket) throw new BusinessRuleException('No waiting tickets')

    ticket.status = 'called'
    ticket.calledAt = DateTime.now()
    await ticket.save()
    return ticket
  }

  async completeTicket(id: string) {
    const ticket = await LibraryQueueTicket.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .firstOrFail()

    if (ticket.status !== 'called') {
      throw new BusinessRuleException('Call the ticket before finishing service')
    }

    ticket.status = 'completed'
    ticket.completedAt = DateTime.now()
    await ticket.save()
    return ticket
  }

  async queueAnalytics() {
    const start = DateTime.now().startOf('day').toSQL()
    const tickets = await LibraryQueueTicket.query()
      .where('tenant_id', borrowingTenantId())
      .where('created_at', '>=', start!)

    const waits = tickets
      .filter((ticket) => ticket.calledAt)
      .map((ticket) => ticket.calledAt!.diff(ticket.createdAt).as('seconds'))
    const services = tickets
      .filter((ticket) => ticket.calledAt && ticket.completedAt)
      .map((ticket) => ticket.completedAt!.diff(ticket.calledAt!).as('seconds'))

    const average = (values: number[]) =>
      values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null

    return {
      issued: tickets.length,
      waiting: tickets.filter((ticket) => ticket.status === 'waiting').length,
      serving: tickets.filter((ticket) => ticket.status === 'called').length,
      finished: tickets.filter((ticket) => ticket.status === 'completed').length,
      averageWaitSeconds: average(waits),
      averageServiceSeconds: average(services),
    }
  }

  async queueBoard(options: { includePatronDetails?: boolean } = {}) {
    const tickets = await LibraryQueueTicket.query()
      .where('tenant_id', borrowingTenantId())
      .whereIn('status', ['waiting', 'called'])
      .orderBy('created_at', 'asc')
      .limit(50)

    return tickets.map((t) => {
      const base = {
        id: t.id,
        ticketNumber: t.ticketNumber,
        serviceType: t.serviceType,
        status: t.status,
        calledAt: t.calledAt?.toISO() ?? null,
        createdAt: t.createdAt.toISO(),
      }

      // Public display boards must not expose patron names / member linkage
      if (!options.includePatronDetails) {
        return base
      }

      return {
        ...base,
        patronName: t.patronName,
        memberId: t.memberId,
      }
    })
  }

  // --- Resource locator ---
  async listShelfLocations() {
    return ShelfLocation.query().where('tenant_id', borrowingTenantId()).orderBy('code', 'asc')
  }

  async upsertShelfLocation(input: {
    code: string
    label: string
    floor?: string
    aisle?: string
    shelf?: string
    mapCoordinates?: Record<string, unknown>
  }) {
    const tid = borrowingTenantId()
    const existing = await ShelfLocation.query().where('tenant_id', tid).where('code', input.code).first()
    if (existing) {
      existing.label = input.label
      existing.floor = input.floor ?? existing.floor
      existing.aisle = input.aisle ?? existing.aisle
      existing.shelf = input.shelf ?? existing.shelf
      existing.mapCoordinates = input.mapCoordinates ?? existing.mapCoordinates
      await existing.save()
      return existing
    }

    return ShelfLocation.create({
      tenantId: tid,
      code: input.code,
      label: input.label,
      floor: input.floor ?? null,
      aisle: input.aisle ?? null,
      shelf: input.shelf ?? null,
      mapCoordinates: input.mapCoordinates ?? null,
      createdAt: DateTime.now(),
    })
  }

  async locateByCallNumberOrBarcode(queryText: string) {
    const tid = borrowingTenantId()
    const term = `%${queryText}%`
    const copies = await BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .where((q) => {
        q.whereILike('barcode', term)
          .orWhereILike('shelf_location', term)
          .orWhereHas('book', (book) => {
            book
              .whereILike('title', term)
              .orWhereILike('classification_number', term)
              .orWhereILike('catalog_barcode', term)
          })
      })
      .preload('book')
      .limit(20)

    const codes = [
      ...new Set(copies.map((copy) => copy.shelfLocation).filter((code): code is string => Boolean(code))),
    ]
    const defined = codes.length
      ? await ShelfLocation.query().where('tenant_id', tid).whereIn('code', codes)
      : []
    const byCode = new Map(defined.map((shelf) => [shelf.code, shelf]))

    return copies.map((copy) => {
      const shelf = copy.shelfLocation ? byCode.get(copy.shelfLocation) : undefined
      return {
        copyId: copy.id,
        bookId: copy.bookId,
        barcode: copy.barcode,
        shelfLocation: copy.shelfLocation,
        status: copy.status,
        bookTitle: copy.book?.title,
        available: copy.status === 'available',
        floor: shelf?.floor ?? null,
        aisle: shelf?.aisle ?? null,
        shelf: shelf?.shelf ?? null,
        shelfLabel: shelf?.label ?? null,
      }
    })
  }

  async locator(queryText: string) {
    const matches = await this.locateByCallNumberOrBarcode(queryText)
    const shelves = await this.shelfMap()
    return { matches, shelves }
  }

  async shelfMap() {
    const tid = borrowingTenantId()
    const defined = await ShelfLocation.query().where('tenant_id', tid).orderBy('code', 'asc')
    const copies = await BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .select('shelf_location', 'status')
    const codes = new Set<string>()
    for (const shelf of defined) codes.add(shelf.code)
    for (const copy of copies) {
      if (copy.shelfLocation) codes.add(copy.shelfLocation)
    }

    return [...codes].sort().map((code) => {
      const shelf = defined.find((row) => row.code === code)
      const here = copies.filter((copy) => copy.shelfLocation === code)
      return {
        code,
        label: shelf?.label ?? code,
        floor: shelf?.floor ?? null,
        aisle: shelf?.aisle ?? null,
        shelf: shelf?.shelf ?? null,
        availableCount: here.filter((copy) => copy.status === 'available').length,
        copyCount: here.length,
      }
    })
  }
}
