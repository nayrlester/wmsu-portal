import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { t } from '#modules/finance/helpers/db_schema'
import ApprovalWorkflowDefinition from '#modules/finance/models/approval_workflow_definition'

type Actor = { id: string; organizationId: string }

export class ApprovalRuntimeService {
  async startInstance(actor: Actor, entityType: string, entityId: string, workflowCode?: string) {
    let workflow = workflowCode
      ? await ApprovalWorkflowDefinition.query()
          .where('organizationId', actor.organizationId)
          .where('code', workflowCode)
          .where('isActive', true)
          .preload('steps', (q) => q.orderBy('stepOrder', 'asc'))
          .first()
      : await ApprovalWorkflowDefinition.query()
          .where('organizationId', actor.organizationId)
          .where('entityType', entityType)
          .where('isActive', true)
          .preload('steps', (q) => q.orderBy('stepOrder', 'asc'))
          .first()

    if (!workflow || !workflow.steps.length) {
      return { autoApproved: true, status: 'approved' }
    }

    const [instance] = await db
      .table(t('approval_instances'))
      .insert({
        organization_id: actor.organizationId,
        workflow_id: workflow.id,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        current_step_order: workflow.steps[0].stepOrder,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*')

    for (const step of workflow.steps) {
      await db.table(t('approval_instance_steps')).insert({
        instance_id: instance.id,
        step_order: step.stepOrder,
        name: step.name,
        created_at: new Date(),
      })
    }

    return { autoApproved: false, instance, notification: `Approval pending for ${entityType}` }
  }

  async decideStep(actor: Actor, instanceId: string, decision: 'approved' | 'rejected') {
    const instance = await db.from(t('approval_instances')).where('id', instanceId).first()
    if (!instance || instance.organization_id !== actor.organizationId) {
      throw Object.assign(new Error('Approval instance not found'), { status: 404 })
    }

    await db
      .from(t('approval_instance_steps'))
      .where('instance_id', instanceId)
      .where('step_order', instance.current_step_order)
      .update({ decision, decided_by: actor.id, decided_at: new Date() })

    if (decision === 'rejected') {
      await db
        .from(t('approval_instances'))
        .where('id', instanceId)
        .update({ status: 'rejected', updated_at: new Date() })
      return { status: 'rejected' }
    }

    const next = await db
      .from(t('approval_instance_steps'))
      .where('instance_id', instanceId)
      .where('step_order', '>', instance.current_step_order)
      .orderBy('step_order', 'asc')
      .first()

    if (!next) {
      await db
        .from(t('approval_instances'))
        .where('id', instanceId)
        .update({ status: 'approved', updated_at: new Date() })
      return { status: 'approved' }
    }

    await db
      .from(t('approval_instances'))
      .where('id', instanceId)
      .update({ current_step_order: next.step_order, updated_at: new Date() })
    return { status: 'pending', currentStep: next.step_order }
  }
}

export const approvalRuntimeService = new ApprovalRuntimeService()
