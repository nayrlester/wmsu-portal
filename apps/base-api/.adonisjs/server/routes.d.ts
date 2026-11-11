import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'common_platform.jwks': { paramsTuple?: []; params?: {} }
    'health.live': { paramsTuple?: []; params?: {} }
    'health.ready': { paramsTuple?: []; params?: {} }
    'health.show': { paramsTuple?: []; params?: {} }
    'health.ping': { paramsTuple?: []; params?: {} }
    'mdm.overview': { paramsTuple?: []; params?: {} }
    'mdm.list_universities': { paramsTuple?: []; params?: {} }
    'mdm.list_campuses': { paramsTuple?: []; params?: {} }
    'mdm.list_colleges': { paramsTuple?: []; params?: {} }
    'mdm.list_departments': { paramsTuple?: []; params?: {} }
    'mdm.list_offices': { paramsTuple?: []; params?: {} }
    'mdm.list_academic_years': { paramsTuple?: []; params?: {} }
    'mdm.list_terms': { paramsTuple?: []; params?: {} }
    'mdm.list_employees': { paramsTuple?: []; params?: {} }
    'mdm.list_student_identity_refs': { paramsTuple?: []; params?: {} }
    'mdm.list_countries': { paramsTuple?: []; params?: {} }
    'mdm.list_regions': { paramsTuple?: []; params?: {} }
    'mdm.list_addresses': { paramsTuple?: []; params?: {} }
    'mdm.list_sequences': { paramsTuple?: []; params?: {} }
    'mdm.list_settings': { paramsTuple?: []; params?: {} }
    'mdm.list_audit_logs': { paramsTuple?: []; params?: {} }
    'mdm.create_university': { paramsTuple?: []; params?: {} }
    'mdm.create_campus': { paramsTuple?: []; params?: {} }
    'mdm.upsert_student_identity_ref': { paramsTuple?: []; params?: {} }
    'mdm.next_sequence_value': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'mdm.upsert_setting': { paramsTuple?: []; params?: {} }
    'integration.overview': { paramsTuple?: []; params?: {} }
    'integration.list_clearance_types': { paramsTuple?: []; params?: {} }
    'integration.get_clearance': { paramsTuple: [ParamValue]; params: {'subjectKey': ParamValue} }
    'integration.list_audit_logs': { paramsTuple?: []; params?: {} }
    'integration.publish_event': { paramsTuple?: []; params?: {} }
    'integration.list_events': { paramsTuple?: []; params?: {} }
    'integration.list_subscriptions': { paramsTuple?: []; params?: {} }
    'integration.list_transactions': { paramsTuple?: []; params?: {} }
    'integration.enqueue_notification': { paramsTuple?: []; params?: {} }
    'integration.list_notifications': { paramsTuple?: []; params?: {} }
    'integration.upload_file': { paramsTuple?: []; params?: {} }
    'integration.get_file_meta': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'integration.upsert_clearance_requirement': { paramsTuple?: []; params?: {} }
    'integration.critical_echo': { paramsTuple?: []; params?: {} }
    'gateway.catalog': { paramsTuple?: []; params?: {} }
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.status': { paramsTuple?: []; params?: {} }
    'common_platform.launcher': { paramsTuple?: []; params?: {} }
    'common_platform.db_consolidation': { paramsTuple?: []; params?: {} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.status': { paramsTuple?: []; params?: {} }
    'enrollment.health': { paramsTuple?: []; params?: {} }
    'finance.status': { paramsTuple?: []; params?: {} }
    'finance.health': { paramsTuple?: []; params?: {} }
    'records.status': { paramsTuple?: []; params?: {} }
    'records.health': { paramsTuple?: []; params?: {} }
    'library.status': { paramsTuple?: []; params?: {} }
    'library.health': { paramsTuple?: []; params?: {} }
    'documents.status': { paramsTuple?: []; params?: {} }
    'documents.health': { paramsTuple?: []; params?: {} }
    'inventory.status': { paramsTuple?: []; params?: {} }
    'inventory.health': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.index': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.store': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.admit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.status_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.admission_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.forms.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.forms.active': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.forms.store': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.events.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.store': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.events.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.events.assign': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.record_result': { paramsTuple?: []; params?: {} }
    'enrollment.students.me': { paramsTuple?: []; params?: {} }
    'enrollment.students.me.profile': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.task_calendar': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.grade_feedback': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_policy': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_workflow': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.curriculum_plan': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.open_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.course_choice': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.select_course': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.start_enrollment': { paramsTuple?: []; params?: {} }
    'enrollment.students.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.classifications': { paramsTuple?: []; params?: {} }
    'enrollment.students.merge_jobs.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.merge': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.run': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.import.batches.rejections_csv': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.absences': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'violationId': ParamValue} }
    'enrollment.students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.retry_platform_login': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.index': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.auto_internal': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.external': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.apply_equivalencies': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.review': { paramsTuple: [ParamValue,ParamValue]; params: {'studentId': ParamValue,'creditId': ParamValue} }
    'enrollment.academic.subject_equivalencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.subject_equivalencies.store': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.upsert_meeting': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.stored_conflicts': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_summary': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.check_conflicts': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.my_waitlist': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.join_waitlist': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.waitlist.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.scheduling.section_waitlist': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.waitlist.promote': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.meetings.conflicts': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.list_meetings': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.export_section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.update_meeting': { paramsTuple: [ParamValue]; params: {'meetingId': ParamValue} }
    'enrollment.scheduling.delete_meeting': { paramsTuple: [ParamValue]; params: {'meetingId': ParamValue} }
    'enrollment.scheduling.drop_line': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.transfer_line': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.dissolve_section': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.my_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.faculty_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.mark_notification_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.scheduling.resolve_class_codes': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.search_alternate_sections': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.apply_class_codes': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.encode_block_group': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_academic_year': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.update_academic_year': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.delete_academic_year': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.list_programs': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_program': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.update_program': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.delete_program': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.list_sections': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_section': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.update_section': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.delete_section': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.replicate_schedules': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.bulk_update_section_status': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_categories': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_category': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_buildings': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_building': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_rooms': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_room': { paramsTuple?: []; params?: {} }
    'enrollment.academic_policies.show': { paramsTuple?: []; params?: {} }
    'enrollment.academic_policies.update': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.show': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.update': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.upload_logo': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_colleges': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_college': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_college': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_department': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.list_positions': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_position': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_position': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.list_subject_areas': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_subject_area': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_subject_area': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.search_personnel': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_assignment': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_assignment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.subjects.index': { paramsTuple?: []; params?: {} }
    'enrollment.subjects.store': { paramsTuple?: []; params?: {} }
    'enrollment.academic.subjects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.prerequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.prerequisites.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.prerequisites.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'linkId': ParamValue} }
    'enrollment.academic.subjects.corequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.corequisites.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.corequisites.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'linkId': ParamValue} }
    'enrollment.academic.curricula.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.curricula.store': { paramsTuple?: []; params?: {} }
    'enrollment.academic.curricula.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.versions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.duplicate': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.academic.curriculum_versions.status': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.index': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.store': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'versionId': ParamValue,'lineId': ParamValue} }
    'enrollment.enrollments.index': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.store': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.advise': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.assess': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.override': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.list_change_requests': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.request_change': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.decide_change': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.upsert_change_window': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.upsert_unit_load_policy': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.verify_payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.registrar_approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.incomplete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.workflow': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.advising.assign_adviser': { paramsTuple?: []; params?: {} }
    'enrollment.advising.reassign_adviser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_periods': { paramsTuple?: []; params?: {} }
    'enrollment.advising.upsert_period': { paramsTuple?: []; params?: {} }
    'enrollment.advising.start_session': { paramsTuple?: []; params?: {} }
    'enrollment.advising.session_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_recommendations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.add_recommendation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.remove_recommendation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'recommendationId': ParamValue} }
    'enrollment.advising.assign_course': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.endorse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.waiver': { paramsTuple?: []; params?: {} }
    'enrollment.advising.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.advising.history': { paramsTuple: [ParamValue]; params: {'enrollmentId': ParamValue} }
    'enrollment.advising.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.grades.index': { paramsTuple?: []; params?: {} }
    'enrollment.grades.submit': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.upsert_scheme': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_schemes': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.upsert_deadline': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_deadlines': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.assign_faculty': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.my_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_class_records': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.open_class_record': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.enlist': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.class_master_list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.export_grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.encode': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.submit': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.request_correction': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_corrections': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.decide_correction': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.entry_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.student_academic_records': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.grade_records.compute_gwa': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.grade_records.convert_incompletes': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.record_attendance': { paramsTuple?: []; params?: {} }
    'enrollment.assessments.index': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.prepare': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.upsert_fee_schedule': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.tag_aid': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_aid_tags': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.issue_document': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_documents': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.verify_document': { paramsTuple: [ParamValue]; params: {'qrToken': ParamValue} }
    'enrollment.assessment_finance.integration_history': { paramsTuple?: []; params?: {} }
    'enrollment.assessments.me.monitor': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.student_monitor': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.assessment_finance.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.assessment_finance.submit_to_ufms': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.assessment_finance.sync_payment_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.payments.index': { paramsTuple?: []; params?: {} }
    'enrollment.payments.store': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.issue_report': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.list_reports': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.show_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.reports.pdf': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.office_requirements.index': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.office_requirements.store': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.students.office_sync': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.clearance.students.office': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.clearance.office_items.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.scholarships.index': { paramsTuple?: []; params?: {} }
    'enrollment.scholarships.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.assign_staff': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.create_request': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.queue_ticket': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.display': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.reports.analytics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.queue.tickets.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.queue.tickets.slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.office_report': { paramsTuple: [ParamValue]; params: {'office': ParamValue} }
    'enrollment.student_support.clearance_hints': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.cross_office_clearance': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.unified_profile': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.referrals': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.alerts': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.referrals.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.sensitive_access_log': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.counseling_request': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.intake': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.sessions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.specialist_referral': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling.specialists': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.write_case_note': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.read_case_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.batteries': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.results.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.results.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.shifting.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.shifting.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.requirements': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.result_ready': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.endorse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.health_encounter': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.read_clinical_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.health_clearance': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.medical_assessments.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.enrollment_gate': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.health.statistics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.ehr': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.health.conditions.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.alerts.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.prescriptions.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.hospital_referrals.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.discipline_complaint': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.discipline.cases.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.discipline.cases.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.cases.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.cases.sanctions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.history': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.osa.discipline.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.list_org_applications': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.get_org_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.submit_org_application': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.org_applications.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_organizations': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.organizations.certificate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_id_requests': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.submit_student_id_request': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.id_requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.id_requests.digital_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.students.participation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.student_support.scholarship_program': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.scholarship_apply': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.applications.index': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.scholarship_decide': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.awards.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.reports.assistance': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.requirements': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.interview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.compliance_report': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.store': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.clear': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.reports.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.reports.definitions': { paramsTuple?: []; params?: {} }
    'enrollment.reports.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.reports.hemis_schema': { paramsTuple?: []; params?: {} }
    'enrollment.reports.export': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.reports.show': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.announcements.settings_index': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.settings_update': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.feed': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.index': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.store': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.dispatch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.toggle_like': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.add_comment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.preview_sms': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.queue_sms': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.campaigns_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.store_contact': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_pending': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_store': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.surveys_close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.surveys_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.surveys_respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.codes_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.codes_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.questions_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.questions_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.schedules_close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.schedules_window': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.assignment_options': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.pending': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.responses_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.report': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.faculty_eval.report_export': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.graduation.graduate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.phase_2_records.index': { paramsTuple: [ParamValue]; params: {'moduleCode': ParamValue} }
    'enrollment.phase_2_records.store': { paramsTuple: [ParamValue]; params: {'moduleCode': ParamValue} }
    'enrollment.phase_2_modules.index': { paramsTuple?: []; params?: {} }
    'enrollment.internal.internal_grades.export_student_grades': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.public.institutional_profile.show_logo': { paramsTuple: [ParamValue,ParamValue]; params: {'organizationId': ParamValue,'filename': ParamValue} }
    'enrollment.docs.swagger': { paramsTuple?: []; params?: {} }
    'enrollment.docs.openapi': { paramsTuple?: []; params?: {} }
    'enrollment.auth.login': { paramsTuple?: []; params?: {} }
    'enrollment.auth.refresh': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.verify_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.sss.osa.id_requests.digital_verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.admissions.form.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.programs.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.apply.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.status.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.journey.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.exam.open.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.exam.submit.public': { paramsTuple?: []; params?: {} }
    'enrollment.auth.logout': { paramsTuple?: []; params?: {} }
    'enrollment.auth.me': { paramsTuple?: []; params?: {} }
    'enrollment.org.show': { paramsTuple?: []; params?: {} }
    'enrollment.org.update': { paramsTuple?: []; params?: {} }
    'enrollment.org.list_campuses': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_campus': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_offices': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_office': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_department': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.index': { paramsTuple?: []; params?: {} }
    'enrollment.users.store': { paramsTuple?: []; params?: {} }
    'enrollment.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.permissions.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.store': { paramsTuple?: []; params?: {} }
    'enrollment.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.auth.login': { paramsTuple?: []; params?: {} }
    'finance.auth.refresh': { paramsTuple?: []; params?: {} }
    'finance.auth.logout': { paramsTuple?: []; params?: {} }
    'finance.auth.me': { paramsTuple?: []; params?: {} }
    'finance.ufms.info': { paramsTuple?: []; params?: {} }
    'finance.dashboard.summary': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.seed_official_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.update_coa': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.ufms_reference.list_funds': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_fund': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_banks': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_bank': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_bank_accounts': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_bank_account': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_fiscal_periods': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_fiscal_period': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_or_series': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_or_series': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_approval_workflows': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_approval_workflow': { paramsTuple?: []; params?: {} }
    'finance.budget.list_plans': { paramsTuple?: []; params?: {} }
    'finance.budget.store_plan': { paramsTuple?: []; params?: {} }
    'finance.budget.show_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.update_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.submit_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.approve_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.reject_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.revise_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_documents': { paramsTuple?: []; params?: {} }
    'finance.budget.store_document': { paramsTuple?: []; params?: {} }
    'finance.budget.show_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.submit_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.approve_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.reject_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.revise_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_obligations': { paramsTuple?: []; params?: {} }
    'finance.budget.store_obligation': { paramsTuple?: []; params?: {} }
    'finance.budget.show_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.post_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.cancel_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.monitor': { paramsTuple?: []; params?: {} }
    'finance.budget.validate_availability': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_journals': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_journal': { paramsTuple?: []; params?: {} }
    'finance.accounting.show_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.submit_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.post_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.revise_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.list_ledger': { paramsTuple?: []; params?: {} }
    'finance.accounting.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.accounting.cash_flow': { paramsTuple?: []; params?: {} }
    'finance.accounting.close_period': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.reopen_period': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.list_tax_rates': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_tax_rate': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_tax_entry': { paramsTuple?: []; params?: {} }
    'finance.accounting.remittance_report': { paramsTuple?: []; params?: {} }
    'finance.accounting.mark_remitted': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_reconciliations': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_reconciliation': { paramsTuple?: []; params?: {} }
    'finance.accounting.complete_reconciliation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.receivables.record_payment': { paramsTuple?: []; params?: {} }
    'finance.receivables.list_payments': { paramsTuple?: []; params?: {} }
    'finance.receivables.student_account': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.receivables.daily_collection': { paramsTuple?: []; params?: {} }
    'finance.receivables.create_deposit_slip': { paramsTuple?: []; params?: {} }
    'finance.receivables.get_settings': { paramsTuple?: []; params?: {} }
    'finance.receivables.update_settings': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedule_scope': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'finance.tuition.upsert_fee_schedule': { paramsTuple?: []; params?: {} }
    'finance.tuition.update_fee_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.tuition.deactivate_fee_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.tuition.get_payment_policy': { paramsTuple?: []; params?: {} }
    'finance.tuition.upsert_payment_policy': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.list': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.upsert': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.payment_plans.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.list_invoices': { paramsTuple?: []; params?: {} }
    'finance.disbursement.store_invoice': { paramsTuple?: []; params?: {} }
    'finance.disbursement.match_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.list_dv': { paramsTuple?: []; params?: {} }
    'finance.disbursement.store_dv': { paramsTuple?: []; params?: {} }
    'finance.disbursement.approve_dv': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.issue_cheque': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.record_ada': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.list_cheques': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.financial_position': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.budget_vs_actual': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.receivables_aging': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.saob': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.dashboard_metrics': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.audit_export': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.export_agency': { paramsTuple: [ParamValue]; params: {'agency': ParamValue} }
    'finance.financial_reports.push_uims': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.decide_approval': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.official_receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.disbursement_voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.budget_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.bfar_pack': { paramsTuple?: []; params?: {} }
    'finance.official_forms.bir_withholding': { paramsTuple?: []; params?: {} }
    'finance.official_forms.agency_csv': { paramsTuple: [ParamValue]; params: {'agency': ParamValue} }
    'finance.procurement.list_vendors': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_vendor': { paramsTuple?: []; params?: {} }
    'finance.procurement.update_vendor': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_requisitions': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_requisition': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.submit_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.approve_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.reject_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_rfqs': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_rfq': { paramsTuple?: []; params?: {} }
    'finance.procurement.issue_rfq': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.close_rfq': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.store_quotation': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_abstract': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_award': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_purchase_orders': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_purchase_order': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.approve_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.issue_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.finance.procurement.createPurchaseOrder': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_delivery': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_iars': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_iar': { paramsTuple?: []; params?: {} }
    'finance.procurement.monitor': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_document_refs': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_document_ref': { paramsTuple?: []; params?: {} }
    'finance.pos.list_terminals': { paramsTuple?: []; params?: {} }
    'finance.pos.store_terminal': { paramsTuple?: []; params?: {} }
    'finance.pos.update_terminal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.list_catalog': { paramsTuple?: []; params?: {} }
    'finance.pos.store_catalog_item': { paramsTuple?: []; params?: {} }
    'finance.pos.update_catalog_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.list_sales': { paramsTuple?: []; params?: {} }
    'finance.pos.store_sale': { paramsTuple?: []; params?: {} }
    'finance.pos.show_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.complete_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.void_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.refund_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.close_eod': { paramsTuple?: []; params?: {} }
    'finance.pos.cashier_report': { paramsTuple?: []; params?: {} }
    'finance.pos.list_stock_snapshots': { paramsTuple?: []; params?: {} }
    'finance.pos.upsert_stock_snapshot': { paramsTuple?: []; params?: {} }
    'finance.pos.record_sale': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.internal_cashier.record_payment': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_assessments.upsert': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'finance.internal.internal.procurement.createPurchaseOrder': { paramsTuple?: []; params?: {} }
    'finance.internal.legacy.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.legacy.internal_cashier.record_payment': { paramsTuple?: []; params?: {} }
    'finance.internal.legacy.internal_assessments.upsert': { paramsTuple?: []; params?: {} }
    'finance.internal.legacy.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'document_issuance.verify_public': { paramsTuple?: []; params?: {} }
    'records.auth.login': { paramsTuple?: []; params?: {} }
    'records.auth.refresh': { paramsTuple?: []; params?: {} }
    'records.auth.logout': { paramsTuple?: []; params?: {} }
    'records.auth.me': { paramsTuple?: []; params?: {} }
    'records.tor.requests.submit': { paramsTuple?: []; params?: {} }
    'records.tor.requests.index': { paramsTuple?: []; params?: {} }
    'records.tor.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.transition': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.confirm_physical': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.attachments': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.verify_payment': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.generate': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.tor.issuances.issue': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.tor.issuances.print': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.tor.request_legacy': { paramsTuple?: []; params?: {} }
    'records.tor.preview_legacy': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.cert.types.index': { paramsTuple?: []; params?: {} }
    'records.cert.types.update': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'records.cert.requests.submit': { paramsTuple?: []; params?: {} }
    'records.cert.requests.index': { paramsTuple?: []; params?: {} }
    'records.cert.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.transition': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.attachments': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.verify_payment': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.generate': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.issuances.issue': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.cert.issuances.print': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.cert.index_legacy': { paramsTuple?: []; params?: {} }
    'records.cert.store_legacy': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.status': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.probe_integrations': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_readiness': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_reference': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_route': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.lookup_request': { paramsTuple: [ParamValue]; params: {'requestNumber': ParamValue} }
    'records.torms_foundation.list_sync_runs': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_discrepancies': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.pull_usis_grades': { paramsTuple?: []; params?: {} }
    'records.tor.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.index': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.me': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.standing': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.show': { paramsTuple: [ParamValue]; params: {'idOrStudent': ParamValue} }
    'records.torms_alumni.update': { paramsTuple: [ParamValue]; params: {'idOrStudent': ParamValue} }
    'records.torms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'records.torms_reports.requests': { paramsTuple?: []; params?: {} }
    'records.torms_reports.issuances': { paramsTuple?: []; params?: {} }
    'records.internal.internal_grades.sync_grades': { paramsTuple?: []; params?: {} }
    'records.internal.alumni.create_from_graduation': { paramsTuple?: []; params?: {} }
    'records.internal.legacy.internal_grades.sync_grades': { paramsTuple?: []; params?: {} }
    'records.internal.legacy.alumni.create_from_graduation': { paramsTuple?: []; params?: {} }
    'library.docs.swagger': { paramsTuple?: []; params?: {} }
    'library.docs.openapi': { paramsTuple?: []; params?: {} }
    'library.tenants.resolve': { paramsTuple?: []; params?: {} }
    'library.register.store': { paramsTuple?: []; params?: {} }
    'library.auth.login': { paramsTuple?: []; params?: {} }
    'library.auth.refresh': { paramsTuple?: []; params?: {} }
    'library.public_opac.search': { paramsTuple?: []; params?: {} }
    'library.public_opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_elibrary.search': { paramsTuple?: []; params?: {} }
    'library.public_elibrary.open_repository': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_elibrary.open_electronic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.public_locate': { paramsTuple?: []; params?: {} }
    'library.kiosk.session': { paramsTuple?: []; params?: {} }
    'library.kiosk.heartbeat': { paramsTuple?: []; params?: {} }
    'library.kiosk.patron': { paramsTuple?: []; params?: {} }
    'library.kiosk.account': { paramsTuple?: []; params?: {} }
    'library.kiosk.history': { paramsTuple?: []; params?: {} }
    'library.kiosk.checkout': { paramsTuple?: []; params?: {} }
    'library.kiosk.renew': { paramsTuple?: []; params?: {} }
    'library.kiosk.return_item': { paramsTuple?: []; params?: {} }
    'library.auth.me': { paramsTuple?: []; params?: {} }
    'library.auth.logout': { paramsTuple?: []; params?: {} }
    'library.tenants.current': { paramsTuple?: []; params?: {} }
    'library.tenants.update': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.status': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'library.users.index': { paramsTuple?: []; params?: {} }
    'library.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.users.store': { paramsTuple?: []; params?: {} }
    'library.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.categories': { paramsTuple?: []; params?: {} }
    'library.books.material_types': { paramsTuple?: []; params?: {} }
    'library.books.batch_destroy': { paramsTuple?: []; params?: {} }
    'library.books.batch_update': { paramsTuple?: []; params?: {} }
    'library.books.index': { paramsTuple?: []; params?: {} }
    'library.books.store': { paramsTuple?: []; params?: {} }
    'library.books.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.export_marc': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.copies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.add_copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.update_copy': { paramsTuple: [ParamValue,ParamValue]; params: {'bookId': ParamValue,'copyId': ParamValue} }
    'library.books.destroy_copy': { paramsTuple: [ParamValue,ParamValue]; params: {'bookId': ParamValue,'copyId': ParamValue} }
    'library.books.list_digital_files': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.upload_digital_file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.download_digital_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'fileId': ParamValue} }
    'library.members.pending': { paramsTuple?: []; params?: {} }
    'library.members.index': { paramsTuple?: []; params?: {} }
    'library.members.store': { paramsTuple?: []; params?: {} }
    'library.members.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.card': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.borrowing_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.dashboard': { paramsTuple?: []; params?: {} }
    'library.borrowings.loan_rules': { paramsTuple?: []; params?: {} }
    'library.borrowings.update_loan_rules': { paramsTuple?: []; params?: {} }
    'library.borrowings.index': { paramsTuple?: []; params?: {} }
    'library.borrowings.request': { paramsTuple?: []; params?: {} }
    'library.borrowings.direct_checkout': { paramsTuple?: []; params?: {} }
    'library.borrowings.batch_checkout': { paramsTuple?: []; params?: {} }
    'library.borrowings.batch_checkin': { paramsTuple?: []; params?: {} }
    'library.borrowings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.events': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.checkout': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.return': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.mark_lost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.summary': { paramsTuple?: []; params?: {} }
    'library.fines.index': { paramsTuple?: []; params?: {} }
    'library.fines.store': { paramsTuple?: []; params?: {} }
    'library.fines.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.adjust': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.waive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.collect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.payments': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.index': { paramsTuple?: []; params?: {} }
    'library.reservations.store': { paramsTuple?: []; params?: {} }
    'library.reservations.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.fulfill': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.dashboard': { paramsTuple?: []; params?: {} }
    'library.acquisitions.index': { paramsTuple?: []; params?: {} }
    'library.acquisitions.store': { paramsTuple?: []; params?: {} }
    'library.acquisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.route': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.link_catalog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reports.types': { paramsTuple?: []; params?: {} }
    'library.reports.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'library.search.index': { paramsTuple?: []; params?: {} }
    'library.search.recent': { paramsTuple?: []; params?: {} }
    'library.search.saved': { paramsTuple?: []; params?: {} }
    'library.search.store_saved': { paramsTuple?: []; params?: {} }
    'library.search.destroy_saved': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.ai.chat': { paramsTuple?: []; params?: {} }
    'library.ai.quick_actions': { paramsTuple?: []; params?: {} }
    'library.ai.conversations': { paramsTuple?: []; params?: {} }
    'library.ai.show_conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.ai.destroy_conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.analytics.dashboard': { paramsTuple?: []; params?: {} }
    'library.notifications.delivery_log': { paramsTuple?: []; params?: {} }
    'library.notifications.index': { paramsTuple?: []; params?: {} }
    'library.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'library.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'library.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.notifications.preferences': { paramsTuple?: []; params?: {} }
    'library.notifications.update_preference': { paramsTuple?: []; params?: {} }
    'library.audit_logs.index': { paramsTuple?: []; params?: {} }
    'library.opac.search': { paramsTuple?: []; params?: {} }
    'library.opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.me': { paramsTuple?: []; params?: {} }
    'library.portal.card': { paramsTuple?: []; params?: {} }
    'library.portal.notices': { paramsTuple?: []; params?: {} }
    'library.portal.read_notice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.reserve': { paramsTuple?: []; params?: {} }
    'library.portal.cancel_reservation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.reading_lists': { paramsTuple?: []; params?: {} }
    'library.portal.create_reading_list': { paramsTuple?: []; params?: {} }
    'library.portal.delete_reading_list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.add_reading_list_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.remove_reading_list_item': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'library.portal.request_acquisition': { paramsTuple?: []; params?: {} }
    'library.digital.list_repository': { paramsTuple?: []; params?: {} }
    'library.digital.create_repository': { paramsTuple?: []; params?: {} }
    'library.digital.access_repository': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.digital.list_electronic': { paramsTuple?: []; params?: {} }
    'library.digital.create_electronic': { paramsTuple?: []; params?: {} }
    'library.digital.open_electronic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.digital.unified_search': { paramsTuple?: []; params?: {} }
    'library.integrations.status': { paramsTuple?: []; params?: {} }
    'library.integrations.sync_enrollment': { paramsTuple?: []; params?: {} }
    'library.integrations.sync_aris': { paramsTuple?: []; params?: {} }
    'library.integrations.sync_hris': { paramsTuple?: []; params?: {} }
    'library.integrations.ldap_auth': { paramsTuple?: []; params?: {} }
    'library.integrations.smart_campus_sso': { paramsTuple?: []; params?: {} }
    'library.hardware.list_rfid': { paramsTuple?: []; params?: {} }
    'library.hardware.register_rfid': { paramsTuple?: []; params?: {} }
    'library.hardware.rfid_checkout': { paramsTuple?: []; params?: {} }
    'library.hardware.rfid_checkin': { paramsTuple?: []; params?: {} }
    'library.hardware.list_gate_events': { paramsTuple?: []; params?: {} }
    'library.hardware.read_gate': { paramsTuple?: []; params?: {} }
    'library.hardware.list_shelf_counts': { paramsTuple?: []; params?: {} }
    'library.hardware.show_shelf_count': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.start_shelf_count': { paramsTuple?: []; params?: {} }
    'library.hardware.add_shelf_scan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.list_kiosks': { paramsTuple?: []; params?: {} }
    'library.hardware.list_kiosk_transactions': { paramsTuple?: []; params?: {} }
    'library.hardware.upsert_kiosk': { paramsTuple?: []; params?: {} }
    'library.hardware.set_kiosk_enabled': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.rotate_kiosk_key': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.issue_ticket': { paramsTuple?: []; params?: {} }
    'library.hardware.call_next': { paramsTuple?: []; params?: {} }
    'library.hardware.complete_ticket': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.queue_analytics': { paramsTuple?: []; params?: {} }
    'library.hardware.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.list_locations': { paramsTuple?: []; params?: {} }
    'library.hardware.upsert_location': { paramsTuple?: []; params?: {} }
    'library.hardware.locate': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_csv': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_marc': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_xlsx': { paramsTuple?: []; params?: {} }
    'library.catalog_import.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.attendance.summary': { paramsTuple?: []; params?: {} }
    'library.attendance.index': { paramsTuple?: []; params?: {} }
    'library.attendance.store': { paramsTuple?: []; params?: {} }
    'library.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'documents.documents.health.live': { paramsTuple?: []; params?: {} }
    'documents.documents.health.ready': { paramsTuple?: []; params?: {} }
    'documents.documents.metrics': { paramsTuple?: []; params?: {} }
    'documents.documents.public_track.show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.public_track.api_show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.tenant_assets.show': { paramsTuple: [ParamValue,ParamValue]; params: {'tenantId': ParamValue,'filename': ParamValue} }
    'documents.webhooks.billing.stripe': { paramsTuple?: []; params?: {} }
    'documents.webhooks.billing.paymongo': { paramsTuple?: []; params?: {} }
    'documents.webhooks.billing.stub': { paramsTuple?: []; params?: {} }
    'documents.webhooks.pandadoc': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.store': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.index': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.docs.swagger': { paramsTuple?: []; params?: {} }
    'documents.docs.openapi': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.public_show': { paramsTuple?: []; params?: {} }
    'documents.public.plans': { paramsTuple?: []; params?: {} }
    'documents.internal_files.download': { paramsTuple?: []; params?: {} }
    'documents.auth.register': { paramsTuple?: []; params?: {} }
    'documents.auth.login': { paramsTuple?: []; params?: {} }
    'documents.auth.mfa_challenge': { paramsTuple?: []; params?: {} }
    'documents.auth.refresh': { paramsTuple?: []; params?: {} }
    'documents.auth.forgot_password': { paramsTuple?: []; params?: {} }
    'documents.auth.reset_password': { paramsTuple?: []; params?: {} }
    'documents.auth.validate_reset_token': { paramsTuple?: []; params?: {} }
    'documents.auth.verify_email': { paramsTuple?: []; params?: {} }
    'documents.auth.resend_verification': { paramsTuple?: []; params?: {} }
    'documents.oauth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.oauth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.admin_tenants.index': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.store': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_tenants.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_tenants.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_tenants.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_tenants.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_analytics.overview': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.revenue': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.tenant_usage': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.index': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.store': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_billing.overview': { paramsTuple?: []; params?: {} }
    'documents.auth.profile': { paramsTuple?: []; params?: {} }
    'documents.auth.logout': { paramsTuple?: []; params?: {} }
    'documents.organization.show': { paramsTuple?: []; params?: {} }
    'documents.organization.update': { paramsTuple?: []; params?: {} }
    'documents.tenant_settings.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_settings.update': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.update': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.upload_logo': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.index': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.store': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.verify': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.set_primary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.tenant_domains.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.subscription.show': { paramsTuple?: []; params?: {} }
    'documents.subscription.usage': { paramsTuple?: []; params?: {} }
    'documents.billing.plans': { paramsTuple?: []; params?: {} }
    'documents.billing.checkout': { paramsTuple?: []; params?: {} }
    'documents.billing.upgrade': { paramsTuple?: []; params?: {} }
    'documents.billing.downgrade': { paramsTuple?: []; params?: {} }
    'documents.billing.cancel': { paramsTuple?: []; params?: {} }
    'documents.billing.validate_coupon': { paramsTuple?: []; params?: {} }
    'documents.billing.invoices': { paramsTuple?: []; params?: {} }
    'documents.billing.show_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.invoice_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.usage_report': { paramsTuple?: []; params?: {} }
    'documents.billing.record_usage': { paramsTuple?: []; params?: {} }
    'documents.sessions.index': { paramsTuple?: []; params?: {} }
    'documents.sessions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.sessions.destroy_all': { paramsTuple?: []; params?: {} }
    'documents.mfa.status': { paramsTuple?: []; params?: {} }
    'documents.mfa.setup': { paramsTuple?: []; params?: {} }
    'documents.mfa.enable': { paramsTuple?: []; params?: {} }
    'documents.mfa.disable': { paramsTuple?: []; params?: {} }
    'documents.permissions.index': { paramsTuple?: []; params?: {} }
    'documents.permissions.my_permissions': { paramsTuple?: []; params?: {} }
    'documents.roles.index': { paramsTuple?: []; params?: {} }
    'documents.roles.store': { paramsTuple?: []; params?: {} }
    'documents.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.update_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.assign_to_user': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'documents.users.index': { paramsTuple?: []; params?: {} }
    'documents.users.assignable_roles': { paramsTuple?: []; params?: {} }
    'documents.users.store': { paramsTuple?: []; params?: {} }
    'documents.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.audit_logs.index': { paramsTuple?: []; params?: {} }
    'documents.audit_logs.verify_chain': { paramsTuple?: []; params?: {} }
    'documents.dashboard.stats': { paramsTuple?: []; params?: {} }
    'documents.dashboard.overview': { paramsTuple?: []; params?: {} }
    'documents.dashboard.trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.usage_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.files_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.user_access': { paramsTuple?: []; params?: {} }
    'documents.search.index': { paramsTuple?: []; params?: {} }
    'documents.search.search_by_image': { paramsTuple?: []; params?: {} }
    'documents.copilot.chat': { paramsTuple?: []; params?: {} }
    'documents.copilot.confirm': { paramsTuple?: []; params?: {} }
    'documents.copilot.cancel': { paramsTuple?: []; params?: {} }
    'documents.departments.index': { paramsTuple?: []; params?: {} }
    'documents.departments.store': { paramsTuple?: []; params?: {} }
    'documents.departments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.departments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_types.index': { paramsTuple?: []; params?: {} }
    'documents.document_types.store': { paramsTuple?: []; params?: {} }
    'documents.document_types.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_types.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.retention_schedules.index': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.store': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.apply_agency_packs': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.retention_schedules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.records.inventory': { paramsTuple?: []; params?: {} }
    'documents.records.summary': { paramsTuple?: []; params?: {} }
    'documents.records.ops_report': { paramsTuple?: []; params?: {} }
    'documents.records.update_lifecycle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.index': { paramsTuple?: []; params?: {} }
    'documents.record_requests.store': { paramsTuple?: []; params?: {} }
    'documents.record_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.deny': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.return_items': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.index': { paramsTuple?: []; params?: {} }
    'documents.digitization.store': { paramsTuple?: []; params?: {} }
    'documents.digitization.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.add_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.ingest': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.run_ocr': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.submit_qa': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.index': { paramsTuple?: []; params?: {} }
    'documents.receiving.store': { paramsTuple?: []; params?: {} }
    'documents.receiving.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.acknowledgment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.set_legal_hold': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.archives.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.archives.create_transfer': { paramsTuple?: []; params?: {} }
    'documents.archives.show_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.approve_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.complete_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.archives.create_disposal': { paramsTuple?: []; params?: {} }
    'documents.archives.show_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.approve_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.execute_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.platform_documents.index': { paramsTuple?: []; params?: {} }
    'documents.platform_documents.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.search': { paramsTuple?: []; params?: {} }
    'documents.documents.departments': { paramsTuple?: []; params?: {} }
    'documents.documents.document_types': { paramsTuple?: []; params?: {} }
    'documents.document_versions.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_versions.store': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_versions.submit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_files.store': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.presign': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.complete_presigned': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.replace': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.save_edit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.download': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.view': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.preview_html': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_intelligence.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_intelligence.analyze': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_intelligence.correct_metadata': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_intelligence.job_status': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'jobId': ParamValue} }
    'documents.document_content.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_content.update': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_views.store': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.documents.index': { paramsTuple?: []; params?: {} }
    'documents.documents.store': { paramsTuple?: []; params?: {} }
    'documents.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.start': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.place_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.finalize': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.sync': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_approvals.workflow_state': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.timeline': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.approvals': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.activity': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.bulk_act': { paramsTuple?: []; params?: {} }
    'documents.document_approvals.act': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.workflows.index': { paramsTuple?: []; params?: {} }
    'documents.workflows.store': { paramsTuple?: []; params?: {} }
    'documents.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.simulate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_type_workflows.assign': { paramsTuple: [ParamValue]; params: {'documentTypeId': ParamValue} }
    'documents.notifications.index': { paramsTuple?: []; params?: {} }
    'documents.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'documents.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'documents.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.push_tokens.store': { paramsTuple?: []; params?: {} }
    'documents.push_tokens.destroy': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.status': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.list': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.register': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.update_metadata': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.list_file_plan': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.create_file_plan': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.update_file_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.destroy_file_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.assigned_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.office_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.awaiting_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.tracking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.route': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.act': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.create_version': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.apply_retention': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.set_lifecycle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.set_legal_hold': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_archived': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_schedules': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_retention_due': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.create_transfer': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.approve_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.complete_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.create_disposal': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.approve_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.execute_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.registration': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.workflow': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.archival': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.printable': { paramsTuple?: []; params?: {} }
    'inventory.docs.swagger': { paramsTuple?: []; params?: {} }
    'inventory.docs.openapi': { paramsTuple?: []; params?: {} }
    'inventory.auth.login': { paramsTuple?: []; params?: {} }
    'inventory.auth.refresh': { paramsTuple?: []; params?: {} }
    'inventory.auth.logout': { paramsTuple?: []; params?: {} }
    'inventory.auth.me': { paramsTuple?: []; params?: {} }
    'inventory.dashboard.summary': { paramsTuple?: []; params?: {} }
    'inventory.org.show': { paramsTuple?: []; params?: {} }
    'inventory.org.update': { paramsTuple?: []; params?: {} }
    'inventory.org.list_campuses': { paramsTuple?: []; params?: {} }
    'inventory.org.create_campus': { paramsTuple?: []; params?: {} }
    'inventory.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_offices': { paramsTuple?: []; params?: {} }
    'inventory.org.create_office': { paramsTuple?: []; params?: {} }
    'inventory.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_departments': { paramsTuple?: []; params?: {} }
    'inventory.org.create_department': { paramsTuple?: []; params?: {} }
    'inventory.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.index': { paramsTuple?: []; params?: {} }
    'inventory.users.store': { paramsTuple?: []; params?: {} }
    'inventory.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.permissions.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.store': { paramsTuple?: []; params?: {} }
    'inventory.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.index': { paramsTuple?: []; params?: {} }
    'inventory.item_categories.store': { paramsTuple?: []; params?: {} }
    'inventory.item_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.index': { paramsTuple?: []; params?: {} }
    'inventory.items.store': { paramsTuple?: []; params?: {} }
    'inventory.items.import_csv': { paramsTuple?: []; params?: {} }
    'inventory.items.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.index': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.store': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.list_bins': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.create_bin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.delete_bin': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'binId': ParamValue} }
    'inventory.stock_movements.beginning': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.receive': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.issue': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.transfer': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.adjust': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.return_stock': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.disposal': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.reserve': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.release': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.transactions': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.ledger': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'inventory.stock_movements.balances': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.index': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.store': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.suppliers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.suppliers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.index': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.store': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.fulfill': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.index': { paramsTuple?: []; params?: {} }
    'inventory.coa.store': { paramsTuple?: []; params?: {} }
    'inventory.coa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.index': { paramsTuple?: []; params?: {} }
    'inventory.physical_counts.store': { paramsTuple?: []; params?: {} }
    'inventory.physical_counts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.scan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.reconcile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.depreciation.create_profile': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.get_profile': { paramsTuple: [ParamValue]; params: {'assetId': ParamValue} }
    'inventory.depreciation.run': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.lapsing_schedule': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.stock_inventory': { paramsTuple?: []; params?: {} }
    'inventory.reports.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.consumption': { paramsTuple?: []; params?: {} }
    'inventory.reports.depreciation': { paramsTuple?: []; params?: {} }
    'inventory.assets.index': { paramsTuple?: []; params?: {} }
    'inventory.assets.store': { paramsTuple?: []; params?: {} }
    'inventory.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.return_asset': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.retire': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.schedule_maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.complete_maintenance': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'maintenanceId': ParamValue} }
    'inventory.assets.generate_qr': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.audit_logs.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_custodianships.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'inventory.internal.internal_procurement_acceptance.accept': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'common_platform.jwks': { paramsTuple?: []; params?: {} }
    'health.live': { paramsTuple?: []; params?: {} }
    'health.ready': { paramsTuple?: []; params?: {} }
    'health.show': { paramsTuple?: []; params?: {} }
    'health.ping': { paramsTuple?: []; params?: {} }
    'mdm.overview': { paramsTuple?: []; params?: {} }
    'mdm.list_universities': { paramsTuple?: []; params?: {} }
    'mdm.list_campuses': { paramsTuple?: []; params?: {} }
    'mdm.list_colleges': { paramsTuple?: []; params?: {} }
    'mdm.list_departments': { paramsTuple?: []; params?: {} }
    'mdm.list_offices': { paramsTuple?: []; params?: {} }
    'mdm.list_academic_years': { paramsTuple?: []; params?: {} }
    'mdm.list_terms': { paramsTuple?: []; params?: {} }
    'mdm.list_employees': { paramsTuple?: []; params?: {} }
    'mdm.list_student_identity_refs': { paramsTuple?: []; params?: {} }
    'mdm.list_countries': { paramsTuple?: []; params?: {} }
    'mdm.list_regions': { paramsTuple?: []; params?: {} }
    'mdm.list_addresses': { paramsTuple?: []; params?: {} }
    'mdm.list_sequences': { paramsTuple?: []; params?: {} }
    'mdm.list_settings': { paramsTuple?: []; params?: {} }
    'mdm.list_audit_logs': { paramsTuple?: []; params?: {} }
    'integration.overview': { paramsTuple?: []; params?: {} }
    'integration.list_clearance_types': { paramsTuple?: []; params?: {} }
    'integration.get_clearance': { paramsTuple: [ParamValue]; params: {'subjectKey': ParamValue} }
    'integration.list_audit_logs': { paramsTuple?: []; params?: {} }
    'integration.list_events': { paramsTuple?: []; params?: {} }
    'integration.list_subscriptions': { paramsTuple?: []; params?: {} }
    'integration.list_transactions': { paramsTuple?: []; params?: {} }
    'integration.list_notifications': { paramsTuple?: []; params?: {} }
    'integration.get_file_meta': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'gateway.catalog': { paramsTuple?: []; params?: {} }
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.status': { paramsTuple?: []; params?: {} }
    'common_platform.launcher': { paramsTuple?: []; params?: {} }
    'common_platform.db_consolidation': { paramsTuple?: []; params?: {} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.status': { paramsTuple?: []; params?: {} }
    'enrollment.health': { paramsTuple?: []; params?: {} }
    'finance.status': { paramsTuple?: []; params?: {} }
    'finance.health': { paramsTuple?: []; params?: {} }
    'records.status': { paramsTuple?: []; params?: {} }
    'records.health': { paramsTuple?: []; params?: {} }
    'library.status': { paramsTuple?: []; params?: {} }
    'library.health': { paramsTuple?: []; params?: {} }
    'documents.status': { paramsTuple?: []; params?: {} }
    'documents.health': { paramsTuple?: []; params?: {} }
    'inventory.status': { paramsTuple?: []; params?: {} }
    'inventory.health': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.index': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.status_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.admission_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.forms.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.forms.active': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.me': { paramsTuple?: []; params?: {} }
    'enrollment.students.me.profile': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.task_calendar': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.grade_feedback': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_policy': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_workflow': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.curriculum_plan': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.open_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.course_choice': { paramsTuple?: []; params?: {} }
    'enrollment.students.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.classifications': { paramsTuple?: []; params?: {} }
    'enrollment.students.merge_jobs.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.import.batches.rejections_csv': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.absences': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.index': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.academic.subject_equivalencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.stored_conflicts': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_summary': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.my_waitlist': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.section_waitlist': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.list_meetings': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.export_section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.my_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.faculty_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_programs': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_sections': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_categories': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_buildings': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_rooms': { paramsTuple?: []; params?: {} }
    'enrollment.academic_policies.show': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.show': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_colleges': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_positions': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_subject_areas': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.search_personnel': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.subjects.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.subjects.prerequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.corequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.curricula.versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.index': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.enrollments.index': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.list_change_requests': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.workflow': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.advising.list_periods': { paramsTuple?: []; params?: {} }
    'enrollment.advising.session_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_recommendations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.advising.history': { paramsTuple: [ParamValue]; params: {'enrollmentId': ParamValue} }
    'enrollment.advising.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.grades.index': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_schemes': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_deadlines': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.my_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_class_records': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.class_master_list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.export_grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.list_corrections': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.entry_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.student_academic_records': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.assessments.index': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_aid_tags': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_documents': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.verify_document': { paramsTuple: [ParamValue]; params: {'qrToken': ParamValue} }
    'enrollment.assessment_finance.integration_history': { paramsTuple?: []; params?: {} }
    'enrollment.assessments.me.monitor': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.student_monitor': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.assessment_finance.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.payments.index': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.list_reports': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.show_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.reports.pdf': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.office_requirements.index': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.students.office': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.scholarships.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.display': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.reports.analytics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.queue.tickets.slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.office_report': { paramsTuple: [ParamValue]; params: {'office': ParamValue} }
    'enrollment.student_support.clearance_hints': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.cross_office_clearance': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.unified_profile': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.referrals': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.alerts': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.student_support.sensitive_access_log': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling.specialists': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.read_case_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.batteries': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.shifting.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.read_clinical_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.health.programs.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.enrollment_gate': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.health.statistics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.ehr': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.osa.discipline.cases.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.discipline.cases.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.history': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.osa.discipline.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.list_org_applications': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.get_org_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_organizations': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.organizations.certificate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_id_requests': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.id_requests.digital_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.students.participation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.scholarships.applications.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.awards.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.reports.assistance': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.compliance_report': { paramsTuple?: []; params?: {} }
    'enrollment.reports.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.reports.definitions': { paramsTuple?: []; params?: {} }
    'enrollment.reports.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.reports.hemis_schema': { paramsTuple?: []; params?: {} }
    'enrollment.reports.export': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.reports.show': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.announcements.settings_index': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.feed': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.campaigns_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_pending': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.codes_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.questions_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.assignment_options': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.pending': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.report': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.faculty_eval.report_export': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.phase_2_records.index': { paramsTuple: [ParamValue]; params: {'moduleCode': ParamValue} }
    'enrollment.phase_2_modules.index': { paramsTuple?: []; params?: {} }
    'enrollment.internal.internal_grades.export_student_grades': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.public.institutional_profile.show_logo': { paramsTuple: [ParamValue,ParamValue]; params: {'organizationId': ParamValue,'filename': ParamValue} }
    'enrollment.docs.swagger': { paramsTuple?: []; params?: {} }
    'enrollment.docs.openapi': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.verify_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.sss.osa.id_requests.digital_verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.admissions.form.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.programs.public': { paramsTuple?: []; params?: {} }
    'enrollment.auth.me': { paramsTuple?: []; params?: {} }
    'enrollment.org.show': { paramsTuple?: []; params?: {} }
    'enrollment.org.list_campuses': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_offices': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.index': { paramsTuple?: []; params?: {} }
    'enrollment.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.permissions.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.auth.me': { paramsTuple?: []; params?: {} }
    'finance.ufms.info': { paramsTuple?: []; params?: {} }
    'finance.dashboard.summary': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_funds': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_banks': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_bank_accounts': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_fiscal_periods': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_or_series': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_approval_workflows': { paramsTuple?: []; params?: {} }
    'finance.budget.list_plans': { paramsTuple?: []; params?: {} }
    'finance.budget.show_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_documents': { paramsTuple?: []; params?: {} }
    'finance.budget.show_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_obligations': { paramsTuple?: []; params?: {} }
    'finance.budget.show_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.monitor': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_journals': { paramsTuple?: []; params?: {} }
    'finance.accounting.show_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.list_ledger': { paramsTuple?: []; params?: {} }
    'finance.accounting.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.accounting.cash_flow': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_tax_rates': { paramsTuple?: []; params?: {} }
    'finance.accounting.remittance_report': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_reconciliations': { paramsTuple?: []; params?: {} }
    'finance.receivables.list_payments': { paramsTuple?: []; params?: {} }
    'finance.receivables.student_account': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.receivables.daily_collection': { paramsTuple?: []; params?: {} }
    'finance.receivables.get_settings': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedule_scope': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'finance.tuition.get_payment_policy': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.list': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_invoices': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_dv': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_cheques': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.financial_position': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.budget_vs_actual': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.receivables_aging': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.saob': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.dashboard_metrics': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.audit_export': { paramsTuple?: []; params?: {} }
    'finance.official_forms.official_receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.disbursement_voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.budget_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.bfar_pack': { paramsTuple?: []; params?: {} }
    'finance.official_forms.bir_withholding': { paramsTuple?: []; params?: {} }
    'finance.official_forms.agency_csv': { paramsTuple: [ParamValue]; params: {'agency': ParamValue} }
    'finance.procurement.list_vendors': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_requisitions': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_rfqs': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_purchase_orders': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_iars': { paramsTuple?: []; params?: {} }
    'finance.procurement.monitor': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_document_refs': { paramsTuple?: []; params?: {} }
    'finance.pos.list_terminals': { paramsTuple?: []; params?: {} }
    'finance.pos.list_catalog': { paramsTuple?: []; params?: {} }
    'finance.pos.list_sales': { paramsTuple?: []; params?: {} }
    'finance.pos.show_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.cashier_report': { paramsTuple?: []; params?: {} }
    'finance.pos.list_stock_snapshots': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'finance.internal.legacy.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.legacy.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'records.auth.me': { paramsTuple?: []; params?: {} }
    'records.tor.requests.index': { paramsTuple?: []; params?: {} }
    'records.tor.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.tor.preview_legacy': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.cert.types.index': { paramsTuple?: []; params?: {} }
    'records.cert.requests.index': { paramsTuple?: []; params?: {} }
    'records.cert.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.index_legacy': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.status': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_readiness': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.lookup_request': { paramsTuple: [ParamValue]; params: {'requestNumber': ParamValue} }
    'records.torms_foundation.list_sync_runs': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_discrepancies': { paramsTuple?: []; params?: {} }
    'records.tor.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.index': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.me': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.standing': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.show': { paramsTuple: [ParamValue]; params: {'idOrStudent': ParamValue} }
    'records.torms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'records.torms_reports.requests': { paramsTuple?: []; params?: {} }
    'records.torms_reports.issuances': { paramsTuple?: []; params?: {} }
    'library.docs.swagger': { paramsTuple?: []; params?: {} }
    'library.docs.openapi': { paramsTuple?: []; params?: {} }
    'library.tenants.resolve': { paramsTuple?: []; params?: {} }
    'library.public_opac.search': { paramsTuple?: []; params?: {} }
    'library.public_opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_elibrary.search': { paramsTuple?: []; params?: {} }
    'library.public_elibrary.open_repository': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.public_locate': { paramsTuple?: []; params?: {} }
    'library.kiosk.session': { paramsTuple?: []; params?: {} }
    'library.kiosk.patron': { paramsTuple?: []; params?: {} }
    'library.kiosk.account': { paramsTuple?: []; params?: {} }
    'library.kiosk.history': { paramsTuple?: []; params?: {} }
    'library.auth.me': { paramsTuple?: []; params?: {} }
    'library.tenants.current': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.status': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'library.users.index': { paramsTuple?: []; params?: {} }
    'library.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.categories': { paramsTuple?: []; params?: {} }
    'library.books.material_types': { paramsTuple?: []; params?: {} }
    'library.books.index': { paramsTuple?: []; params?: {} }
    'library.books.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.export_marc': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.copies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.list_digital_files': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.download_digital_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'fileId': ParamValue} }
    'library.members.pending': { paramsTuple?: []; params?: {} }
    'library.members.index': { paramsTuple?: []; params?: {} }
    'library.members.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.card': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.borrowing_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.dashboard': { paramsTuple?: []; params?: {} }
    'library.borrowings.loan_rules': { paramsTuple?: []; params?: {} }
    'library.borrowings.index': { paramsTuple?: []; params?: {} }
    'library.borrowings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.events': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.summary': { paramsTuple?: []; params?: {} }
    'library.fines.index': { paramsTuple?: []; params?: {} }
    'library.fines.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.payments': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.index': { paramsTuple?: []; params?: {} }
    'library.acquisitions.dashboard': { paramsTuple?: []; params?: {} }
    'library.acquisitions.index': { paramsTuple?: []; params?: {} }
    'library.acquisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reports.types': { paramsTuple?: []; params?: {} }
    'library.reports.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'library.search.index': { paramsTuple?: []; params?: {} }
    'library.search.recent': { paramsTuple?: []; params?: {} }
    'library.search.saved': { paramsTuple?: []; params?: {} }
    'library.ai.quick_actions': { paramsTuple?: []; params?: {} }
    'library.ai.conversations': { paramsTuple?: []; params?: {} }
    'library.ai.show_conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.analytics.dashboard': { paramsTuple?: []; params?: {} }
    'library.notifications.delivery_log': { paramsTuple?: []; params?: {} }
    'library.notifications.index': { paramsTuple?: []; params?: {} }
    'library.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'library.notifications.preferences': { paramsTuple?: []; params?: {} }
    'library.audit_logs.index': { paramsTuple?: []; params?: {} }
    'library.opac.search': { paramsTuple?: []; params?: {} }
    'library.opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.me': { paramsTuple?: []; params?: {} }
    'library.portal.card': { paramsTuple?: []; params?: {} }
    'library.portal.notices': { paramsTuple?: []; params?: {} }
    'library.portal.reading_lists': { paramsTuple?: []; params?: {} }
    'library.digital.list_repository': { paramsTuple?: []; params?: {} }
    'library.digital.list_electronic': { paramsTuple?: []; params?: {} }
    'library.digital.unified_search': { paramsTuple?: []; params?: {} }
    'library.integrations.status': { paramsTuple?: []; params?: {} }
    'library.hardware.list_rfid': { paramsTuple?: []; params?: {} }
    'library.hardware.list_gate_events': { paramsTuple?: []; params?: {} }
    'library.hardware.list_shelf_counts': { paramsTuple?: []; params?: {} }
    'library.hardware.show_shelf_count': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.list_kiosks': { paramsTuple?: []; params?: {} }
    'library.hardware.list_kiosk_transactions': { paramsTuple?: []; params?: {} }
    'library.hardware.queue_analytics': { paramsTuple?: []; params?: {} }
    'library.hardware.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.list_locations': { paramsTuple?: []; params?: {} }
    'library.hardware.locate': { paramsTuple?: []; params?: {} }
    'library.catalog_import.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.attendance.summary': { paramsTuple?: []; params?: {} }
    'library.attendance.index': { paramsTuple?: []; params?: {} }
    'library.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'documents.documents.health.live': { paramsTuple?: []; params?: {} }
    'documents.documents.health.ready': { paramsTuple?: []; params?: {} }
    'documents.documents.metrics': { paramsTuple?: []; params?: {} }
    'documents.documents.public_track.show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.public_track.api_show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.tenant_assets.show': { paramsTuple: [ParamValue,ParamValue]; params: {'tenantId': ParamValue,'filename': ParamValue} }
    'documents.documents_hub.index': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.docs.swagger': { paramsTuple?: []; params?: {} }
    'documents.docs.openapi': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.public_show': { paramsTuple?: []; params?: {} }
    'documents.public.plans': { paramsTuple?: []; params?: {} }
    'documents.internal_files.download': { paramsTuple?: []; params?: {} }
    'documents.auth.validate_reset_token': { paramsTuple?: []; params?: {} }
    'documents.auth.verify_email': { paramsTuple?: []; params?: {} }
    'documents.oauth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.oauth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.admin_tenants.index': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_analytics.overview': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.revenue': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.tenant_usage': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.index': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_billing.overview': { paramsTuple?: []; params?: {} }
    'documents.auth.profile': { paramsTuple?: []; params?: {} }
    'documents.organization.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_settings.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.index': { paramsTuple?: []; params?: {} }
    'documents.subscription.show': { paramsTuple?: []; params?: {} }
    'documents.subscription.usage': { paramsTuple?: []; params?: {} }
    'documents.billing.plans': { paramsTuple?: []; params?: {} }
    'documents.billing.invoices': { paramsTuple?: []; params?: {} }
    'documents.billing.show_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.invoice_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.usage_report': { paramsTuple?: []; params?: {} }
    'documents.sessions.index': { paramsTuple?: []; params?: {} }
    'documents.mfa.status': { paramsTuple?: []; params?: {} }
    'documents.permissions.index': { paramsTuple?: []; params?: {} }
    'documents.permissions.my_permissions': { paramsTuple?: []; params?: {} }
    'documents.roles.index': { paramsTuple?: []; params?: {} }
    'documents.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.users.index': { paramsTuple?: []; params?: {} }
    'documents.users.assignable_roles': { paramsTuple?: []; params?: {} }
    'documents.audit_logs.index': { paramsTuple?: []; params?: {} }
    'documents.audit_logs.verify_chain': { paramsTuple?: []; params?: {} }
    'documents.dashboard.stats': { paramsTuple?: []; params?: {} }
    'documents.dashboard.overview': { paramsTuple?: []; params?: {} }
    'documents.dashboard.trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.usage_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.files_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.user_access': { paramsTuple?: []; params?: {} }
    'documents.search.index': { paramsTuple?: []; params?: {} }
    'documents.departments.index': { paramsTuple?: []; params?: {} }
    'documents.document_types.index': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.index': { paramsTuple?: []; params?: {} }
    'documents.records.inventory': { paramsTuple?: []; params?: {} }
    'documents.records.summary': { paramsTuple?: []; params?: {} }
    'documents.records.ops_report': { paramsTuple?: []; params?: {} }
    'documents.record_requests.index': { paramsTuple?: []; params?: {} }
    'documents.record_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.index': { paramsTuple?: []; params?: {} }
    'documents.digitization.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.index': { paramsTuple?: []; params?: {} }
    'documents.receiving.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.acknowledgment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.archives.show_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.archives.show_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.platform_documents.index': { paramsTuple?: []; params?: {} }
    'documents.platform_documents.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.search': { paramsTuple?: []; params?: {} }
    'documents.documents.departments': { paramsTuple?: []; params?: {} }
    'documents.documents.document_types': { paramsTuple?: []; params?: {} }
    'documents.document_versions.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_files.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_files.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.download': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.view': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.preview_html': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_intelligence.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_intelligence.job_status': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'jobId': ParamValue} }
    'documents.document_content.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.documents.index': { paramsTuple?: []; params?: {} }
    'documents.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_approvals.workflow_state': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.timeline': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.approvals': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.activity': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.workflows.index': { paramsTuple?: []; params?: {} }
    'documents.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.notifications.index': { paramsTuple?: []; params?: {} }
    'documents.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.status': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.list': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.list_file_plan': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.assigned_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.office_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.awaiting_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.tracking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_archived': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_schedules': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_retention_due': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.registration': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.workflow': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.archival': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.printable': { paramsTuple?: []; params?: {} }
    'inventory.docs.swagger': { paramsTuple?: []; params?: {} }
    'inventory.docs.openapi': { paramsTuple?: []; params?: {} }
    'inventory.auth.me': { paramsTuple?: []; params?: {} }
    'inventory.dashboard.summary': { paramsTuple?: []; params?: {} }
    'inventory.org.show': { paramsTuple?: []; params?: {} }
    'inventory.org.list_campuses': { paramsTuple?: []; params?: {} }
    'inventory.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_offices': { paramsTuple?: []; params?: {} }
    'inventory.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_departments': { paramsTuple?: []; params?: {} }
    'inventory.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.index': { paramsTuple?: []; params?: {} }
    'inventory.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.permissions.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.index': { paramsTuple?: []; params?: {} }
    'inventory.item_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.index': { paramsTuple?: []; params?: {} }
    'inventory.items.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.index': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.list_bins': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.stock_movements.transactions': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.ledger': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'inventory.stock_movements.balances': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.index': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.index': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.index': { paramsTuple?: []; params?: {} }
    'inventory.coa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.index': { paramsTuple?: []; params?: {} }
    'inventory.physical_counts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.depreciation.get_profile': { paramsTuple: [ParamValue]; params: {'assetId': ParamValue} }
    'inventory.depreciation.lapsing_schedule': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.stock_inventory': { paramsTuple?: []; params?: {} }
    'inventory.reports.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.consumption': { paramsTuple?: []; params?: {} }
    'inventory.reports.depreciation': { paramsTuple?: []; params?: {} }
    'inventory.assets.index': { paramsTuple?: []; params?: {} }
    'inventory.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.audit_logs.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_custodianships.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
  }
  HEAD: {
    'common_platform.jwks': { paramsTuple?: []; params?: {} }
    'health.live': { paramsTuple?: []; params?: {} }
    'health.ready': { paramsTuple?: []; params?: {} }
    'health.show': { paramsTuple?: []; params?: {} }
    'health.ping': { paramsTuple?: []; params?: {} }
    'mdm.overview': { paramsTuple?: []; params?: {} }
    'mdm.list_universities': { paramsTuple?: []; params?: {} }
    'mdm.list_campuses': { paramsTuple?: []; params?: {} }
    'mdm.list_colleges': { paramsTuple?: []; params?: {} }
    'mdm.list_departments': { paramsTuple?: []; params?: {} }
    'mdm.list_offices': { paramsTuple?: []; params?: {} }
    'mdm.list_academic_years': { paramsTuple?: []; params?: {} }
    'mdm.list_terms': { paramsTuple?: []; params?: {} }
    'mdm.list_employees': { paramsTuple?: []; params?: {} }
    'mdm.list_student_identity_refs': { paramsTuple?: []; params?: {} }
    'mdm.list_countries': { paramsTuple?: []; params?: {} }
    'mdm.list_regions': { paramsTuple?: []; params?: {} }
    'mdm.list_addresses': { paramsTuple?: []; params?: {} }
    'mdm.list_sequences': { paramsTuple?: []; params?: {} }
    'mdm.list_settings': { paramsTuple?: []; params?: {} }
    'mdm.list_audit_logs': { paramsTuple?: []; params?: {} }
    'integration.overview': { paramsTuple?: []; params?: {} }
    'integration.list_clearance_types': { paramsTuple?: []; params?: {} }
    'integration.get_clearance': { paramsTuple: [ParamValue]; params: {'subjectKey': ParamValue} }
    'integration.list_audit_logs': { paramsTuple?: []; params?: {} }
    'integration.list_events': { paramsTuple?: []; params?: {} }
    'integration.list_subscriptions': { paramsTuple?: []; params?: {} }
    'integration.list_transactions': { paramsTuple?: []; params?: {} }
    'integration.list_notifications': { paramsTuple?: []; params?: {} }
    'integration.get_file_meta': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'gateway.catalog': { paramsTuple?: []; params?: {} }
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.status': { paramsTuple?: []; params?: {} }
    'common_platform.launcher': { paramsTuple?: []; params?: {} }
    'common_platform.db_consolidation': { paramsTuple?: []; params?: {} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.status': { paramsTuple?: []; params?: {} }
    'enrollment.health': { paramsTuple?: []; params?: {} }
    'finance.status': { paramsTuple?: []; params?: {} }
    'finance.health': { paramsTuple?: []; params?: {} }
    'records.status': { paramsTuple?: []; params?: {} }
    'records.health': { paramsTuple?: []; params?: {} }
    'library.status': { paramsTuple?: []; params?: {} }
    'library.health': { paramsTuple?: []; params?: {} }
    'documents.status': { paramsTuple?: []; params?: {} }
    'documents.health': { paramsTuple?: []; params?: {} }
    'inventory.status': { paramsTuple?: []; params?: {} }
    'inventory.health': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.index': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.status_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.applicants.admission_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.forms.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.forms.active': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.list': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.me': { paramsTuple?: []; params?: {} }
    'enrollment.students.me.profile': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.task_calendar': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.grade_feedback': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_policy': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.enrollment_workflow': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.curriculum_plan': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.open_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.course_choice': { paramsTuple?: []; params?: {} }
    'enrollment.students.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.classifications': { paramsTuple?: []; params?: {} }
    'enrollment.students.merge_jobs.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.index': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.batches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.import.batches.rejections_csv': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.absences': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.index': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.academic.subject_equivalencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.stored_conflicts': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_summary': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.my_waitlist': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.section_waitlist': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.list_meetings': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.export_section_roster': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.my_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.faculty_schedule_notifications': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_academic_years': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_programs': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.list_sections': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_categories': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_buildings': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.list_rooms': { paramsTuple?: []; params?: {} }
    'enrollment.academic_policies.show': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.show': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_colleges': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_positions': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_subject_areas': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.search_personnel': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.subjects.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.subjects.prerequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.corequisites.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.index': { paramsTuple?: []; params?: {} }
    'enrollment.academic.curricula.versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.index': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.enrollments.index': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.list_change_requests': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.workflow': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.advising.list_periods': { paramsTuple?: []; params?: {} }
    'enrollment.advising.session_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.list_recommendations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.curriculum_evaluation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.advising.history': { paramsTuple: [ParamValue]; params: {'enrollmentId': ParamValue} }
    'enrollment.advising.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.grades.index': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_schemes': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_deadlines': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.my_assignments': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.list_class_records': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.class_master_list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.export_grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.grade_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.list_corrections': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.entry_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.student_academic_records': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.assessments.index': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_aid_tags': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.list_documents': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.verify_document': { paramsTuple: [ParamValue]; params: {'qrToken': ParamValue} }
    'enrollment.assessment_finance.integration_history': { paramsTuple?: []; params?: {} }
    'enrollment.assessments.me.monitor': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.student_monitor': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.assessment_finance.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.payments.index': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.list_reports': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.show_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.reports.pdf': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.clearance.office_requirements.index': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.students.office': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.scholarships.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.display': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.reports.analytics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.queue.tickets.slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.office_report': { paramsTuple: [ParamValue]; params: {'office': ParamValue} }
    'enrollment.student_support.clearance_hints': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.cross_office_clearance': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.unified_profile': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.referrals': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.students.alerts': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.student_support.sensitive_access_log': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling.specialists': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.read_case_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.batteries': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.shifting.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.read_clinical_notes': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.health.programs.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.enrollment_gate': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.health.statistics': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.ehr': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.osa.discipline.cases.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.discipline.cases.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.history': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.osa.discipline.reports.cases': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.list_org_applications': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.get_org_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_organizations': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.organizations.certificate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.list_student_id_requests': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.id_requests.digital_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.students.participation': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.sss.scholarships.applications.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.awards.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.reports.assistance': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.index': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.index': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.compliance_report': { paramsTuple?: []; params?: {} }
    'enrollment.reports.catalog': { paramsTuple?: []; params?: {} }
    'enrollment.reports.definitions': { paramsTuple?: []; params?: {} }
    'enrollment.reports.dashboard': { paramsTuple?: []; params?: {} }
    'enrollment.reports.hemis_schema': { paramsTuple?: []; params?: {} }
    'enrollment.reports.export': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.reports.show': { paramsTuple: [ParamValue]; params: {'reportId': ParamValue} }
    'enrollment.announcements.settings_index': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.feed': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.campaigns_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_pending': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_index': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.codes_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.questions_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_index': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.assignment_options': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.pending': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.report': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.faculty_eval.report_export': { paramsTuple: [ParamValue]; params: {'scheduleId': ParamValue} }
    'enrollment.phase_2_records.index': { paramsTuple: [ParamValue]; params: {'moduleCode': ParamValue} }
    'enrollment.phase_2_modules.index': { paramsTuple?: []; params?: {} }
    'enrollment.internal.internal_grades.export_student_grades': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'enrollment.public.institutional_profile.show_logo': { paramsTuple: [ParamValue,ParamValue]; params: {'organizationId': ParamValue,'filename': ParamValue} }
    'enrollment.docs.swagger': { paramsTuple?: []; params?: {} }
    'enrollment.docs.openapi': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.verify_report': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.sss.osa.id_requests.digital_verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'enrollment.admissions.form.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.programs.public': { paramsTuple?: []; params?: {} }
    'enrollment.auth.me': { paramsTuple?: []; params?: {} }
    'enrollment.org.show': { paramsTuple?: []; params?: {} }
    'enrollment.org.list_campuses': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_offices': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.list_departments': { paramsTuple?: []; params?: {} }
    'enrollment.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.index': { paramsTuple?: []; params?: {} }
    'enrollment.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.permissions.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.index': { paramsTuple?: []; params?: {} }
    'enrollment.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.auth.me': { paramsTuple?: []; params?: {} }
    'finance.ufms.info': { paramsTuple?: []; params?: {} }
    'finance.dashboard.summary': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_funds': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_banks': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_bank_accounts': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_fiscal_periods': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_or_series': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.list_approval_workflows': { paramsTuple?: []; params?: {} }
    'finance.budget.list_plans': { paramsTuple?: []; params?: {} }
    'finance.budget.show_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_documents': { paramsTuple?: []; params?: {} }
    'finance.budget.show_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.list_obligations': { paramsTuple?: []; params?: {} }
    'finance.budget.show_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.monitor': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_journals': { paramsTuple?: []; params?: {} }
    'finance.accounting.show_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.list_ledger': { paramsTuple?: []; params?: {} }
    'finance.accounting.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.accounting.cash_flow': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_tax_rates': { paramsTuple?: []; params?: {} }
    'finance.accounting.remittance_report': { paramsTuple?: []; params?: {} }
    'finance.accounting.list_reconciliations': { paramsTuple?: []; params?: {} }
    'finance.receivables.list_payments': { paramsTuple?: []; params?: {} }
    'finance.receivables.student_account': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.receivables.daily_collection': { paramsTuple?: []; params?: {} }
    'finance.receivables.get_settings': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedule_scope': { paramsTuple?: []; params?: {} }
    'finance.tuition.list_fee_schedules': { paramsTuple?: []; params?: {} }
    'finance.tuition.get_payment_policy': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.list': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_invoices': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_dv': { paramsTuple?: []; params?: {} }
    'finance.disbursement.list_cheques': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.trial_balance': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.financial_position': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.budget_vs_actual': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.receivables_aging': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.saob': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.dashboard_metrics': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.audit_export': { paramsTuple?: []; params?: {} }
    'finance.official_forms.official_receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.disbursement_voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.budget_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.official_forms.bfar_pack': { paramsTuple?: []; params?: {} }
    'finance.official_forms.bir_withholding': { paramsTuple?: []; params?: {} }
    'finance.official_forms.agency_csv': { paramsTuple: [ParamValue]; params: {'agency': ParamValue} }
    'finance.procurement.list_vendors': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_requisitions': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_rfqs': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_purchase_orders': { paramsTuple?: []; params?: {} }
    'finance.procurement.show_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.list_iars': { paramsTuple?: []; params?: {} }
    'finance.procurement.monitor': { paramsTuple?: []; params?: {} }
    'finance.procurement.list_document_refs': { paramsTuple?: []; params?: {} }
    'finance.pos.list_terminals': { paramsTuple?: []; params?: {} }
    'finance.pos.list_catalog': { paramsTuple?: []; params?: {} }
    'finance.pos.list_sales': { paramsTuple?: []; params?: {} }
    'finance.pos.show_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.cashier_report': { paramsTuple?: []; params?: {} }
    'finance.pos.list_stock_snapshots': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'finance.internal.legacy.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'finance.internal.legacy.internal_assessments.payment_status': { paramsTuple: [ParamValue]; params: {'assessmentNumber': ParamValue} }
    'records.auth.me': { paramsTuple?: []; params?: {} }
    'records.tor.requests.index': { paramsTuple?: []; params?: {} }
    'records.tor.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.tor.preview_legacy': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.cert.types.index': { paramsTuple?: []; params?: {} }
    'records.cert.requests.index': { paramsTuple?: []; params?: {} }
    'records.cert.requests.show': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.academic': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.issuances': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.index_legacy': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.status': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_readiness': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.lookup_request': { paramsTuple: [ParamValue]; params: {'requestNumber': ParamValue} }
    'records.torms_foundation.list_sync_runs': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.list_discrepancies': { paramsTuple?: []; params?: {} }
    'records.tor.preview': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.index': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.me': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.standing': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'records.torms_alumni.show': { paramsTuple: [ParamValue]; params: {'idOrStudent': ParamValue} }
    'records.torms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'records.torms_reports.requests': { paramsTuple?: []; params?: {} }
    'records.torms_reports.issuances': { paramsTuple?: []; params?: {} }
    'library.docs.swagger': { paramsTuple?: []; params?: {} }
    'library.docs.openapi': { paramsTuple?: []; params?: {} }
    'library.tenants.resolve': { paramsTuple?: []; params?: {} }
    'library.public_opac.search': { paramsTuple?: []; params?: {} }
    'library.public_opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public_elibrary.search': { paramsTuple?: []; params?: {} }
    'library.public_elibrary.open_repository': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.public.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.public_locate': { paramsTuple?: []; params?: {} }
    'library.kiosk.session': { paramsTuple?: []; params?: {} }
    'library.kiosk.patron': { paramsTuple?: []; params?: {} }
    'library.kiosk.account': { paramsTuple?: []; params?: {} }
    'library.kiosk.history': { paramsTuple?: []; params?: {} }
    'library.auth.me': { paramsTuple?: []; params?: {} }
    'library.tenants.current': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.status': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'library.ulmis_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'library.users.index': { paramsTuple?: []; params?: {} }
    'library.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.categories': { paramsTuple?: []; params?: {} }
    'library.books.material_types': { paramsTuple?: []; params?: {} }
    'library.books.index': { paramsTuple?: []; params?: {} }
    'library.books.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.export_marc': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.copies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.list_digital_files': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.download_digital_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'fileId': ParamValue} }
    'library.members.pending': { paramsTuple?: []; params?: {} }
    'library.members.index': { paramsTuple?: []; params?: {} }
    'library.members.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.card': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.borrowing_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.dashboard': { paramsTuple?: []; params?: {} }
    'library.borrowings.loan_rules': { paramsTuple?: []; params?: {} }
    'library.borrowings.index': { paramsTuple?: []; params?: {} }
    'library.borrowings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.events': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.summary': { paramsTuple?: []; params?: {} }
    'library.fines.index': { paramsTuple?: []; params?: {} }
    'library.fines.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.payments': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.index': { paramsTuple?: []; params?: {} }
    'library.acquisitions.dashboard': { paramsTuple?: []; params?: {} }
    'library.acquisitions.index': { paramsTuple?: []; params?: {} }
    'library.acquisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reports.types': { paramsTuple?: []; params?: {} }
    'library.reports.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'library.search.index': { paramsTuple?: []; params?: {} }
    'library.search.recent': { paramsTuple?: []; params?: {} }
    'library.search.saved': { paramsTuple?: []; params?: {} }
    'library.ai.quick_actions': { paramsTuple?: []; params?: {} }
    'library.ai.conversations': { paramsTuple?: []; params?: {} }
    'library.ai.show_conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.analytics.dashboard': { paramsTuple?: []; params?: {} }
    'library.notifications.delivery_log': { paramsTuple?: []; params?: {} }
    'library.notifications.index': { paramsTuple?: []; params?: {} }
    'library.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'library.notifications.preferences': { paramsTuple?: []; params?: {} }
    'library.audit_logs.index': { paramsTuple?: []; params?: {} }
    'library.opac.search': { paramsTuple?: []; params?: {} }
    'library.opac.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.opac.cite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.me': { paramsTuple?: []; params?: {} }
    'library.portal.card': { paramsTuple?: []; params?: {} }
    'library.portal.notices': { paramsTuple?: []; params?: {} }
    'library.portal.reading_lists': { paramsTuple?: []; params?: {} }
    'library.digital.list_repository': { paramsTuple?: []; params?: {} }
    'library.digital.list_electronic': { paramsTuple?: []; params?: {} }
    'library.digital.unified_search': { paramsTuple?: []; params?: {} }
    'library.integrations.status': { paramsTuple?: []; params?: {} }
    'library.hardware.list_rfid': { paramsTuple?: []; params?: {} }
    'library.hardware.list_gate_events': { paramsTuple?: []; params?: {} }
    'library.hardware.list_shelf_counts': { paramsTuple?: []; params?: {} }
    'library.hardware.show_shelf_count': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.list_kiosks': { paramsTuple?: []; params?: {} }
    'library.hardware.list_kiosk_transactions': { paramsTuple?: []; params?: {} }
    'library.hardware.queue_analytics': { paramsTuple?: []; params?: {} }
    'library.hardware.queue_board': { paramsTuple?: []; params?: {} }
    'library.hardware.list_locations': { paramsTuple?: []; params?: {} }
    'library.hardware.locate': { paramsTuple?: []; params?: {} }
    'library.catalog_import.versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.attendance.summary': { paramsTuple?: []; params?: {} }
    'library.attendance.index': { paramsTuple?: []; params?: {} }
    'library.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
    'documents.documents.health.live': { paramsTuple?: []; params?: {} }
    'documents.documents.health.ready': { paramsTuple?: []; params?: {} }
    'documents.documents.metrics': { paramsTuple?: []; params?: {} }
    'documents.documents.public_track.show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.public_track.api_show': { paramsTuple: [ParamValue]; params: {'trackingNumber': ParamValue} }
    'documents.documents.tenant_assets.show': { paramsTuple: [ParamValue,ParamValue]; params: {'tenantId': ParamValue,'filename': ParamValue} }
    'documents.documents_hub.index': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.docs.swagger': { paramsTuple?: []; params?: {} }
    'documents.docs.openapi': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.public_show': { paramsTuple?: []; params?: {} }
    'documents.public.plans': { paramsTuple?: []; params?: {} }
    'documents.internal_files.download': { paramsTuple?: []; params?: {} }
    'documents.auth.validate_reset_token': { paramsTuple?: []; params?: {} }
    'documents.auth.verify_email': { paramsTuple?: []; params?: {} }
    'documents.oauth.redirect': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.oauth.callback': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'documents.admin_tenants.index': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_analytics.overview': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.revenue': { paramsTuple?: []; params?: {} }
    'documents.admin_analytics.tenant_usage': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.index': { paramsTuple?: []; params?: {} }
    'documents.admin_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_billing.overview': { paramsTuple?: []; params?: {} }
    'documents.auth.profile': { paramsTuple?: []; params?: {} }
    'documents.organization.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_settings.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.show': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.index': { paramsTuple?: []; params?: {} }
    'documents.subscription.show': { paramsTuple?: []; params?: {} }
    'documents.subscription.usage': { paramsTuple?: []; params?: {} }
    'documents.billing.plans': { paramsTuple?: []; params?: {} }
    'documents.billing.invoices': { paramsTuple?: []; params?: {} }
    'documents.billing.show_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.invoice_pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.usage_report': { paramsTuple?: []; params?: {} }
    'documents.sessions.index': { paramsTuple?: []; params?: {} }
    'documents.mfa.status': { paramsTuple?: []; params?: {} }
    'documents.permissions.index': { paramsTuple?: []; params?: {} }
    'documents.permissions.my_permissions': { paramsTuple?: []; params?: {} }
    'documents.roles.index': { paramsTuple?: []; params?: {} }
    'documents.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.users.index': { paramsTuple?: []; params?: {} }
    'documents.users.assignable_roles': { paramsTuple?: []; params?: {} }
    'documents.audit_logs.index': { paramsTuple?: []; params?: {} }
    'documents.audit_logs.verify_chain': { paramsTuple?: []; params?: {} }
    'documents.dashboard.stats': { paramsTuple?: []; params?: {} }
    'documents.dashboard.overview': { paramsTuple?: []; params?: {} }
    'documents.dashboard.trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.usage_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.files_trend': { paramsTuple?: []; params?: {} }
    'documents.dashboard.user_access': { paramsTuple?: []; params?: {} }
    'documents.search.index': { paramsTuple?: []; params?: {} }
    'documents.departments.index': { paramsTuple?: []; params?: {} }
    'documents.document_types.index': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.index': { paramsTuple?: []; params?: {} }
    'documents.records.inventory': { paramsTuple?: []; params?: {} }
    'documents.records.summary': { paramsTuple?: []; params?: {} }
    'documents.records.ops_report': { paramsTuple?: []; params?: {} }
    'documents.record_requests.index': { paramsTuple?: []; params?: {} }
    'documents.record_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.index': { paramsTuple?: []; params?: {} }
    'documents.digitization.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.index': { paramsTuple?: []; params?: {} }
    'documents.receiving.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.acknowledgment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.archives.show_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.archives.show_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.platform_documents.index': { paramsTuple?: []; params?: {} }
    'documents.platform_documents.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.search': { paramsTuple?: []; params?: {} }
    'documents.documents.departments': { paramsTuple?: []; params?: {} }
    'documents.documents.document_types': { paramsTuple?: []; params?: {} }
    'documents.document_versions.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_files.index': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_files.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.download': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.view': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_files.preview_html': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_intelligence.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_intelligence.job_status': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'jobId': ParamValue} }
    'documents.document_content.show': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.documents.index': { paramsTuple?: []; params?: {} }
    'documents.documents.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_approvals.workflow_state': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.timeline': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.approvals': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_approvals.activity': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.workflows.index': { paramsTuple?: []; params?: {} }
    'documents.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.notifications.index': { paramsTuple?: []; params?: {} }
    'documents.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.status': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_settings': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_contracts': { paramsTuple?: []; params?: {} }
    'documents.udms_foundation.list_outbox': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.list': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.list_file_plan': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.assigned_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.office_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.awaiting_queue': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.tracking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_versions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.list_archived': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_schedules': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_retention_due': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_transfers': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.list_disposals': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.dashboard': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.registration': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.workflow': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.archival': { paramsTuple?: []; params?: {} }
    'documents.udms_reports.printable': { paramsTuple?: []; params?: {} }
    'inventory.docs.swagger': { paramsTuple?: []; params?: {} }
    'inventory.docs.openapi': { paramsTuple?: []; params?: {} }
    'inventory.auth.me': { paramsTuple?: []; params?: {} }
    'inventory.dashboard.summary': { paramsTuple?: []; params?: {} }
    'inventory.org.show': { paramsTuple?: []; params?: {} }
    'inventory.org.list_campuses': { paramsTuple?: []; params?: {} }
    'inventory.org.get_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_offices': { paramsTuple?: []; params?: {} }
    'inventory.org.get_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.list_departments': { paramsTuple?: []; params?: {} }
    'inventory.org.get_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.index': { paramsTuple?: []; params?: {} }
    'inventory.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.permissions.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.index': { paramsTuple?: []; params?: {} }
    'inventory.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.index': { paramsTuple?: []; params?: {} }
    'inventory.item_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.index': { paramsTuple?: []; params?: {} }
    'inventory.items.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.index': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.list_bins': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.stock_movements.transactions': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.ledger': { paramsTuple: [ParamValue]; params: {'itemId': ParamValue} }
    'inventory.stock_movements.balances': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.index': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.index': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.index': { paramsTuple?: []; params?: {} }
    'inventory.coa.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.index': { paramsTuple?: []; params?: {} }
    'inventory.physical_counts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.depreciation.get_profile': { paramsTuple: [ParamValue]; params: {'assetId': ParamValue} }
    'inventory.depreciation.lapsing_schedule': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.stock_inventory': { paramsTuple?: []; params?: {} }
    'inventory.reports.property_ledger': { paramsTuple?: []; params?: {} }
    'inventory.reports.consumption': { paramsTuple?: []; params?: {} }
    'inventory.reports.depreciation': { paramsTuple?: []; params?: {} }
    'inventory.assets.index': { paramsTuple?: []; params?: {} }
    'inventory.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.audit_logs.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_custodianships.index': { paramsTuple?: []; params?: {} }
    'inventory.internal.internal_clearance.check_clearance': { paramsTuple: [ParamValue]; params: {'studentNumber': ParamValue} }
  }
  POST: {
    'mdm.create_university': { paramsTuple?: []; params?: {} }
    'mdm.create_campus': { paramsTuple?: []; params?: {} }
    'mdm.upsert_student_identity_ref': { paramsTuple?: []; params?: {} }
    'mdm.next_sequence_value': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'mdm.upsert_setting': { paramsTuple?: []; params?: {} }
    'integration.publish_event': { paramsTuple?: []; params?: {} }
    'integration.enqueue_notification': { paramsTuple?: []; params?: {} }
    'integration.upload_file': { paramsTuple?: []; params?: {} }
    'integration.upsert_clearance_requirement': { paramsTuple?: []; params?: {} }
    'integration.critical_echo': { paramsTuple?: []; params?: {} }
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.applicants.store': { paramsTuple?: []; params?: {} }
    'enrollment.applicants.admit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.forms.store': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.store': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.assign': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.events.record_result': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.select_course': { paramsTuple?: []; params?: {} }
    'enrollment.student_portal.start_enrollment': { paramsTuple?: []; params?: {} }
    'enrollment.students.merge': { paramsTuple?: []; params?: {} }
    'enrollment.students.import.run': { paramsTuple?: []; params?: {} }
    'enrollment.students.violations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.retry_platform_login': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.subject_credits.auto_internal': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.external': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.students.subject_credits.apply_equivalencies': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.academic.subject_equivalencies.store': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.upsert_meeting': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.check_conflicts': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.join_waitlist': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.waitlist.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.scheduling.waitlist.promote': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.meetings.conflicts': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.drop_line': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.transfer_line': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.dissolve_section': { paramsTuple: [ParamValue]; params: {'sectionId': ParamValue} }
    'enrollment.scheduling.mark_notification_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.scheduling.resolve_class_codes': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.search_alternate_sections': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.apply_class_codes': { paramsTuple?: []; params?: {} }
    'enrollment.scheduling.encode_block_group': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_academic_year': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_program': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.create_section': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.replicate_schedules': { paramsTuple?: []; params?: {} }
    'enrollment.academic_setup.bulk_update_section_status': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_category': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_building': { paramsTuple?: []; params?: {} }
    'enrollment.academic_facilities.create_room': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.upload_logo': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_college': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_department': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_position': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_subject_area': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.create_assignment': { paramsTuple?: []; params?: {} }
    'enrollment.subjects.store': { paramsTuple?: []; params?: {} }
    'enrollment.academic.subjects.prerequisites.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.corequisites.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.store': { paramsTuple?: []; params?: {} }
    'enrollment.academic.curricula.versions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.duplicate': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.store': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.enrollments.store': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.advise': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.assess': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.override': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.request_change': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.decide_change': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.upsert_change_window': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.upsert_unit_load_policy': { paramsTuple?: []; params?: {} }
    'enrollment.enrollments.verify_payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.registrar_approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.enrollments.incomplete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.assign_adviser': { paramsTuple?: []; params?: {} }
    'enrollment.advising.reassign_adviser': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.upsert_period': { paramsTuple?: []; params?: {} }
    'enrollment.advising.start_session': { paramsTuple?: []; params?: {} }
    'enrollment.advising.add_recommendation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.assign_course': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.endorse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.advising.waiver': { paramsTuple?: []; params?: {} }
    'enrollment.grades.submit': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.upsert_scheme': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.upsert_deadline': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.assign_faculty': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.open_class_record': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.enlist': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.encode': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.submit': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.request_correction': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.decide_correction': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.grade_records.compute_gwa': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.grade_records.convert_incompletes': { paramsTuple?: []; params?: {} }
    'enrollment.grade_records.record_attendance': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.prepare': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.upsert_fee_schedule': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.tag_aid': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.issue_document': { paramsTuple?: []; params?: {} }
    'enrollment.assessment_finance.submit_to_ufms': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.assessment_finance.sync_payment_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.payments.store': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.issue_report': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.office_requirements.store': { paramsTuple?: []; params?: {} }
    'enrollment.clearance.students.office_sync': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'enrollment.scholarships.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.assign_staff': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.create_request': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.queue_ticket': { paramsTuple?: []; params?: {} }
    'enrollment.sss.queue.tickets.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.referrals.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.counseling_request': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.counseling_requests.intake': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.sessions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.specialist_referral': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.counseling_requests.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.write_case_note': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.schedules.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.psych.results.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.guidance.shifting.schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.result_ready': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.endorse': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.health_encounter': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.health_clearance': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.programs.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.medical_assessments.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.conditions.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.alerts.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.prescriptions.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.health.hospital_referrals.store': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.discipline_complaint': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.discipline.cases.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.discipline.cases.sanctions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.submit_org_application': { paramsTuple?: []; params?: {} }
    'enrollment.sss.osa.org_applications.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.student_support.submit_student_id_request': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.scholarship_program': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.scholarship_apply': { paramsTuple?: []; params?: {} }
    'enrollment.student_support.scholarship_decide': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.store': { paramsTuple?: []; params?: {} }
    'enrollment.sss.scholarships.sa.interview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.store': { paramsTuple?: []; params?: {} }
    'enrollment.deficiencies.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.clear': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.store': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.dispatch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.toggle_like': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.add_comment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.preview_sms': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.queue_sms': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.store_contact': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_store': { paramsTuple?: []; params?: {} }
    'enrollment.mass_comms.surveys_publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.surveys_close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.mass_comms.surveys_respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.codes_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.questions_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_store': { paramsTuple?: []; params?: {} }
    'enrollment.faculty_eval.schedules_open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.schedules_close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.responses_store': { paramsTuple?: []; params?: {} }
    'enrollment.graduation.graduate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.phase_2_records.store': { paramsTuple: [ParamValue]; params: {'moduleCode': ParamValue} }
    'enrollment.auth.login': { paramsTuple?: []; params?: {} }
    'enrollment.auth.refresh': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.apply.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.status.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.journey.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.exam.open.public': { paramsTuple?: []; params?: {} }
    'enrollment.admissions.exam.submit.public': { paramsTuple?: []; params?: {} }
    'enrollment.auth.logout': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_campus': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_office': { paramsTuple?: []; params?: {} }
    'enrollment.org.create_department': { paramsTuple?: []; params?: {} }
    'enrollment.users.store': { paramsTuple?: []; params?: {} }
    'enrollment.roles.store': { paramsTuple?: []; params?: {} }
    'finance.auth.login': { paramsTuple?: []; params?: {} }
    'finance.auth.refresh': { paramsTuple?: []; params?: {} }
    'finance.auth.logout': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.seed_official_coa': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_fund': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_bank': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_bank_account': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_fiscal_period': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_or_series': { paramsTuple?: []; params?: {} }
    'finance.ufms_reference.store_approval_workflow': { paramsTuple?: []; params?: {} }
    'finance.budget.store_plan': { paramsTuple?: []; params?: {} }
    'finance.budget.submit_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.approve_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.reject_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.revise_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.store_document': { paramsTuple?: []; params?: {} }
    'finance.budget.submit_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.approve_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.reject_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.revise_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.store_obligation': { paramsTuple?: []; params?: {} }
    'finance.budget.post_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.cancel_obligation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.validate_availability': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_journal': { paramsTuple?: []; params?: {} }
    'finance.accounting.submit_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.post_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.revise_journal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.close_period': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.reopen_period': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.accounting.store_tax_rate': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_tax_entry': { paramsTuple?: []; params?: {} }
    'finance.accounting.mark_remitted': { paramsTuple?: []; params?: {} }
    'finance.accounting.store_reconciliation': { paramsTuple?: []; params?: {} }
    'finance.accounting.complete_reconciliation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.receivables.record_payment': { paramsTuple?: []; params?: {} }
    'finance.receivables.create_deposit_slip': { paramsTuple?: []; params?: {} }
    'finance.tuition.upsert_fee_schedule': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.upsert': { paramsTuple?: []; params?: {} }
    'finance.disbursement.store_invoice': { paramsTuple?: []; params?: {} }
    'finance.disbursement.match_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.store_dv': { paramsTuple?: []; params?: {} }
    'finance.disbursement.approve_dv': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.issue_cheque': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.disbursement.record_ada': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.financial_reports.export_agency': { paramsTuple: [ParamValue]; params: {'agency': ParamValue} }
    'finance.financial_reports.push_uims': { paramsTuple?: []; params?: {} }
    'finance.financial_reports.decide_approval': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.store_vendor': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_requisition': { paramsTuple?: []; params?: {} }
    'finance.procurement.submit_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.approve_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.reject_requisition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.store_rfq': { paramsTuple?: []; params?: {} }
    'finance.procurement.issue_rfq': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.close_rfq': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.store_quotation': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_abstract': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_award': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_purchase_order': { paramsTuple?: []; params?: {} }
    'finance.procurement.approve_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.issue_purchase_order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.finance.procurement.createPurchaseOrder': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_delivery': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_iar': { paramsTuple?: []; params?: {} }
    'finance.procurement.store_document_ref': { paramsTuple?: []; params?: {} }
    'finance.pos.store_terminal': { paramsTuple?: []; params?: {} }
    'finance.pos.store_catalog_item': { paramsTuple?: []; params?: {} }
    'finance.pos.store_sale': { paramsTuple?: []; params?: {} }
    'finance.pos.complete_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.void_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.refund_sale': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.close_eod': { paramsTuple?: []; params?: {} }
    'finance.pos.record_sale': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_cashier.record_payment': { paramsTuple?: []; params?: {} }
    'finance.internal.internal_assessments.upsert': { paramsTuple?: []; params?: {} }
    'finance.internal.internal.procurement.createPurchaseOrder': { paramsTuple?: []; params?: {} }
    'finance.internal.legacy.internal_cashier.record_payment': { paramsTuple?: []; params?: {} }
    'finance.internal.legacy.internal_assessments.upsert': { paramsTuple?: []; params?: {} }
    'document_issuance.verify_public': { paramsTuple?: []; params?: {} }
    'records.auth.login': { paramsTuple?: []; params?: {} }
    'records.auth.refresh': { paramsTuple?: []; params?: {} }
    'records.auth.logout': { paramsTuple?: []; params?: {} }
    'records.tor.requests.submit': { paramsTuple?: []; params?: {} }
    'records.tor.requests.transition': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.confirm_physical': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.attachments': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.verify_payment': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.requests.generate': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.tor.issuances.issue': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.tor.issuances.print': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.tor.request_legacy': { paramsTuple?: []; params?: {} }
    'records.cert.requests.submit': { paramsTuple?: []; params?: {} }
    'records.cert.requests.transition': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.attachments': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.verify_payment': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.requests.generate': { paramsTuple: [ParamValue]; params: {'idOrNumber': ParamValue} }
    'records.cert.issuances.issue': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.cert.issuances.print': { paramsTuple: [ParamValue]; params: {'issuanceId': ParamValue} }
    'records.cert.store_legacy': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.probe_integrations': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_reference': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.archive_route': { paramsTuple?: []; params?: {} }
    'records.torms_foundation.pull_usis_grades': { paramsTuple?: []; params?: {} }
    'records.internal.internal_grades.sync_grades': { paramsTuple?: []; params?: {} }
    'records.internal.alumni.create_from_graduation': { paramsTuple?: []; params?: {} }
    'records.internal.legacy.internal_grades.sync_grades': { paramsTuple?: []; params?: {} }
    'records.internal.legacy.alumni.create_from_graduation': { paramsTuple?: []; params?: {} }
    'library.register.store': { paramsTuple?: []; params?: {} }
    'library.auth.login': { paramsTuple?: []; params?: {} }
    'library.auth.refresh': { paramsTuple?: []; params?: {} }
    'library.public_elibrary.open_electronic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.kiosk.heartbeat': { paramsTuple?: []; params?: {} }
    'library.kiosk.checkout': { paramsTuple?: []; params?: {} }
    'library.kiosk.renew': { paramsTuple?: []; params?: {} }
    'library.kiosk.return_item': { paramsTuple?: []; params?: {} }
    'library.auth.logout': { paramsTuple?: []; params?: {} }
    'library.users.store': { paramsTuple?: []; params?: {} }
    'library.books.batch_destroy': { paramsTuple?: []; params?: {} }
    'library.books.batch_update': { paramsTuple?: []; params?: {} }
    'library.books.store': { paramsTuple?: []; params?: {} }
    'library.books.add_copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.upload_digital_file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.store': { paramsTuple?: []; params?: {} }
    'library.members.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.members.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.request': { paramsTuple?: []; params?: {} }
    'library.borrowings.direct_checkout': { paramsTuple?: []; params?: {} }
    'library.borrowings.batch_checkout': { paramsTuple?: []; params?: {} }
    'library.borrowings.batch_checkin': { paramsTuple?: []; params?: {} }
    'library.borrowings.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.checkout': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.return': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.mark_lost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.store': { paramsTuple?: []; params?: {} }
    'library.fines.waive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.fines.collect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.store': { paramsTuple?: []; params?: {} }
    'library.reservations.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.reservations.fulfill': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.store': { paramsTuple?: []; params?: {} }
    'library.acquisitions.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.route': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.link_catalog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.search.store_saved': { paramsTuple?: []; params?: {} }
    'library.ai.chat': { paramsTuple?: []; params?: {} }
    'library.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'library.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.read_notice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.renew': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.reserve': { paramsTuple?: []; params?: {} }
    'library.portal.cancel_reservation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.create_reading_list': { paramsTuple?: []; params?: {} }
    'library.portal.add_reading_list_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.request_acquisition': { paramsTuple?: []; params?: {} }
    'library.digital.create_repository': { paramsTuple?: []; params?: {} }
    'library.digital.access_repository': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.digital.create_electronic': { paramsTuple?: []; params?: {} }
    'library.digital.open_electronic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.integrations.sync_enrollment': { paramsTuple?: []; params?: {} }
    'library.integrations.sync_aris': { paramsTuple?: []; params?: {} }
    'library.integrations.sync_hris': { paramsTuple?: []; params?: {} }
    'library.integrations.ldap_auth': { paramsTuple?: []; params?: {} }
    'library.integrations.smart_campus_sso': { paramsTuple?: []; params?: {} }
    'library.hardware.register_rfid': { paramsTuple?: []; params?: {} }
    'library.hardware.rfid_checkout': { paramsTuple?: []; params?: {} }
    'library.hardware.rfid_checkin': { paramsTuple?: []; params?: {} }
    'library.hardware.read_gate': { paramsTuple?: []; params?: {} }
    'library.hardware.start_shelf_count': { paramsTuple?: []; params?: {} }
    'library.hardware.add_shelf_scan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.upsert_kiosk': { paramsTuple?: []; params?: {} }
    'library.hardware.rotate_kiosk_key': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.issue_ticket': { paramsTuple?: []; params?: {} }
    'library.hardware.call_next': { paramsTuple?: []; params?: {} }
    'library.hardware.complete_ticket': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.hardware.upsert_location': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_csv': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_marc': { paramsTuple?: []; params?: {} }
    'library.catalog_import.import_xlsx': { paramsTuple?: []; params?: {} }
    'library.attendance.store': { paramsTuple?: []; params?: {} }
    'documents.webhooks.billing.stripe': { paramsTuple?: []; params?: {} }
    'documents.webhooks.billing.paymongo': { paramsTuple?: []; params?: {} }
    'documents.webhooks.billing.stub': { paramsTuple?: []; params?: {} }
    'documents.webhooks.pandadoc': { paramsTuple?: []; params?: {} }
    'documents.documents_hub.store': { paramsTuple?: []; params?: {} }
    'documents.auth.register': { paramsTuple?: []; params?: {} }
    'documents.auth.login': { paramsTuple?: []; params?: {} }
    'documents.auth.mfa_challenge': { paramsTuple?: []; params?: {} }
    'documents.auth.refresh': { paramsTuple?: []; params?: {} }
    'documents.auth.forgot_password': { paramsTuple?: []; params?: {} }
    'documents.auth.reset_password': { paramsTuple?: []; params?: {} }
    'documents.auth.resend_verification': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.store': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_tenants.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_plans.store': { paramsTuple?: []; params?: {} }
    'documents.auth.logout': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.upload_logo': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.store': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.verify': { paramsTuple?: []; params?: {} }
    'documents.tenant_domains.set_primary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.billing.checkout': { paramsTuple?: []; params?: {} }
    'documents.billing.upgrade': { paramsTuple?: []; params?: {} }
    'documents.billing.downgrade': { paramsTuple?: []; params?: {} }
    'documents.billing.cancel': { paramsTuple?: []; params?: {} }
    'documents.billing.validate_coupon': { paramsTuple?: []; params?: {} }
    'documents.billing.record_usage': { paramsTuple?: []; params?: {} }
    'documents.sessions.destroy_all': { paramsTuple?: []; params?: {} }
    'documents.mfa.setup': { paramsTuple?: []; params?: {} }
    'documents.mfa.enable': { paramsTuple?: []; params?: {} }
    'documents.mfa.disable': { paramsTuple?: []; params?: {} }
    'documents.roles.store': { paramsTuple?: []; params?: {} }
    'documents.roles.assign_to_user': { paramsTuple: [ParamValue]; params: {'userId': ParamValue} }
    'documents.users.store': { paramsTuple?: []; params?: {} }
    'documents.search.search_by_image': { paramsTuple?: []; params?: {} }
    'documents.copilot.chat': { paramsTuple?: []; params?: {} }
    'documents.copilot.confirm': { paramsTuple?: []; params?: {} }
    'documents.copilot.cancel': { paramsTuple?: []; params?: {} }
    'documents.departments.store': { paramsTuple?: []; params?: {} }
    'documents.document_types.store': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.store': { paramsTuple?: []; params?: {} }
    'documents.retention_schedules.apply_agency_packs': { paramsTuple?: []; params?: {} }
    'documents.records.update_lifecycle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.store': { paramsTuple?: []; params?: {} }
    'documents.record_requests.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.deny': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.release': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.return_items': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.record_requests.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.store': { paramsTuple?: []; params?: {} }
    'documents.digitization.add_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.digitization.ingest': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.run_ocr': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.submit_qa': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.digitization.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.receiving.store': { paramsTuple?: []; params?: {} }
    'documents.receiving.register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.set_legal_hold': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.archives.create_transfer': { paramsTuple?: []; params?: {} }
    'documents.archives.approve_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.complete_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.create_disposal': { paramsTuple?: []; params?: {} }
    'documents.archives.approve_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.archives.execute_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_versions.store': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_versions.submit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.store': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.presign': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.complete_presigned': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'versionId': ParamValue} }
    'documents.document_files.replace': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_intelligence.analyze': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_views.store': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.documents.store': { paramsTuple?: []; params?: {} }
    'documents.documents.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.documents.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.start': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.place_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.finalize': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_esign.sync': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_approvals.bulk_act': { paramsTuple?: []; params?: {} }
    'documents.document_approvals.act': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.workflows.store': { paramsTuple?: []; params?: {} }
    'documents.workflows.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.simulate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_type_workflows.assign': { paramsTuple: [ParamValue]; params: {'documentTypeId': ParamValue} }
    'documents.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'documents.push_tokens.store': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.register': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.create_file_plan': { paramsTuple?: []; params?: {} }
    'documents.udms_workflow.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.route': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_workflow.act': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.create_version': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.apply_retention': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.set_lifecycle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.set_legal_hold': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.create_transfer': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.approve_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.complete_transfer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.create_disposal': { paramsTuple?: []; params?: {} }
    'documents.udms_lifecycle.approve_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_lifecycle.execute_disposal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.auth.login': { paramsTuple?: []; params?: {} }
    'inventory.auth.refresh': { paramsTuple?: []; params?: {} }
    'inventory.auth.logout': { paramsTuple?: []; params?: {} }
    'inventory.org.create_campus': { paramsTuple?: []; params?: {} }
    'inventory.org.create_office': { paramsTuple?: []; params?: {} }
    'inventory.org.create_department': { paramsTuple?: []; params?: {} }
    'inventory.users.store': { paramsTuple?: []; params?: {} }
    'inventory.roles.store': { paramsTuple?: []; params?: {} }
    'inventory.item_categories.store': { paramsTuple?: []; params?: {} }
    'inventory.items.store': { paramsTuple?: []; params?: {} }
    'inventory.items.import_csv': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.store': { paramsTuple?: []; params?: {} }
    'inventory.warehouses.create_bin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.stock_movements.beginning': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.receive': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.issue': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.transfer': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.adjust': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.return_stock': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.disposal': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.reserve': { paramsTuple?: []; params?: {} }
    'inventory.stock_movements.release': { paramsTuple?: []; params?: {} }
    'inventory.suppliers.store': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.store': { paramsTuple?: []; params?: {} }
    'inventory.requisitions.submit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.requisitions.fulfill': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.store': { paramsTuple?: []; params?: {} }
    'inventory.coa.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.store': { paramsTuple?: []; params?: {} }
    'inventory.physical_counts.scan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.reconcile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.physical_counts.close': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.depreciation.create_profile': { paramsTuple?: []; params?: {} }
    'inventory.depreciation.run': { paramsTuple?: []; params?: {} }
    'inventory.assets.store': { paramsTuple?: []; params?: {} }
    'inventory.assets.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.return_asset': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.retire': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.schedule_maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.generate_qr': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.internal.internal_procurement_acceptance.accept': { paramsTuple?: []; params?: {} }
  }
  OPTIONS: {
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
  }
  PUT: {
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'finance.ufms_reference.update_coa': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.budget.update_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.receivables.update_settings': { paramsTuple?: []; params?: {} }
    'finance.tuition.update_fee_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.tuition.upsert_payment_policy': { paramsTuple?: []; params?: {} }
    'finance.payment_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.procurement.update_vendor': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.update_terminal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.update_catalog_item': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.pos.upsert_stock_snapshot': { paramsTuple?: []; params?: {} }
    'records.cert.types.update': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'records.torms_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'records.torms_alumni.update': { paramsTuple: [ParamValue]; params: {'idOrStudent': ParamValue} }
    'library.ulmis_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'documents.admin_tenants.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.admin_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.organization.update': { paramsTuple?: []; params?: {} }
    'documents.tenant_settings.update': { paramsTuple?: []; params?: {} }
    'documents.tenant_branding.update': { paramsTuple?: []; params?: {} }
    'documents.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.update_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.departments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_types.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.retention_schedules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_files.save_edit': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.document_intelligence.correct_metadata': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.document_content.update': { paramsTuple: [ParamValue]; params: {'documentId': ParamValue} }
    'documents.documents.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_foundation.upsert_setting': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.update_metadata': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.udms_repository.update_file_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.applicants.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.admissions.events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.violations.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'violationId': ParamValue} }
    'enrollment.students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.students.subject_credits.review': { paramsTuple: [ParamValue,ParamValue]; params: {'studentId': ParamValue,'creditId': ParamValue} }
    'enrollment.scheduling.update_meeting': { paramsTuple: [ParamValue]; params: {'meetingId': ParamValue} }
    'enrollment.academic_setup.update_academic_year': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.update_program': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.update_section': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_policies.update': { paramsTuple?: []; params?: {} }
    'enrollment.institutional_profile.update': { paramsTuple?: []; params?: {} }
    'enrollment.academic_structure.update_college': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.update_position': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.update_subject_area': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_structure.update_assignment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curricula.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.status': { paramsTuple: [ParamValue]; params: {'versionId': ParamValue} }
    'enrollment.clearance.office_items.advance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.psych.schedules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.guidance.shifting.requirements': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.osa.id_requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.sss.scholarships.sa.requirements': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.deficiencies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.announcements.settings_update': { paramsTuple?: []; params?: {} }
    'enrollment.announcements.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.faculty_eval.schedules_window': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update': { paramsTuple?: []; params?: {} }
    'enrollment.org.update_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.tenants.update': { paramsTuple?: []; params?: {} }
    'library.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.update_copy': { paramsTuple: [ParamValue,ParamValue]; params: {'bookId': ParamValue,'copyId': ParamValue} }
    'library.members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.borrowings.update_loan_rules': { paramsTuple?: []; params?: {} }
    'library.fines.adjust': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.acquisitions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.notifications.update_preference': { paramsTuple?: []; params?: {} }
    'library.hardware.set_kiosk_enabled': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update': { paramsTuple?: []; params?: {} }
    'inventory.org.update_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.update_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.suppliers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.coa.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.complete_maintenance': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'maintenanceId': ParamValue} }
  }
  DELETE: {
    'gateway.proxy': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'system': ParamValue,'*': ParamValue[]} }
    'common_platform.auth': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.admin': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'common_platform.integrations': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'enrollment.scheduling.delete_meeting': { paramsTuple: [ParamValue]; params: {'meetingId': ParamValue} }
    'enrollment.academic_setup.delete_academic_year': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.delete_program': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic_setup.delete_section': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.subjects.prerequisites.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'linkId': ParamValue} }
    'enrollment.academic.subjects.corequisites.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'linkId': ParamValue} }
    'enrollment.academic.curricula.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.academic.curriculum_versions.subjects.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'versionId': ParamValue,'lineId': ParamValue} }
    'enrollment.advising.remove_recommendation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'recommendationId': ParamValue} }
    'enrollment.deficiencies.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.org.delete_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'enrollment.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.tuition.deactivate_fee_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'finance.payment_plans.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.books.destroy_copy': { paramsTuple: [ParamValue,ParamValue]; params: {'bookId': ParamValue,'copyId': ParamValue} }
    'library.members.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.search.destroy_saved': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.ai.destroy_conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.delete_reading_list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.portal.remove_reading_list_item': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'itemId': ParamValue} }
    'documents.admin_tenants.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.tenant_domains.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.sessions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.departments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_types.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.retention_schedules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.document_files.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'documentId': ParamValue,'fileId': ParamValue} }
    'documents.documents.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'documents.push_tokens.destroy': { paramsTuple?: []; params?: {} }
    'documents.udms_repository.destroy_file_plan': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_campus': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_office': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.org.delete_department': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.item_categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.items.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.warehouses.delete_bin': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'binId': ParamValue} }
    'inventory.suppliers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inventory.assets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}