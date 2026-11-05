import type { WorkflowConditionRule, WorkflowDocumentContext } from '#modules/documents/domain/workflows/workflow_types'

function resolveFieldValue(context: WorkflowDocumentContext, field: string): unknown {
  if (field === 'priority') return context.priority
  if (field === 'departmentId') return context.departmentId
  if (field === 'documentTypeId') return context.documentTypeId

  if (field.startsWith('metadata.')) {
    const key = field.slice('metadata.'.length)
    return context.metadata?.[key]
  }

  return context.metadata?.[field]
}

function compareValues(left: unknown, operator: WorkflowConditionRule['operator'], right: unknown): boolean {
  switch (operator) {
    case 'eq':
      return left === right
    case 'neq':
      return left !== right
    case 'gt':
      return Number(left) > Number(right)
    case 'gte':
      return Number(left) >= Number(right)
    case 'lt':
      return Number(left) < Number(right)
    case 'lte':
      return Number(left) <= Number(right)
    case 'in':
      return Array.isArray(right) ? right.includes(left) : false
    case 'contains':
      if (typeof left === 'string' && typeof right === 'string') {
        return left.toLowerCase().includes(right.toLowerCase())
      }
      if (Array.isArray(left)) {
        return left.includes(right)
      }
      return false
    default:
      return false
  }
}

export function evaluateCondition(
  rule: WorkflowConditionRule,
  context: WorkflowDocumentContext
): boolean {
  const left = resolveFieldValue(context, rule.field)
  return compareValues(left, rule.operator, rule.value)
}

export function evaluateConditions(
  rules: WorkflowConditionRule[] | undefined,
  context: WorkflowDocumentContext
): boolean {
  if (!rules || rules.length === 0) return true
  return rules.every((rule) => evaluateCondition(rule, context))
}
