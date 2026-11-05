import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import UsisSectionMeeting from '#modules/enrollment/models/usis_section_meeting'
import Enrollment from '#modules/enrollment/models/enrollment'
import { schedulingService } from '#modules/enrollment/services/scheduling_service'
import { waitlistService } from '#modules/enrollment/services/waitlist_service'
import { slotAdminService } from '#modules/enrollment/services/slot_admin_service'
import { schedulingNotificationService } from '#modules/enrollment/services/scheduling_notification_service'
import { enrollmentClassScheduleService } from '#modules/enrollment/services/enrollment_class_schedule_service'
import { resolveSelfStudent, effectivePermissions, hasStaffEnrollmentAccess } from '#modules/enrollment/services/enrollment_access_service'
import { facultyEvalService } from '#modules/enrollment/services/faculty_eval_service'

const conflictValidator = vine.compile(
  vine.object({
    sectionId: vine.string().uuid(),
    studentId: vine.string().uuid().optional(),
  })
)

const waitlistValidator = vine.compile(
  vine.object({
    sectionId: vine.string().uuid(),
    enrollmentId: vine.string().uuid().optional(),
  })
)

const meetingValidator = vine.compile(
  vine.object({
    dayOfWeek: vine.number().min(0).max(6),
    startMinute: vine.number().min(0).max(1439),
    endMinute: vine.number().min(1).max(1440),
    roomCode: vine.string().trim().maxLength(64).optional(),
    facultyUserId: vine.string().uuid().optional(),
  })
)

const dropLineValidator = vine.compile(
  vine.object({
    enrollmentLineId: vine.string().uuid(),
    reason: vine.string().trim().maxLength(500).optional(),
  })
)

const transferLineValidator = vine.compile(
  vine.object({
    enrollmentLineId: vine.string().uuid(),
    toSectionId: vine.string().uuid(),
  })
)

const dissolveValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(500).optional(),
  })
)

const classCodesLineValidator = vine.compile(
  vine.object({
    line: vine.string().trim().minLength(1).maxLength(500),
  })
)

const alternateSectionsValidator = vine.compile(
  vine.object({
    subjectCode: vine.string().trim().maxLength(64).optional(),
    conflictingSectionId: vine.string().uuid().optional(),
    excludeSectionId: vine.string().uuid().optional(),
    studentId: vine.string().uuid().optional(),
  })
)

const applyClassCodesValidator = vine.compile(
  vine.object({
    enrollmentId: vine.string().uuid(),
    line: vine.string().trim().minLength(1).maxLength(500),
  })
)

export default class SchedulingController {
  async upsertMeeting(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(meetingValidator)
    const row = await UsisSectionMeeting.create({
      organizationId: user.organizationId,
      sectionId: ctx.params.sectionId,
      dayOfWeek: body.dayOfWeek,
      startMinute: body.startMinute,
      endMinute: body.endMinute,
      roomCode: body.roomCode ?? null,
      facultyUserId: body.facultyUserId ?? null,
    })
    return ctx.response.created({ data: row })
  }

  async sectionSummary(ctx: HttpContext) {
    const user = ctx.auth.user!
    const data = await schedulingService.sectionSummary(user.organizationId, ctx.params.sectionId)
    return ctx.response.ok({ data })
  }

  async checkConflicts(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(conflictValidator)
    let studentId = body.studentId
    if (!studentId) {
      const self = await resolveSelfStudent(user)
      if (!self) return ctx.response.notFound({ error: 'No student profile linked' })
      studentId = self.id
    }
    const data = await schedulingService.detectConflicts({
      organizationId: user.organizationId,
      studentId,
      candidateSectionId: body.sectionId,
    })
    return ctx.response.ok({ data })
  }

