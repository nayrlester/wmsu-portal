import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import KioskDevice from '#modules/library/models/kiosk_device'
import KioskTransaction from '#modules/library/models/kiosk_transaction'
import Member from '#modules/library/models/member'
import BookCopy from '#modules/library/models/book_copy'
import Borrowing from '#modules/library/models/borrowing'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import BorrowingService from '#modules/library/services/borrowing/borrowing_service'
import MemberService from '#modules/library/services/members/member_service'
import PortalService from '#modules/library/services/portal/portal_service'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export default class KioskService {
  constructor(
    private borrowingService = new BorrowingService(),
    private memberService = new MemberService(),
    private portalService = new PortalService()
  ) {}

  serverTime() {
    return DateTime.now().toISO()
  }

  serializeDevice(kiosk: KioskDevice, plaintextApiKey?: string) {
    return {
      id: kiosk.id,
      name: kiosk.name,
      deviceCode: kiosk.deviceCode,
      location: kiosk.location,
      isEnabled: kiosk.isEnabled,
      idleTimeoutSeconds: kiosk.idleTimeoutSeconds,
      config: kiosk.config,
      apiKeyPrefix: kiosk.apiKeyPrefix,
      lastSeenAt: kiosk.lastSeenAt?.toISO() ?? null,
      createdAt: kiosk.createdAt.toISO(),
      updatedAt: kiosk.updatedAt?.toISO() ?? null,
      apiKey: plaintextApiKey ?? undefined,
      serverTime: this.serverTime(),
    }
  }

  async generateApiKey(): Promise<{ plaintext: string; hash: string; prefix: string }> {
    const plaintext = `ksk_${randomBytes(24).toString('hex')}`
    return {
      plaintext,
      hash: await hash.make(plaintext),
      prefix: plaintext.slice(0, 12),
    }
  }

  async ensureServiceUser(): Promise<User> {
    const tid = borrowingTenantId()
    const email = 'kiosk-service@internal.library'
    let user = await User.query()
      .where('tenant_id', tid)
      .where('email', email)
      .whereNull('deleted_at')
      .first()

    if (user) return user

    user = await User.create({
      tenantId: tid,
      email,
      fullName: 'Kiosk Self-Service',
      password: await hash.make(`kiosk:${randomBytes(32).toString('hex')}`),
      status: 'active',
    })

    const staffRole =
      (await Role.query().where('tenant_id', tid).where('code', 'staff').first()) ??
      (await Role.query().where('tenant_id', tid).where('code', 'librarian').first()) ??
      (await Role.query().where('tenant_id', tid).where('code', 'admin').first())

    if (staffRole) {
      await user.related('roles').attach({
        [staffRole.id]: { assigned_at: DateTime.now().toSQL() },
      })
    }

    return user
  }

  async findMemberByCard(cardNumber: string) {
    const member = await Member.query()
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .whereILike('library_card_number', cardNumber.trim())
      .first()

    if (!member) throw new BusinessRuleException('Library card not found')
    return member
  }

  async findCopyByBarcode(barcode: string) {
    const copy = await BookCopy.query()
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .where('barcode', barcode.trim())
      .preload('book')
      .first()

    if (!copy) throw new BusinessRuleException('Item barcode not found')
    return copy
  }

  async log(
    kiosk: KioskDevice,
    action: string,
    memberId: string | null,
    payload: Record<string, unknown>
  ) {
    await KioskTransaction.create({
      tenantId: borrowingTenantId(),
      kioskDeviceId: kiosk.id,
      memberId,
      action,
      payload,
      createdAt: DateTime.now(),
    })
  }

  async session(kiosk: KioskDevice) {
    return {
      device: this.serializeDevice(kiosk),
      serverTime: this.serverTime(),
      features: {
        borrow: true,
        return: true,
        renew: true,
        account: true,
        history: true,
      },
    }
  }

  async heartbeat(kiosk: KioskDevice) {
    kiosk.lastSeenAt = DateTime.now()
    await kiosk.save()
    return { ok: true, serverTime: this.serverTime(), lastSeenAt: kiosk.lastSeenAt.toISO() }
  }

  async patronLookup(kiosk: KioskDevice, cardNumber: string) {
    const member = await this.findMemberByCard(cardNumber)
    const account = await this.portalService.accountStatus(member)
    await this.log(kiosk, 'patron_lookup', member.id, { cardNumber: member.libraryCardNumber })
    return {
      member: account.member,
      canBorrow: account.canBorrow,
      activeLoanCount: account.activeLoans.length,
      outstandingFineCount: account.outstandingFines.length,
      serverTime: this.serverTime(),
    }
  }

  async account(kiosk: KioskDevice, cardNumber: string) {
    const member = await this.findMemberByCard(cardNumber)
    const account = await this.portalService.accountStatus(member)
    await this.log(kiosk, 'account_view', member.id, { cardNumber: member.libraryCardNumber })
    return { ...account, serverTime: this.serverTime() }
  }

  async history(kiosk: KioskDevice, cardNumber: string) {
    const member = await this.findMemberByCard(cardNumber)
    const history = await this.memberService.getBorrowingHistory(member.id)
    await this.log(kiosk, 'history_view', member.id, { cardNumber: member.libraryCardNumber })
    return { ...history, serverTime: this.serverTime() }
  }

  async checkout(kiosk: KioskDevice, cardNumber: string, copyBarcode: string) {
    const member = await this.findMemberByCard(cardNumber)
    const copy = await this.findCopyByBarcode(copyBarcode)
    const serviceUser = await this.ensureServiceUser()

    const borrowing = await this.borrowingService.directCheckout(
      { memberId: member.id, copyId: copy.id, notes: `kiosk:${kiosk.deviceCode}` },
      serviceUser.id,
      { userId: serviceUser.id, userEmail: serviceUser.email }
    )

    await this.log(kiosk, 'checkout', member.id, {
      cardNumber: member.libraryCardNumber,
      barcode: copy.barcode,
      borrowingId: borrowing.id,
      bookTitle: copy.book?.title ?? null,
    })

    return {
      borrowing: this.borrowingService.serializeBorrowing(borrowing),
      serverTime: this.serverTime(),
    }
  }

  async renewByBarcode(kiosk: KioskDevice, cardNumber: string, copyBarcode: string) {
    const member = await this.findMemberByCard(cardNumber)
    const copy = await this.findCopyByBarcode(copyBarcode)
    const borrowing = await Borrowing.query()
      .where('tenant_id', borrowingTenantId())
      .where('copy_id', copy.id)
      .where('member_id', member.id)
      .whereIn('status', ['borrowed', 'overdue'])
      .first()

    if (!borrowing) {
      throw new BusinessRuleException('No active loan for this card and item')
    }

    const serviceUser = await this.ensureServiceUser()
    const renewed = await this.borrowingService.renew(borrowing.id, {
      userId: serviceUser.id,
      userEmail: serviceUser.email,
    })

    await this.log(kiosk, 'renew', member.id, {
      cardNumber: member.libraryCardNumber,
      barcode: copy.barcode,
      borrowingId: renewed.id,
      bookTitle: renewed.book?.title ?? null,
      dueAt: renewed.dueAt?.toISO() ?? null,
      renewalCount: renewed.renewalCount ?? 0,
    })

    return {
      borrowing: this.borrowingService.serializeBorrowing(renewed),
      serverTime: this.serverTime(),
    }
  }

  async returnByBarcode(kiosk: KioskDevice, copyBarcode: string) {
    const copy = await this.findCopyByBarcode(copyBarcode)
    const borrowing = await Borrowing.query()
      .where('tenant_id', borrowingTenantId())
      .where('copy_id', copy.id)
      .whereIn('status', ['borrowed', 'overdue'])
      .preload('book')
      .preload('member')
      .first()

    if (!borrowing) {
      throw new BusinessRuleException('No active loan found for this item')
    }

    const serviceUser = await this.ensureServiceUser()
    const returned = await this.borrowingService.return(
      borrowing.id,
      serviceUser.id,
      `kiosk:${kiosk.deviceCode}`,
      { userId: serviceUser.id, userEmail: serviceUser.email }
    )

    await this.log(kiosk, 'return', borrowing.memberId, {
      barcode: copy.barcode,
      borrowingId: borrowing.id,
      bookTitle: borrowing.book?.title ?? null,
    })

    return {
      borrowing: this.borrowingService.serializeBorrowing(returned),
      serverTime: this.serverTime(),
    }
  }

  async listTransactions(kioskId?: string, limit = 50) {
    const query = KioskTransaction.query()
      .where('tenant_id', borrowingTenantId())
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 200))

    if (kioskId) query.where('kiosk_device_id', kioskId)

    const rows = await query
    return rows.map((row) => ({
      id: row.id,
      kioskDeviceId: row.kioskDeviceId,
      memberId: row.memberId,
      action: row.action,
      payload: row.payload,
      createdAt: row.createdAt.toISO(),
    }))
  }
}
