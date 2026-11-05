export const SECONDARY_BACKGROUNDS = [
  'shs_academic',
  'shs_other',
  'not_shs',
  'undecided',
] as const

export type SecondaryBackground = (typeof SECONDARY_BACKGROUNDS)[number]

export const ACADEMIC_STRANDS = ['ABM', 'STEM', 'HUMSS', 'GAS'] as const
export type AcademicStrand = (typeof ACADEMIC_STRANDS)[number]

export const ACADEMIC_STRAND_INFO: Record<
  AcademicStrand,
  { name: string; forStudents: string; interests: string[] }
> = {
  ABM: {
    name: 'Accountancy, Business, and Management',
    forStudents: 'Students interested in business, finance, and management pathways',
    interests: [
      'Accountancy and Finance',
      'Business Administration',
      'Entrepreneurship',
      'Marketing and Management',
    ],
  },
  STEM: {
    name: 'Science, Technology, Engineering, and Mathematics',
    forStudents: 'Students interested in science, engineering, health, and computing',
    interests: [
      'Engineering',
      'Medicine and Nursing',
      'Information Technology',
      'Computer Science',
      'Architecture',
    ],
  },
  HUMSS: {
    name: 'Humanities and Social Sciences',
    forStudents: 'Students interested in people, society, communication, and law',
    interests: [
      'Psychology',
      'Political Science',
      'Education',
      'Communication',
      'Law',
      'Journalism',
    ],
  },
  GAS: {
    name: 'General Academic Strand',
    forStudents: 'Students who are undecided or want broader academic exposure',
    interests: [
      'Still exploring college courses',
      'Exposure across academic fields',
      'General academic preparation',
    ],
  },
}

const STRAND_PROGRAM_KEYWORDS: Record<AcademicStrand, string[]> = {
  ABM: [
    'accountancy',
    'accounting',
    'bsa',
    'business',
    'bsba',
    'management',
    'entrepreneur',
    'marketing',
    'finance',
    'economics',
    'hospitality',
    'tourism',
  ],
  STEM: [
    'information technology',
    'bsit',
    'computer',
    'bscs',
    'engineering',
    'architecture',
    'nursing',
    'medicine',
    'biology',
    'chemistry',
    'physics',
    'mathematics',
    'science',
    'agriculture',
    'fisheries',
  ],
  HUMSS: [
    'psychology',
    'political',
    'education',
    'beed',
    'bsed',
    'communication',
    'journalism',
    'law',
    'criminology',
    'social work',
    'public administration',
    'history',
    'philosophy',
    'english',
  ],
  GAS: [],
}

export function normalizeSecondaryBackground(value: unknown): SecondaryBackground | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return (SECONDARY_BACKGROUNDS as readonly string[]).includes(v)
    ? (v as SecondaryBackground)
    : null
}

export function normalizeAcademicStrand(value: unknown): AcademicStrand | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toUpperCase()
  return (ACADEMIC_STRANDS as readonly string[]).includes(v) ? (v as AcademicStrand) : null
}

export type ExamStrandScores = Record<AcademicStrand, { correct: number; total: number; percent: number }>

export function scoreExamStrandSuggestion(
  questions: Array<{ strandTag?: string | null; correctIndex: number; id: string }>,
  answers: Record<string, number>
) {
  const scores: ExamStrandScores = {
    ABM: { correct: 0, total: 0, percent: 0 },
    STEM: { correct: 0, total: 0, percent: 0 },
    HUMSS: { correct: 0, total: 0, percent: 0 },
    GAS: { correct: 0, total: 0, percent: 0 },
  }

  for (const q of questions) {
    const tag = String(q.strandTag || 'general').toUpperCase()
    if (!(ACADEMIC_STRANDS as readonly string[]).includes(tag)) continue
    const strand = tag as AcademicStrand
    scores[strand].total += 1
    if (Number(answers[q.id]) === q.correctIndex) scores[strand].correct += 1
  }

  for (const strand of ACADEMIC_STRANDS) {
    const row = scores[strand]
    row.percent = row.total === 0 ? 0 : Math.round((row.correct / row.total) * 10000) / 100
  }

  const ranked = [...ACADEMIC_STRANDS]
    .filter((s) => scores[s].total > 0)
    .sort((a, b) => {
      if (scores[b].percent !== scores[a].percent) return scores[b].percent - scores[a].percent
      if (scores[b].correct !== scores[a].correct) return scores[b].correct - scores[a].correct
      return scores[b].total - scores[a].total
    })

  const suggestedStrand = ranked[0] ?? null
  return { strandScores: scores, suggestedStrand, rankedStrands: ranked }
}

export function buildProgramGuidance(input: {
  secondaryBackground: SecondaryBackground | null
  academicStrand: AcademicStrand | null
  examSuggestedStrand?: AcademicStrand | null
  programs: Array<{ id: string; code: string; name: string }>
}) {
  const background = input.secondaryBackground
  const declaredStrand = background === 'shs_academic' ? input.academicStrand : null
  const strand = declaredStrand || input.examSuggestedStrand || null
  const strandSource = declaredStrand
    ? 'declared_shs'
    : input.examSuggestedStrand
      ? 'exam_suggestion'
      : null

  const strandInfo = strand ? ACADEMIC_STRAND_INFO[strand] : null
  const keywords = strand ? STRAND_PROGRAM_KEYWORDS[strand] : []

  const matched = input.programs.filter((p) => {
    if (!strand || strand === 'GAS' || keywords.length === 0) return false
    const hay = `${p.code} ${p.name}`.toLowerCase()
    return keywords.some((k) => hay.includes(k))
  })

  const openBrowse =
    strand === 'GAS' ||
    background === 'not_shs' ||
    background === 'undecided' ||
    background === 'shs_other' ||
    !strand

  const suggestedPrograms =
    openBrowse && matched.length === 0
      ? input.programs.slice(0, 12)
      : matched.length > 0
        ? matched
        : input.programs.slice(0, 12)

  let guidanceNote =
    'Select your secondary background or take the entrance exam to personalize program suggestions.'
  if (strandSource === 'exam_suggestion' && strand) {
    guidanceNote = `Entrance exam performance suggests ${strand} (${ACADEMIC_STRAND_INFO[strand].name}). Program matches below are advisory — Admissions/college confirms eligibility.`
  } else if (background === 'not_shs') {
    guidanceNote =
      'You indicated a non-SHS secondary background. Browse all active programs — SHS strand filters do not apply unless the exam suggests one.'
  } else if (background === 'shs_other') {
    guidanceNote =
      'You indicated an SHS track outside Academic (e.g. TVL). Suggestions show active programs; confirm fit with Admissions/college.'
  } else if (background === 'undecided' && !strand) {
    guidanceNote = 'No SHS strand on file. Showing active programs so you can explore options.'
  } else if (strand === 'GAS') {
    guidanceNote =
      'GAS is intentionally broad. Review active programs and pick based on your interests.'
  } else if (strand) {
    guidanceNote = `Suggested programs are matched by keywords related to ${strand}. Final eligibility is set by Admissions/college policy.`
  }

  return {
    secondaryBackground: background,
    academicStrand: declaredStrand,
    examSuggestedStrand: input.examSuggestedStrand ?? null,
    strandSource,
    strandName: strandInfo?.name ?? null,
    forStudents: strandInfo?.forStudents ?? null,
    interests: strandInfo?.interests ?? [],
    guidanceNote,
    suggestedPrograms: suggestedPrograms.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      matchedToStrand: matched.some((m) => m.id === p.id),
    })),
    allProgramsCount: input.programs.length,
  }
}
