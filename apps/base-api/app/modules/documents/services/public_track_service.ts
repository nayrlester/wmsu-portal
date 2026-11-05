import type Document from '#modules/documents/models/document'
import { ApprovalAction } from '#modules/documents/domain/enums/index'
import { DocumentNotFoundException } from '#modules/documents/domain/documents/document_exceptions'
import { DocumentVisibility } from '#modules/documents/domain/enums/index'
import type {
  PublicTrackDepartment,
  PublicTrackTimelineEntry,
  PublicTrackView,
} from '#modules/documents/domain/public/public_track_types'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { routingRepository } from '#infrastructure/repositories/routing_repository'
import { approvalRepository } from '#infrastructure/repositories/approval_repository'

const ACTION_LABELS: Record<string, string> = {
  submit: 'Document submitted',
  forward: 'Document forwarded',
  approve: 'Document approved',
  reject: 'Document rejected',
  return: 'Document returned for revision',
  receive: 'Document received',
}

export class PublicTrackService {
  async getByTrackingNumber(trackingNumber: string): Promise<PublicTrackView> {
    const document = await this.findDocument(trackingNumber)
    const timeline = await this.buildPublicTimeline(document)
    const currentDepartment = this.resolveCurrentDepartment(document, timeline)

    return {
      trackingNumber: document.trackingNumber,
      title: document.title,
      status: document.status,
      currentDepartment,
      lastUpdated: document.updatedAt?.toISO() ?? document.createdAt.toISO()!,
      submittedAt: document.submittedAt?.toISO() ?? null,
      timeline,
    }
  }

  private async findDocument(trackingNumber: string): Promise<Document> {
    try {
      const document = await documentRepository.findByTrackingNumber(trackingNumber)
      if (document.visibility === DocumentVisibility.PRIVATE) {
        throw new DocumentNotFoundException()
      }
      return document
    } catch {
      throw new DocumentNotFoundException()
    }
  }

  private async buildPublicTimeline(document: Document): Promise<PublicTrackTimelineEntry[]> {
    const [routingEntries, approvals] = await Promise.all([
      routingRepository.listByDocumentForTenant(document.id, document.tenantId),
      approvalRepository.listByDocumentForTenant(document.id, document.tenantId),
    ])

    const routingEvents: PublicTrackTimelineEntry[] = routingEntries.map((entry) => ({
      action: entry.action,
      label: ACTION_LABELS[entry.action] ?? this.formatActionLabel(entry.action),
      department: this.toPublicDepartment(entry.toDepartment ?? entry.fromDepartment),
      occurredAt: entry.routedAt.toISO()!,
    }))

    const approvalEvents: PublicTrackTimelineEntry[] = approvals.map((approval) => ({
      action: approval.action,
      label: ACTION_LABELS[approval.action] ?? this.formatActionLabel(approval.action),
      department: this.toPublicDepartment(document.department),
      occurredAt: approval.actedAt.toISO()!,
    }))

    const merged = [...routingEvents, ...approvalEvents]
    merged.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

    return this.deduplicateTimeline(merged)
  }

  private resolveCurrentDepartment(
    document: Document,
    timeline: PublicTrackTimelineEntry[]
  ): PublicTrackDepartment | null {
    const latestWithDepartment = timeline.find((entry) => entry.department)
    if (latestWithDepartment?.department) {
      return latestWithDepartment.department
    }

    return this.toPublicDepartment(document.department)
  }

  private toPublicDepartment(
    department: { name: string } | null | undefined
  ): PublicTrackDepartment | null {
    if (!department) return null
    return { name: department.name }
  }

  private formatActionLabel(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }

  private deduplicateTimeline(entries: PublicTrackTimelineEntry[]): PublicTrackTimelineEntry[] {
    const seen = new Set<string>()
    return entries.filter((entry) => {
      const key = `${entry.action}:${entry.occurredAt}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  isPublicAction(action: string): boolean {
    return [
      'submit',
      ApprovalAction.APPROVE,
      ApprovalAction.REJECT,
      ApprovalAction.RETURN,
      ApprovalAction.FORWARD,
      'receive',
    ].includes(action)
  }
}

export const publicTrackService = new PublicTrackService()
