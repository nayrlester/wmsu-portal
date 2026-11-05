import { academicPoliciesService } from '#modules/enrollment/services/academic_policies_service'
import type { GradeDisplayMode } from '#modules/enrollment/models/usis_academic_policy'

export async function resolveStudentGradeStatuses(organizationId: string): Promise<string[] | null> {
  const policy = await academicPoliciesService.getOrCreate(organizationId)
  return gradeDisplayModeToStatuses(policy.gradeDisplayMode)
}

export function gradeDisplayModeToStatuses(mode: GradeDisplayMode): string[] | null {
  if (mode === 'immediate') return null
  if (mode === 'manual_release') return ['locked']
  return ['submitted', 'locked']
}

export async function resolveEnrollmentApprovalSteps(organizationId: string) {
  const policy = await academicPoliciesService.getOrCreate(organizationId)
  return [...policy.enrollmentApprovalSteps]
}
