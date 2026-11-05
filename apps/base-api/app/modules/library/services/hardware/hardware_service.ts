import { DateTime } from 'luxon'
import RfidTag from '#modules/library/models/rfid_tag'
import KioskDevice from '#modules/library/models/kiosk_device'
import LibraryQueueTicket from '#modules/library/models/library_queue_ticket'
import ShelfLocation from '#modules/library/models/shelf_location'
import BookCopy from '#modules/library/models/book_copy'
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
  async registerRfidTag(tagUid: string, copyId?: string) {
    const tid = borrowingTenantId()
    const existing = await RfidTag.query().where('tenant_id', tid).where('tag_uid', tagUid).first()
    if (existing) throw new BusinessRuleException('RFID tag already registered')

    if (copyId) {
      await BookCopy.query().where('id', copyId).where('tenant_id', tid).firstOrFail()
    }

    return RfidTag.create({
      tenantId: tid,
      tagUid,
      copyId: copyId ?? null,
      status: 'active',
      registeredAt: DateTime.now(),
      createdAt: DateTime.now(),
    })
  }

  async rfidCheckout(tagUid: string, memberId: string, userId: string) {
    const tag = await RfidTag.query()
      .where('tenant_id', borrowingTenantId())
      .where('tag_uid', tagUid)
      .firstOrFail()

    if (!tag.copyId) throw new BusinessRuleException('RFID tag is not linked to a copy')

    return this.borrowingService.directCheckout({ memberId, copyId: tag.copyId }, userId)
  }

  async listRfidTags() {
    return RfidTag.query().where('tenant_id', borrowingTenantId()).orderBy('registered_at', 'desc')
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
    const copies = await BookCopy.query()
      .where('tenant_id', tid)
      .whereNull('deleted_at')
      .where((q) => {
        q.whereILike('barcode', `%${queryText}%`).orWhereILike('shelf_location', `%${queryText}%`)
      })
      .preload('book')
      .limit(20)

    return copies.map((copy) => ({
      copyId: copy.id,
      barcode: copy.barcode,
      shelfLocation: copy.shelfLocation,
      status: copy.status,
      bookTitle: copy.book?.title,
      available: copy.status === 'available',
    }))
  }
}
