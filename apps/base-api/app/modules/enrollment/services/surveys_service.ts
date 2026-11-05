import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import UsisSurvey, { type SurveyQuestion } from '#modules/enrollment/models/usis_survey'
import UsisSurveyResponse, { type SurveyAnswers } from '#modules/enrollment/models/usis_survey_response'
import type { AnnouncementAudience } from '#modules/enrollment/models/usis_announcement'
import Student from '#modules/enrollment/models/student'
import { EnrollmentWorkflowError } from '#modules/enrollment/domain/enrollment_workflow'
import { auditLogService } from '#modules/enrollment/services/audit_log_service'
import { AuditAction } from '#modules/enrollment/domain/enums/index'
import { audienceMatches, type FeedContext } from '#modules/enrollment/services/announcements_service'

function normalizeQuestions(raw: SurveyQuestion[] | undefined, kind: string): SurveyQuestion[] {
  const list = raw ?? []
  if (!list.length) {
    throw new EnrollmentWorkflowError('At least one question is required', 422, 'SURVEY_EMPTY')
  }
  return list.map((q, idx) => {
    const id = q.id?.trim() || randomUUID()
    const prompt = String(q.prompt ?? '').trim()
    if (prompt.length < 2) {
      throw new EnrollmentWorkflowError(`Question ${idx + 1} prompt is required`, 422, 'INVALID_QUESTION')
    }
    const questionType = q.questionType ?? (kind === 'poll' ? 'single' : 'text')
    if (!['single', 'multi', 'text', 'likert'].includes(questionType)) {
      throw new EnrollmentWorkflowError(`Invalid question type for question ${idx + 1}`, 422, 'INVALID_QUESTION_TYPE')
    }
    if ((questionType === 'single' || questionType === 'multi') && !(q.options?.length)) {
      throw new EnrollmentWorkflowError(`Options required for question ${idx + 1}`, 422, 'OPTIONS_REQUIRED')
    }
    return {
      id,
      prompt,
      questionType: questionType as SurveyQuestion['questionType'],
      options: q.options?.map((o) => String(o).trim()).filter(Boolean),
      required: q.required !== false,
    }
  })
}

function isOpen(row: UsisSurvey, now: DateTime) {
  if (row.status !== 'open') return false
  if (row.opensAt && row.opensAt > now) return false
  if (row.closesAt && row.closesAt <= now) return false
  return true
}

