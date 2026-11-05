import { DateTime } from 'luxon'
import type Document from '#modules/documents/models/document'
import type User from '#modules/documents/models/user'
import {
  ApprovalAction,
  DefaultRoleSlug,
  DocumentStatus,
  WorkflowStepType,
} from '#modules/documents/domain/enums/index'
import {
  buildWorkflowGraph,
  type WorkflowGraph,
} from '#modules/documents/domain/workflows/workflow_graph'
import {
  createInitialInstanceState,
  type WorkflowDefinition,
  type WorkflowDocumentContext,
  type WorkflowInstanceState,
} from '#modules/documents/domain/workflows/workflow_types'
import {
  ApprovalNotAllowedException,
  InvalidWorkflowStateException,
  WorkflowInstanceNotFoundException,
  WorkflowNotFoundException,
} from '#modules/documents/domain/workflows/workflow_exceptions'
import { workflowRepository } from '#infrastructure/repositories/workflow_repository'
import { workflowInstanceRepository } from '#infrastructure/repositories/workflow_instance_repository'
import { documentVersionRepository } from '#infrastructure/repositories/document_version_repository'
import { approvalRepository } from '#infrastructure/repositories/approval_repository'
import { documentRepository } from '#infrastructure/repositories/document_repository'
import { documentTypeRepository } from '#infrastructure/repositories/document_type_repository'
import { departmentRepository } from '#infrastructure/repositories/department_repository'
import { routingService } from '#modules/documents/services/routing_service'
import { documentNotificationService } from '#modules/documents/services/document_notification_service'
import { defaultWorkflowService } from '#modules/documents/services/default_workflow_service'
import { DocumentReferenceNotFoundException } from '#modules/documents/domain/documents/document_exceptions'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import DocumentType from '#modules/documents/models/document_type'

export class WorkflowEngineService {
  async startForDocument(
    document: Document,
    explicitWorkflowId?: string | null,
    versionId?: string | null
  ) {
    const tenantId = tenantContext.requireTenantId()
    if (versionId) {
      const existing = await workflowInstanceRepository.findActiveByVersion(document.id, versionId)
      if (existing) {
        throw new InvalidWorkflowStateException('This version already has an active workflow instance')
      }
    } else {
      const existing = await workflowInstanceRepository.findActiveByDocument(document.id)
      if (existing) {
        throw new InvalidWorkflowStateException('Document already has an active workflow instance')
      }
    }

    const workflowId = await this.resolveWorkflowId(document, explicitWorkflowId)
    if (!workflowId) {
      return null
    }

    const workflow = await workflowRepository.findPublishedById(workflowId)
    if (!workflow) {
      throw new InvalidWorkflowStateException('No published workflow is configured for this document')
    }

    const definition = workflow.definition as unknown as WorkflowDefinition
    const graph = buildWorkflowGraph(definition)
    const entryNodeId = graph.getEntryNodeId()

    if (!graph.nodeConditionsMet(entryNodeId, this.buildDocumentContext(document))) {
      throw new InvalidWorkflowStateException('Document does not satisfy entry step conditions')
    }

    const activeNodeIds = graph.expandActivationTargets([entryNodeId])
    const state = createInitialInstanceState(entryNodeId)
    state.activeNodeIds = activeNodeIds
    this.initializeParallelGroups(graph, state, activeNodeIds)

    const instance = await workflowInstanceRepository.create({
      tenantId,
      documentId: document.id,
      workflowId: workflow.id,
      versionId: versionId ?? null,
      currentNodeId: activeNodeIds[0] ?? entryNodeId,
      state,
    })

    const nextStatus = this.resolveDocumentStatus(
      graph,
      activeNodeIds[0] ?? entryNodeId,
      DocumentStatus.PENDING_APPROVAL
    )
    document.currentWorkflowId = workflow.id
    document.status = nextStatus
    await documentRepository.save(document)

    if (versionId) {
      await this.updateVersionStatus(document.id, versionId, nextStatus)
    }

    await documentNotificationService.notifyWorkflowStepAssignees(document, graph, activeNodeIds)

    return instance
  }

