/**
 * TOR VI.E.4 DMS-025 named roles and their mapping onto existing DocsTrack permission slugs.
 * Does not invent confidentiality policies — levels already exist in DocumentConfidentiality.
 */
export const UDMS_TOR_ROLES = [
  {
    slug: 'tor_administrator',
    torName: 'Administrator',
    description: 'TOR DMS-025 Administrator — UDMS administration and configuration',
    permissionSlugs: '*' as const,
  },
  {
    slug: 'tor_records_manager',
    torName: 'Records Manager',
    description: 'TOR DMS-025 Records Manager — records operations, retention, release, archives',
    permissionSlugs: [
      'documents.view',
      'documents.create',
      'documents.update',
      'documents.download',
      'documents.approve',
      'workflows.manage',
      'reports.view',
      'audit.view',
      'settings.manage',
      'records.retention.manage',
      'records.restricted.view',
      'records.restricted.download',
      'records.request.create',
      'records.release.manage',
      'records.receiving.manage',
      'records.archives.manage',
    ] as const,
  },
  {
    slug: 'tor_digitization_officer',
    torName: 'Digitization Officer',
    description: 'TOR DMS-025 Digitization Officer — tracked by batch ID (DMS-025)',
    permissionSlugs: [
      'documents.view',
      'documents.create',
      'documents.update',
      'documents.download',
      'records.digitization.manage',
      'records.receiving.manage',
      'audit.view',
    ] as const,
  },
  {
    slug: 'tor_department_reviewer',
    torName: 'Department Reviewer',
    description: 'TOR DMS-025 Department Reviewer — time-to-approval metrics (DMS-025)',
    permissionSlugs: [
      'documents.view',
      'documents.download',
      'documents.approve',
      'audit.view',
    ] as const,
  },
  {
    slug: 'tor_standard_user',
    torName: 'Standard User (Employee)',
    description: 'TOR DMS-025 Standard User — ESS personal records (DMS-023)',
    permissionSlugs: ['documents.view', 'records.request.create'] as const,
  },
  {
    slug: 'tor_auditor',
    torName: 'Auditor',
    description: 'TOR DMS-025 Auditor — audit and compliance review',
    permissionSlugs: [
      'documents.view',
      'reports.view',
      'audit.view',
      'records.restricted.view',
    ] as const,
  },
] as const

export type UdmsTorRoleSlug = (typeof UDMS_TOR_ROLES)[number]['slug']
