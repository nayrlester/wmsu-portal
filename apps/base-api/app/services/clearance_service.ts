import { randomUUID } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { IntegrationError } from '#services/integration_envelope'
import { writePlatformAudit } from '#services/platform_audit_service'
import { publishDomainEvent } from '#services/domain_event_service'

export const CLEARANCE_STATUSES = ['Cleared', 'With Deficiency', 'Conditionally Cleared'] as const
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number]

function isStatus(value: string): value is ClearanceStatus {
  return (CLEARANCE_STATUSES as readonly string[]).includes(value)
}

export async function listRequirementTypes() {
  return db.from('cis_clearance_requirement_types').orderBy('office_code', 'asc').orderBy('code', 'asc')
}

export async function upsertClearanceRequirement(input: {
  requirementTypeCode: string
  subjectType?: string
  subjectKey: string
  status: string
  severityLevel?: string | null
  notes?: string | null
  sourceSystem: string
  idempotencyKey: string
  actorId?: string | null
}) {
  if (!isStatus(input.status)) {
    throw new IntegrationError('Invalid clearance status', 422, [
      {
        field: 'status',
        message: `Must be one of: ${CLEARANCE_STATUSES.join(', ')}`,
      },
    ])
  }

  const typeRow = await db
    .from('cis_clearance_requirement_types')
    .where('code', input.requirementTypeCode)
    .first()
  if (!typeRow || !typeRow.is_active) {
    throw new IntegrationError('Unknown or inactive clearance requirement type', 422, [
      { field: 'requirementTypeCode', message: 'invalid' },
    ])
  }

  if (typeRow.requires_university_approval && typeRow.policy_status !== 'approved') {
    throw new IntegrationError(
      'Clearance requirement type policy requires university approval before use',
      409,
      [
        {
          field: 'requirementTypeCode',
          message: `policy_status=${typeRow.policy_status}`,
        },
      ]
    )
  }

  const existing = await db
    .from('cis_clearance_requirements')
    .where('idempotency_key', input.idempotencyKey)
    .first()
  if (existing) {
    return { requirement: existing, deduplicated: true as const }
  }

  const now = new Date()
  const row = {
    id: randomUUID(),
    requirement_type_id: typeRow.id,
    subject_type: input.subjectType ?? 'student',
    subject_key: input.subjectKey,
    status: input.status,
    severity_level: input.severityLevel ?? null,
    notes: input.notes ?? null,
    source_system: input.sourceSystem,
    idempotency_key: input.idempotencyKey,
    effective_at: now,
    resolved_at: input.status === 'Cleared' ? now : null,
    created_at: now,
    updated_at: now,
  }
  await db.table('cis_clearance_requirements').insert(row)
  await writePlatformAudit({
    actorId: input.actorId ?? null,
    action: 'clearance.requirement.upsert',
    entityType: 'cis_clearance_requirements',
    entityId: row.id,
    afterData: row,
  })

  const evaluation = await evaluateClearance(row.subject_type, row.subject_key)
  await publishDomainEvent({
    eventType: 'clearance.requirement.updated',
    aggregateType: 'clearance_subject',
    aggregateId: `${row.subject_type}:${row.subject_key}`,
    idempotencyKey: `clearance.requirement.updated:${input.idempotencyKey}`,
    payload: {
      subjectType: row.subject_type,
      subjectKey: row.subject_key,
      requirementId: row.id,
      status: row.status,
      overallStatus: evaluation.overallStatus,
    },
    actorId: input.actorId,
  })

  return { requirement: row, evaluation, deduplicated: false as const }
}

export async function evaluateClearance(subjectType: string, subjectKey: string) {
  const rows = await db
    .from('cis_clearance_requirements as r')
    .join('cis_clearance_requirement_types as t', 't.id', 'r.requirement_type_id')
    .where({ 'r.subject_type': subjectType, 'r.subject_key': subjectKey })
    .select(
      'r.id',
      'r.status',
      'r.notes',
      'r.source_system',
      'r.updated_at',
      't.code as type_code',
      't.name as type_name',
      't.office_code',
      't.requires_university_approval',
      't.policy_status'
    )
    .orderBy('r.updated_at', 'desc')

  const latestByType = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (!latestByType.has(row.type_code)) latestByType.set(row.type_code, row)
  }
  const latest = [...latestByType.values()]

  let overallStatus: ClearanceStatus = 'Cleared'
  if (latest.some((r) => r.status === 'With Deficiency')) {
    overallStatus = 'With Deficiency'
  } else if (latest.some((r) => r.status === 'Conditionally Cleared')) {
    overallStatus = 'Conditionally Cleared'
  } else if (latest.length === 0) {
    overallStatus = 'Cleared'
  }

  const breakdown = latest.map((r) => ({
    requirementId: r.id,
    typeCode: r.type_code,
    typeName: r.type_name,
    officeCode: r.office_code,
    status: r.status,
    sourceSystem: r.source_system,
    requiresUniversityApproval: r.requires_university_approval,
    policyStatus: r.policy_status,
    notes: r.notes,
  }))

  const breakdownJson = JSON.stringify(breakdown)
  const evaluatedAt = new Date()

  const existing = await db
    .from('cis_clearance_snapshots')
    .where({ subject_type: subjectType, subject_key: subjectKey })
    .first()
  if (existing) {
    await db
      .from('cis_clearance_snapshots')
      .where('id', existing.id)
      .update({
        overall_status: overallStatus,
        breakdown: breakdownJson,
        evaluated_at: evaluatedAt,
      })
  } else {
    await db.table('cis_clearance_snapshots').insert({
      id: randomUUID(),
      subject_type: subjectType,
      subject_key: subjectKey,
      overall_status: overallStatus,
      breakdown: breakdownJson,
      evaluated_at: evaluatedAt,
      created_at: new Date(),
    })
  }

  return {
    subjectType,
    subjectKey,
    overallStatus,
    breakdown,
    evaluatedAt,
    note:
      'Clearance policies are configurable. Types marked pending_university_approval cannot accept live requirements until WMSU approves them.',
  }
}