  async getActiveInstance(documentId: string) {
    const instance = await workflowInstanceRepository.findActiveByDocument(documentId)
    if (!instance) {
      throw new WorkflowInstanceNotFoundException('No active workflow instance for this document')
    }
    return instance
  }

  async getDocumentWorkflowState(documentId: string, user?: User) {
    const document = user ? await documentRepository.findByIdOrFail(documentId, user.id) : null
    const instances = await workflowInstanceRepository.findAllActiveByDocument(documentId)
    if (instances.length === 0) {
      const canCurrentUserAct = user
        ? await user.hasPermission('documents.approve', tenantContext.requireTenantId())
        : false
      return { active: false, canCurrentUserAct, instance: null, versionWorkflows: [] }
    }

    const versionWorkflows = await Promise.all(
      instances.map(async (instance) => ({
        versionId: instance.versionId,
        canCurrentUserAct:
          user && document
            ? await this.canUserActOnInstance(instance, user, document)
            : false,
        instance: this.serializeWorkflowInstance(instance),
      }))
    )

    const canCurrentUserAct = versionWorkflows.some((entry) => entry.canCurrentUserAct)

    return {
      active: true,
      canCurrentUserAct,
      instance: versionWorkflows[0]?.instance ?? null,
      versionWorkflows,
    }
  }

  async processApprovalAction(
    documentId: string,
    user: User,
    action: ApprovalAction,
    comments?: string | null,
    stepNodeId?: string | null,
    toUserId?: string | null,
    versionId?: string | null
  ) {
    const canApprove = await user.hasPermission('documents.approve', tenantContext.requireTenantId())
    if (!canApprove) {
      throw new ApprovalNotAllowedException('You do not have permission to approve documents')
    }

    const document = await documentRepository.findByIdOrFail(documentId, user.id)
    const instance = versionId
      ? await this.resolveActiveInstanceForVersion(documentId, versionId)
      : await this.resolveActiveInstanceForApproval(document, user)

    const definition = instance.workflow.definition as unknown as WorkflowDefinition
    const graph = buildWorkflowGraph(definition)
    const state = instance.state ?? createInitialInstanceState(graph.getEntryNodeId())
    const targetNodeId = stepNodeId ?? state.activeNodeIds[0]

    if (!targetNodeId || !state.activeNodeIds.includes(targetNodeId)) {
      throw new ApprovalNotAllowedException('No active workflow step is awaiting your action')
    }

    const node = graph.getNode(targetNodeId)
    if (!node) {
      throw new ApprovalNotAllowedException('Workflow step not found')
    }

    const allowed = await this.canUserActOnNode(user, node.assignee ?? {}, document)
    if (!allowed) {
      throw new ApprovalNotAllowedException('You are not assigned to this workflow step')
    }

    if (action === ApprovalAction.APPROVE) {
      return this.handleApprove(document, instance, graph, state, targetNodeId, user.id, comments ?? null)
    }

    if (action === ApprovalAction.REJECT) {
      return this.handleReject(document, instance, targetNodeId, user.id, comments ?? null)
    }

    if (action === ApprovalAction.RETURN) {
      return this.handleReturn(document, instance, targetNodeId, user.id, comments ?? null)
    }

    if (action === ApprovalAction.FORWARD) {
      if (!toUserId) {
        throw new ApprovalNotAllowedException('Forward requires a target user')
      }
      return this.handleForward(document, instance, targetNodeId, user.id, toUserId, comments ?? null)
    }

    throw new ApprovalNotAllowedException(`Unsupported action: ${action}`)
  }