export class SurveysService {
  listAdmin(organizationId: string, page: number, limit: number) {
    return UsisSurvey.query()
      .where('organization_id', organizationId)
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async create(input: {
    organizationId: string
    userId: string
    kind?: 'survey' | 'poll'
    title: string
    description?: string | null
    audience?: AnnouncementAudience
    questions: SurveyQuestion[]
    opensAt?: Date | null
    closesAt?: Date | null
    openNow?: boolean
  }) {
    const kind = input.kind ?? 'survey'
    const questions = normalizeQuestions(input.questions, kind)
    const now = DateTime.now()
    const opensAt = input.opensAt ? DateTime.fromJSDate(input.opensAt) : input.openNow ? now : null
    const status = input.openNow || (opensAt && opensAt <= now) ? 'open' : 'draft'

    const row = await UsisSurvey.create({
      organizationId: input.organizationId,
      kind,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status,
      audience: input.audience ?? {},
      questions,
      opensAt,
      closesAt: input.closesAt ? DateTime.fromJSDate(input.closesAt) : null,
      createdBy: input.userId,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: AuditAction.CREATE,
      entityType: 'survey',
      entityId: row.id,
      metadata: { kind, status, questionCount: questions.length },
    })
    return row
  }

  async publish(id: string, organizationId: string, userId: string) {
    const row = await UsisSurvey.query().where('id', id).where('organization_id', organizationId).firstOrFail()
    row.status = 'open'
    if (!row.opensAt) row.opensAt = DateTime.now()
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId: userId,
      action: AuditAction.UPDATE,
      entityType: 'survey',
      entityId: row.id,
      metadata: { status: 'open' },
    })
    return row
  }

  async close(id: string, organizationId: string, userId: string) {
    const row = await UsisSurvey.query().where('id', id).where('organization_id', organizationId).firstOrFail()
    row.status = 'closed'
    row.closesAt = DateTime.now()
    await row.save()
    await auditLogService.log({
      organizationId,
      actorUserId: userId,
      action: AuditAction.UPDATE,
      entityType: 'survey',
      entityId: row.id,
      metadata: { status: 'closed' },
    })
    return row
  }

  async pendingForUser(organizationId: string, ctx: FeedContext, userId: string) {
    const now = DateTime.now()
    const rows = await UsisSurvey.query()
      .where('organization_id', organizationId)
      .where('status', 'open')
      .orderBy('created_at', 'desc')
      .limit(50)

    const answered = await UsisSurveyResponse.query()
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .select('survey_id')
    const done = new Set(answered.map((r) => r.surveyId))

    return rows
      .filter((row) => isOpen(row, now))
      .filter((row) => audienceMatches(row.audience ?? {}, ctx))
      .filter((row) => !done.has(row.id))
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        description: row.description,
        questions: row.questions,
        opensAt: row.opensAt?.toISO() ?? null,
        closesAt: row.closesAt?.toISO() ?? null,
      }))
  }

  async submit(input: {
    organizationId: string
    surveyId: string
    userId: string
    student: Student | null
    answers: SurveyAnswers
    ctx: FeedContext
  }) {
    const survey = await UsisSurvey.query()
      .where('id', input.surveyId)
      .where('organization_id', input.organizationId)
      .firstOrFail()

    const now = DateTime.now()
    if (!isOpen(survey, now)) {
      throw new EnrollmentWorkflowError('Survey is not open', 409, 'SURVEY_CLOSED')
    }
    if (!audienceMatches(survey.audience ?? {}, input.ctx)) {
      throw new EnrollmentWorkflowError('Not in survey audience', 403, 'SURVEY_AUDIENCE')
    }

    const existing = await UsisSurveyResponse.query()
      .where('survey_id', survey.id)
      .where('user_id', input.userId)
      .first()
    if (existing) {
      throw new EnrollmentWorkflowError('Already submitted', 409, 'SURVEY_ALREADY_SUBMITTED')
    }

    for (const q of survey.questions) {
      if (q.required === false) continue
      const val = input.answers[q.id]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) {
        throw new EnrollmentWorkflowError(`Answer required for: ${q.prompt}`, 422, 'ANSWER_REQUIRED')
      }
    }

    const row = await UsisSurveyResponse.create({
      organizationId: input.organizationId,
      surveyId: survey.id,
      userId: input.userId,
      studentId: input.student?.id ?? null,
      answers: input.answers,
      submittedAt: now,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: AuditAction.CREATE,
      entityType: 'survey_response',
      entityId: row.id,
      metadata: { surveyId: survey.id, kind: survey.kind },
    })
    return row
  }

  async results(surveyId: string, organizationId: string) {
    const survey = await UsisSurvey.query()
      .where('id', surveyId)
      .where('organization_id', organizationId)
      .firstOrFail()
    const responses = await UsisSurveyResponse.query()
      .where('survey_id', surveyId)
      .where('organization_id', organizationId)

    const questionStats = survey.questions.map((q) => {
      const optionCounts: Record<string, number> = {}
      let answered = 0
      for (const response of responses) {
        const raw = response.answers[q.id]
        if (raw === undefined || raw === null || raw === '') continue
        answered += 1
        if (typeof raw === 'string' || typeof raw === 'number') {
          const key = String(raw)
          optionCounts[key] = (optionCounts[key] ?? 0) + 1
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            const key = String(item)
            optionCounts[key] = (optionCounts[key] ?? 0) + 1
          }
        }
      }
      return {
        questionId: q.id,
        prompt: q.prompt,
        questionType: q.questionType,
        answered,
        optionCounts,
      }
    })

    return {
      survey: {
        id: survey.id,
        kind: survey.kind,
        title: survey.title,
        status: survey.status,
      },
      totalResponses: responses.length,
      questionStats,
    }
  }
}

export const surveysService = new SurveysService()
