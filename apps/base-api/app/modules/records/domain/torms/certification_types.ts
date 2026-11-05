/**
 * TOR-named certification types only (TOR-009, TOR-022).
 * Complete campus catalog beyond these examples remains FC #8.
 */
export const TOR_CERTIFICATION_TYPES = [
  {
    code: 'enrollment',
    officialName: 'Certificate of Enrollment',
    description: 'Certification of enrollment status (TOR-009 example).',
    internationalCapable: false,
    academicFocus: 'enrollment',
  },
  {
    code: 'graduation',
    officialName: 'Certificate of Graduation',
    description: 'Certification of graduation (TOR-009 example).',
    internationalCapable: false,
    academicFocus: 'graduation',
  },
  {
    code: 'gwa',
    officialName: 'Certificate of GWA',
    description: 'Certification of general weighted average (TOR-009 example).',
    internationalCapable: false,
    academicFocus: 'gwa',
  },
  {
    code: 'units_earned',
    officialName: 'Certificate of Units Earned',
    description: 'Certification of units earned (TOR-009 example).',
    internationalCapable: false,
    academicFocus: 'units',
  },
  {
    code: 'cav',
    officialName: 'Certification, Authentication and Verification (CAV)',
    description: 'CAV and related international academic credential processing (TOR-009/022).',
    internationalCapable: true,
    academicFocus: 'full',
  },
  {
    code: 'authentication',
    officialName: 'Authentication',
    description: 'Authentication of academic credentials (TOR-022 foreign/international example).',
    internationalCapable: true,
    academicFocus: 'full',
  },
  {
    code: 'apostille_ready',
    officialName: 'Apostille-ready / International Academic Credential',
    description:
      'Apostille-ready and other international academic credentials named in TOR-022.',
    internationalCapable: true,
    academicFocus: 'full',
  },
] as const

export type CertificationTypeCode = (typeof TOR_CERTIFICATION_TYPES)[number]['code']

export function isCertificationTypeCode(value: string): value is CertificationTypeCode {
  return TOR_CERTIFICATION_TYPES.some((t) => t.code === value)
}

export function getCertificationTypeDef(code: string) {
  return TOR_CERTIFICATION_TYPES.find((t) => t.code === code) ?? null
}