  private async handleApprove(
    document: Document,
    instance: Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>,
    graph: WorkflowGraph,
    state: WorkflowInstanceState,
    nodeId: string,
    userId: string,
    comments: string | null
  ) {
    if (!instance) throw new WorkflowInstanceNotFoundException()

    const alreadyApproved = await approvalRepository.hasApprovedStep(
      document.id,
      instance.id,
      nodeId,
      userId
    )
    if (alreadyApproved) {
      throw new ApprovalNotAllowedException('You have already approved this step')
    }

    await approvalRepository.create({
      tenantId: document.tenantId,
      documentId: document.id,
      workflowInstanceId: instance.id,
      approverId: userId,
      action: ApprovalAction.APPROVE,
      comments,
      stepNodeId: nodeId,
    })

    state.history.push({
      nodeId,
      action: ApprovalAction.APPROVE,
      userId,
      at: DateTime.now().toISO(),
    })

    state.activeNodeIds = state.activeNodeIds.filter((id) => id !== nodeId)
    if (!state.completedNodeIds.includes(nodeId)) {
      state.completedNodeIds.push(nodeId)
    }

    const node = graph.getNode(nodeId)
    if (node?.type === WorkflowStepType.PARALLEL && node.parallelGroupId) {
      const groupNodeIds = graph.getParallelGroupNodeIds(node.parallelGroupId)
      const groupComplete = groupNodeIds.every((id) => state.completedNodeIds.includes(id))
      if (!groupComplete) {
        instance.state = state
        instance.currentNodeId = state.activeNodeIds[0] ?? null
        await workflowInstanceRepository.save(instance)

        await this.trackRoutingAction(document, instance.id, ApprovalAction.APPROVE, userId, comments, null, nodeId)

        return { document, instance, completed: false }
      }
    }

    const context = this.buildDocumentContext(document)
    const nextTargets = graph.resolveNextNodeIds(nodeId, context, state.activeNodeIds)
    const activationTargets = graph.expandActivationTargets(nextTargets)

    if (activationTargets.length === 0 || activationTargets.every((id) => graph.isEndNode(id))) {
      await workflowInstanceRepository.complete(instance)
      document.status = DocumentStatus.APPROVED
      await documentRepository.save(document)
      if (instance.versionId) {
        await this.updateVersionStatus(document.id, instance.versionId, DocumentStatus.APPROVED)
        await documentVersionRepository.promoteApprovedBaseline(document.id, instance.versionId)
      }

      await this.trackRoutingAction(document, instance.id, ApprovalAction.APPROVE, userId, comments, null, nodeId, {
        workflowCompleted: true,
      })

      return { document: await documentRepository.findByIdOrFail(document.id), instance, completed: true }
    }

    state.activeNodeIds = activationTargets
    this.initializeParallelGroups(graph, state, activationTargets)
    instance.state = state
    instance.currentNodeId = activationTargets[0] ?? null
    document.status = this.resolveDocumentStatus(graph, activationTargets[0]!, DocumentStatus.PENDING_APPROVAL)
    await workflowInstanceRepository.save(instance)
    await documentRepository.save(document)
    if (instance.versionId) {
      await this.updateVersionStatus(document.id, instance.versionId, document.status)
    }

    await this.trackRoutingAction(document, instance.id, ApprovalAction.APPROVE, userId, comments, null, nodeId)

    await documentNotificationService.notifyWorkflowStepAssignees(
      document,
      graph,
      activationTargets
    )

    return { document: await documentRepository.findByIdOrFail(document.id), instance, completed: false }
  }

  private async handleReject(
    document: Document,
    instance: NonNullable<Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>>,
    nodeId: string,
    userId: string,
    comments: string | null
  ) {
    await approvalRepository.create({
      tenantId: document.tenantId,
      documentId: document.id,
      workflowInstanceId: instance.id,
      approverId: userId,
      action: ApprovalAction.REJECT,
      comments,
      stepNodeId: nodeId,
    })

    await workflowInstanceRepository.cancel(instance, ApprovalAction.REJECT)
    document.status = DocumentStatus.REJECTED
    await documentRepository.save(document)
    if (instance.versionId) {
      await this.updateVersionStatus(document.id, instance.versionId, DocumentStatus.REJECTED)
    }

    await this.trackRoutingAction(document, instance.id, ApprovalAction.REJECT, userId, comments, null, nodeId)

    return { document: await documentRepository.findByIdOrFail(document.id), instance, completed: true }
  }

