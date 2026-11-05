import emitter from '@adonisjs/core/services/emitter'
import type RoutingEntry from '#modules/documents/models/routing_entry'
import type { DocumentActionEventPayload, RoutingRecordInput } from '#modules/documents/domain/routing/routing_types'
import { routingRepository } from '#infrastructure/repositories/routing_repository'

export class RoutingService {
  async record(input: RoutingRecordInput): Promise<RoutingEntry> {
    const entry = await routingRepository.create({
      tenantId: input.tenantId,
      documentId: input.documentId,
      action: input.action,
      fromUserId: input.fromUserId ?? null,
      toUserId: input.toUserId ?? null,
      fromDepartmentId: input.fromDepartmentId ?? null,
      toDepartmentId: input.toDepartmentId ?? null,
      remarks: input.remarks ?? null,
    })

    await this.emitAction({
      tenantId: input.tenantId,
      documentId: input.documentId,
      action: input.action,
      actorUserId: input.fromUserId ?? 'system',
      fromUserId: input.fromUserId ?? null,
      toUserId: input.toUserId ?? null,
      remarks: input.remarks ?? null,
      stepNodeId: input.stepNodeId ?? null,
      workflowInstanceId: input.workflowInstanceId ?? null,
      metadata: { routingEntryId: entry.id, ...(input.metadata ?? {}) },
    })

    return entry
  }

  async getTimeline(documentId: string) {
    const entries = await routingRepository.listByDocument(documentId)
    return entries.map((entry) => this.serializeTimelineEntry(entry))
  }

  serializeTimelineEntry(entry: RoutingEntry) {
    return {
      id: entry.id,
      action: entry.action,
      remarks: entry.remarks,
      routedAt: entry.routedAt.toISO()!,
      fromUser: entry.fromUser
        ? {
            id: entry.fromUser.id,
            fullName: entry.fromUser.fullName,
            email: entry.fromUser.email,
          }
        : null,
      toUser: entry.toUser
        ? {
            id: entry.toUser.id,
            fullName: entry.toUser.fullName,
            email: entry.toUser.email,
          }
        : null,
      fromDepartment: entry.fromDepartment
        ? { id: entry.fromDepartment.id, name: entry.fromDepartment.name }
        : null,
      toDepartment: entry.toDepartment
        ? { id: entry.toDepartment.id, name: entry.toDepartment.name }
        : null,
    }
  }

  private async emitAction(payload: DocumentActionEventPayload): Promise<void> {
    await emitter.emit('document:action', payload)
  }
}

export const routingService = new RoutingService()

declare module '@adonisjs/core/types' {
  interface EventsList {
    'document:action': DocumentActionEventPayload
  }
}