  async myWaitlist(ctx: HttpContext) {
    const user = ctx.auth.user!
    const student = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
    if (!student) return ctx.response.notFound({ error: 'No student profile linked' })
    const rows = await waitlistService.listForStudent(user.organizationId, student.id)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        position: r.position,
        status: r.status,
        sectionId: r.sectionId,
        sectionCode: r.section?.code ?? '',
        sectionName: r.section?.name ?? '',
        createdAt: r.createdAt.toISO(),
      })),
    })
  }

  async joinWaitlist(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(waitlistValidator)
    const student = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
    if (!student) return ctx.response.notFound({ error: 'No student profile linked' })
    try {
      const row = await waitlistService.join({
        organizationId: user.organizationId,
        student,
        sectionId: body.sectionId,
        enrollmentId: body.enrollmentId ?? null,
        actorUserId: user.id,
      })
      return ctx.response.created({
        data: {
          id: row.id,
          position: row.position,
          status: row.status,
          sectionId: row.sectionId,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Waitlist join failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async sectionWaitlist(ctx: HttpContext) {
    const user = ctx.auth.user!
    const rows = await waitlistService.listForSection(user.organizationId, ctx.params.sectionId)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        position: r.position,
        studentId: r.studentId,
        studentNumber: r.student?.studentNumber ?? '',
        studentName: r.student ? `${r.student.lastName}, ${r.student.firstName}` : '',
      })),
    })
  }

  async listMeetings(ctx: HttpContext) {
    const user = ctx.auth.user!
    const rows = await slotAdminService.listMeetings(user.organizationId, ctx.params.sectionId)
    return ctx.response.ok({
      data: rows.map((m) => ({
        id: m.id,
        dayOfWeek: m.dayOfWeek,
        startMinute: m.startMinute,
        endMinute: m.endMinute,
        roomCode: m.roomCode,
        facultyUserId: m.facultyUserId,
      })),
    })
  }

  async updateMeeting(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(meetingValidator)
    try {
      const row = await slotAdminService.updateMeeting({
        organizationId: user.organizationId,
        meetingId: ctx.params.meetingId,
        patch: {
          dayOfWeek: body.dayOfWeek,
          startMinute: body.startMinute,
          endMinute: body.endMinute,
          roomCode: body.roomCode ?? null,
          facultyUserId: body.facultyUserId ?? null,
        },
        actorUserId: user.id,
      })
      return ctx.response.ok({ data: row })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async deleteMeeting(ctx: HttpContext) {
    const user = ctx.auth.user!
    try {
      await slotAdminService.deleteMeeting({
        organizationId: user.organizationId,
        meetingId: ctx.params.meetingId,
        actorUserId: user.id,
      })
      return ctx.response.noContent()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async dropLine(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(dropLineValidator)
    try {
      const result = await slotAdminService.dropEnrollmentLine({
        organizationId: user.organizationId,
        enrollmentLineId: body.enrollmentLineId,
        actorUserId: user.id,
        reason: body.reason ?? null,
      })
      return ctx.response.ok({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Drop failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async transferLine(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(transferLineValidator)
    try {
      const result = await slotAdminService.transferEnrollmentLine({
        organizationId: user.organizationId,
        enrollmentLineId: body.enrollmentLineId,
        toSectionId: body.toSectionId,
        actorUserId: user.id,
      })
      return ctx.response.ok({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async dissolveSection(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(dissolveValidator)
    try {
      const result = await slotAdminService.dissolveSection({
        organizationId: user.organizationId,
        sectionId: ctx.params.sectionId,
        actorUserId: user.id,
        reason: body.reason ?? null,
      })
      return ctx.response.ok({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dissolve failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }

  async myScheduleNotifications(ctx: HttpContext) {
    const user = ctx.auth.user!
    const student = await facultyEvalService.resolveStudent(user.organizationId, user.email ?? '')
    if (!student) return ctx.response.notFound({ error: 'No student profile linked' })
    const rows = await schedulingNotificationService.listForStudent(user.organizationId, student.id)
    return ctx.response.ok({
      data: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        title: r.title,
        body: r.body,
        sectionId: r.sectionId,
        createdAt: r.createdAt.toISO(),
        readAt: r.readAt?.toISO() ?? null,
      })),
    })
  }

  async resolveClassCodes(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(classCodesLineValidator)
    const data = await schedulingService.resolveClassCodeLine(user.organizationId, body.line)
    return ctx.response.ok({ data })
  }

  async searchAlternateSections(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(alternateSectionsValidator)
    let studentId = body.studentId
    if (!studentId) {
      const self = await resolveSelfStudent(user)
      if (!self) return ctx.response.notFound({ error: 'No student profile linked' })
      studentId = self.id
    }
    const data = await schedulingService.searchAlternateSections({
      organizationId: user.organizationId,
      studentId,
      subjectCode: body.subjectCode ?? null,
      conflictingSectionId: body.conflictingSectionId ?? null,
      excludeSectionId: body.excludeSectionId ?? null,
    })
    return ctx.response.ok({ data })
  }

  async applyClassCodes(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(applyClassCodesValidator)
    const enrollment = await Enrollment.query()
      .where('id', body.enrollmentId)
      .where('organization_id', user.organizationId)
      .firstOrFail()
    const self = await resolveSelfStudent(user)
    const permissions = await effectivePermissions(ctx)
    const isStaff = hasStaffEnrollmentAccess(permissions) || permissions.includes('enrollments.write')
    if (!isStaff && (!self || self.id !== enrollment.studentId)) {
      return ctx.response.forbidden({ error: 'Forbidden' })
    }
    try {
      const result = await enrollmentClassScheduleService.applyClassCodeLine({
        organizationId: user.organizationId,
        enrollmentId: body.enrollmentId,
        classCodesLine: body.line,
        actorUserId: user.id,
      })
      return ctx.response.ok({
        data: {
          enrollmentId: result.enrollment.id,
          addedCount: result.createdLines.length,
          sectionCodes: result.resolvedCodes,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apply failed'
      return ctx.response.unprocessableEntity({ error: message })
    }
  }
}