  private async handleReturn(
    document: Document,
    instance: NonNullable<Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>>,
    nodeId: string,
    userId: string,
    comments: string | null
  ) {
    await approvalRepository.create({
      tenantId: document.tenantId,
      documentId: document.id,
      workflowInstanceId: instance.id,
      approverId: userId,
      action: ApprovalAction.RETURN,
      comments,
      stepNodeId: nodeId,
    })

    await workflowInstanceRepository.cancel(instance, ApprovalAction.RETURN)
    document.status = DocumentStatus.RETURNED
    await documentRepository.save(document)
    if (instance.versionId) {
      await this.updateVersionStatus(document.id, instance.versionId, DocumentStatus.RETURNED)
    }

    await this.trackRoutingAction(
      document,
      instance.id,
      ApprovalAction.RETURN,
      userId,
      comments ?? 'Document returned for revision',
      null,
      nodeId
    )

    return { document: await documentRepository.findByIdOrFail(document.id), instance, completed: true }
  }

  private async handleForward(
    document: Document,
    instance: NonNullable<Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>>,
    nodeId: string,
    userId: string,
    toUserId: string,
    comments: string | null
  ) {
    await approvalRepository.create({
      tenantId: document.tenantId,
      documentId: document.id,
      workflowInstanceId: instance.id,
      approverId: userId,
      action: ApprovalAction.FORWARD,
      comments,
      stepNodeId: nodeId,
    })

    document.assignedToId = toUserId
    document.status = DocumentStatus.PENDING_APPROVAL
    await documentRepository.save(document)

    await this.trackRoutingAction(
      document,
      instance.id,
      ApprovalAction.FORWARD,
      userId,
      comments ?? 'Document forwarded for review',
      toUserId,
      nodeId
    )

    return { document: await documentRepository.findByIdOrFail(document.id), instance, completed: false }
  }

  private async trackRoutingAction(
    document: Document,
    workflowInstanceId: string,
    action: ApprovalAction,
    fromUserId: string,
    remarks: string | null,
    toUserId: string | null,
    stepNodeId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await routingService.record({
      tenantId: document.tenantId,
      documentId: document.id,
      action,
      fromUserId,
      toUserId,
      remarks,
      stepNodeId,
      workflowInstanceId,
      metadata: metadata ?? null,
    })
  }

  private async resolveWorkflowId(document: Document, explicitWorkflowId?: string | null): Promise<string | null> {
    if (explicitWorkflowId) return explicitWorkflowId
    if (document.currentWorkflowId) return document.currentWorkflowId

    if (document.documentTypeId) {
      const documentType = await documentTypeRepository.findInTenant(document.documentTypeId)
      if (documentType?.defaultWorkflowId) {
        return documentType.defaultWorkflowId
      }
    }

    const fallback = await workflowRepository.findFirstPublishedForTenant(document.tenantId)
    return fallback?.id ?? null
  }

  private buildDocumentContext(document: Document): WorkflowDocumentContext {
    return {
      priority: document.priority,
      departmentId: document.departmentId,
      documentTypeId: document.documentTypeId,
      metadata: document.metadata,
    }
  }

  private initializeParallelGroups(
    graph: WorkflowGraph,
    state: WorkflowInstanceState,
    activeNodeIds: string[]
  ): void {
    for (const nodeId of activeNodeIds) {
      const node = graph.getNode(nodeId)
      if (node?.parallelGroupId) {
        const groupNodeIds = graph.getParallelGroupNodeIds(node.parallelGroupId)
        state.parallelGroups[node.parallelGroupId] = {
          nodeIds: groupNodeIds,
          completedNodeIds: groupNodeIds.filter((id) => state.completedNodeIds.includes(id)),
        }
      }
    }
  }

  private resolveDocumentStatus(
    graph: WorkflowGraph,
    nodeId: string,
    fallback: DocumentStatus
  ): DocumentStatus {
    const node = graph.getNode(nodeId)
    const configured = node?.targetDocumentStatus
    if (configured && Object.values(DocumentStatus).includes(configured as DocumentStatus)) {
      return configured as DocumentStatus
    }
    return fallback
  }

  async canUserActOnNode(
    user: User,
    assignee: { roleId?: string; userId?: string; departmentId?: string },
    document: Document
  ): Promise<boolean> {
    if (assignee.userId && assignee.userId === user.id) return true

    await user.load('roles', (query) => {
      query.wherePivot('tenant_id', document.tenantId)
    })

    const canApprove = await user.hasPermission('documents.approve', document.tenantId)
    if (!canApprove) return false

    const orgApprovalRoleSlugs = new Set<string>([
      DefaultRoleSlug.TENANT_OWNER,
      DefaultRoleSlug.ADMIN,
      DefaultRoleSlug.MANAGER,
      DefaultRoleSlug.APPROVER,
    ])

    const isOrgApprovalActor = user.roles.some((role) => orgApprovalRoleSlugs.has(role.slug))
    if (isOrgApprovalActor) return true

    if (assignee.roleId) {
      return user.roles.some((role) => role.id === assignee.roleId)
    }

    if (assignee.departmentId) {
      if (document.departmentId !== assignee.departmentId) return false
      const department = await departmentRepository.findInTenant(assignee.departmentId)
      return department?.headUserId === user.id
    }

    return false
  }

  private async updateVersionStatus(documentId: string, versionId: string, status: string) {
    const version = await documentVersionRepository.findById(documentId, versionId)
    if (!version) return
    version.status = status
    await version.save()
  }

  private async resolveActiveInstanceForApproval(document: Document, user: User) {
    const existing = await workflowInstanceRepository.findActiveByDocument(document.id)
    if (existing) return existing

    await defaultWorkflowService.ensureWorkflowReady(document.tenantId, user.id)
    await this.startForDocument(document)

    const instance = await workflowInstanceRepository.findActiveByDocument(document.id)
    if (!instance) {
      throw new WorkflowInstanceNotFoundException('No active workflow instance for this document')
    }

    return instance
  }

  private async resolveActiveInstanceForVersion(documentId: string, versionId: string) {
    const instance = await workflowInstanceRepository.findActiveByVersion(documentId, versionId)
    if (!instance) {
      throw new WorkflowInstanceNotFoundException('No active workflow instance for this version')
    }

    return instance
  }

  private async canUserActOnInstance(
    instance: NonNullable<Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>>,
    user: User,
    document: Document
  ): Promise<boolean> {
    const canApprove = await user.hasPermission('documents.approve', document.tenantId)
    if (!canApprove) return false

    const definition = instance.workflow.definition as unknown as WorkflowDefinition
    const graph = buildWorkflowGraph(definition)

    for (const nodeId of instance.state?.activeNodeIds ?? []) {
      const node = graph.getNode(nodeId)
      if (node && (await this.canUserActOnNode(user, node.assignee ?? {}, document))) {
        return true
      }
    }

    return false
  }

  private serializeWorkflowInstance(
    instance: NonNullable<Awaited<ReturnType<typeof workflowInstanceRepository.findActiveByDocument>>>
  ) {
    const definition = instance.workflow.definition as unknown as WorkflowDefinition
    const graph = buildWorkflowGraph(definition)

    return {
      id: instance.id,
      workflowId: instance.workflowId,
      versionId: instance.versionId,
      status: instance.status,
      currentNodeId: instance.currentNodeId,
      activeNodeIds: instance.state?.activeNodeIds ?? [],
      completedNodeIds: instance.state?.completedNodeIds ?? [],
      steps: (instance.state?.activeNodeIds ?? []).map((nodeId) => {
        const node = graph.getNode(nodeId)
        return node
          ? {
              nodeId: node.id,
              name: node.name,
              type: node.type,
              assignee: node.assignee ?? null,
            }
          : { nodeId, name: nodeId, type: 'unknown', assignee: null }
      }),
    }
  }

  async assignWorkflowToDocumentType(documentTypeId: string, workflowId: string): Promise<DocumentType> {
    const documentType = await documentTypeRepository.findInTenant(documentTypeId)
    if (!documentType) {
      throw new DocumentReferenceNotFoundException('Document type not found in this organization')
    }

    const workflow = await workflowRepository.findPublishedById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundException('Published workflow not found')
    }

    documentType.defaultWorkflowId = workflow.id
    await documentType.save()
    return documentType
  }
}

export const workflowEngineService = new WorkflowEngineService()
