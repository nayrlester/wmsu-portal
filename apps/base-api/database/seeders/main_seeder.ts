import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import { seedUimsDemoData } from '#modules/finance/domain/seed_demo_data'

export default class extends BaseSeeder {
  async run() {
    const healthExists = await db
      .from('infra_health_checks')
      .where('component', 'bootstrap')
      .first()
    if (!healthExists) {
      await db.table('infra_health_checks').insert({
        component: 'bootstrap',
        status: 'ok',
        detail: 'Platform infrastructure seeder',
        checked_at: new Date(),
        created_at: new Date(),
      })
    }

    await this.seedMdmDev()
    await this.seedIntegrationDev()
    await seedUimsDemoData('UNI')

    const { seedAcademicSetup } = await import('#modules/enrollment/domain/seed_academic_setup')
    await seedAcademicSetup('UNI')
  }

  private async seedIntegrationDev() {
    const now = new Date()
    const existingType = await db
      .from('cis_clearance_requirement_types')
      .where('code', 'DEV-ACAD-HOLD')
      .first()
    if (existingType) return

    const types = [
      {
        id: 'c1111111-1111-4111-8111-111111111101',
        code: 'DEV-ACAD-HOLD',
        name: 'DEV Academic/Registrar clearance (Seed)',
        office_code: 'ACADEMIC',
        description: 'Configurable academic clearance requirement — DEV seed only',
        requires_university_approval: false,
        policy_status: 'approved',
      },
      {
        id: 'c1111111-1111-4111-8111-111111111102',
        code: 'DEV-FIN-HOLD',
        name: 'DEV Finance clearance (Seed)',
        office_code: 'FINANCE',
        description: 'Configurable finance clearance requirement — DEV seed only',
        requires_university_approval: false,
        policy_status: 'approved',
      },
      {
        id: 'c1111111-1111-4111-8111-111111111103',
        code: 'DEV-LIB-HOLD',
        name: 'DEV Library clearance (Seed)',
        office_code: 'LIBRARY',
        description: 'Configurable library clearance requirement — DEV seed only',
        requires_university_approval: false,
        policy_status: 'approved',
      },
      {
        id: 'c1111111-1111-4111-8111-111111111104',
        code: 'DEV-INV-HOLD',
        name: 'DEV Inventory/Property clearance (Seed)',
        office_code: 'INVENTORY',
        description: 'Configurable inventory clearance requirement — DEV seed only',
        requires_university_approval: false,
        policy_status: 'approved',
      },
      {
        id: 'c1111111-1111-4111-8111-111111111105',
        code: 'DEV-OTHER-PENDING',
        name: 'DEV Other office clearance pending university approval (Seed)',
        office_code: 'OTHER',
        description:
          'Example type flagged as requiring university approval — cannot receive live requirements until approved',
        requires_university_approval: true,
        policy_status: 'pending_university_approval',
      },
    ]

    for (const type of types) {
      await db.table('cis_clearance_requirement_types').insert({
        ...type,
        is_active: true,
        is_development_seed: true,
        created_at: now,
        updated_at: now,
      })
    }

    await db.table('cis_event_subscriptions').insert([
      {
        id: 'c1111111-1111-4111-8111-111111111201',
        event_type: 'clearance.requirement.updated',
        subscriber_code: 'platform-audit',
        handler_name: 'audit.mirror',
        enabled: true,
        is_development_seed: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c1111111-1111-4111-8111-111111111202',
        event_type: 'clearance.requirement.updated',
        subscriber_code: 'platform-notify',
        handler_name: 'notification.echo',
        enabled: true,
        is_development_seed: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c1111111-1111-4111-8111-111111111203',
        event_type: 'integration.ping',
        subscriber_code: 'platform-audit',
        handler_name: 'audit.mirror',
        enabled: true,
        is_development_seed: true,
        created_at: now,
        updated_at: now,
      },
    ])

    await db.table('cis_notification_templates').insert({
      id: 'c1111111-1111-4111-8111-111111111301',
      code: 'DEV-EVENT-ECHO',
      channel: 'in_app',
      subject_template: 'Domain event {{eventType}}',
      body_template: 'Foundation notification for domain event processing',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
  }

  private async seedMdmDev() {
    const universityId = 'a1111111-1111-4111-8111-111111111111'
    const existing = await db.from('mdm_universities').where('id', universityId).first()
    if (existing) return

    const campusId = 'a1111111-1111-4111-8111-111111111112'
    const collegeId = 'a1111111-1111-4111-8111-111111111113'
    const departmentId = 'a1111111-1111-4111-8111-111111111114'
    const officeId = 'a1111111-1111-4111-8111-111111111115'
    const yearId = 'a1111111-1111-4111-8111-111111111116'
    const termId = 'a1111111-1111-4111-8111-111111111117'
    const countryId = 'a1111111-1111-4111-8111-111111111118'
    const regionId = 'a1111111-1111-4111-8111-111111111119'
    const employeeId = 'b1111111-1111-4111-8111-11111111111a'
    const studentRefId = 'b1111111-1111-4111-8111-11111111111b'
    const sequenceId = 'b1111111-1111-4111-8111-11111111111c'
    const settingId = 'b1111111-1111-4111-8111-11111111111d'
    const addressId = 'b1111111-1111-4111-8111-11111111111e'
    const now = new Date()

    await db.table('mdm_universities').insert({
      id: universityId,
      code: 'DEV-WMSU',
      name: 'DEV Western Mindanao State University (Seed)',
      legal_name: 'DEV Seed University — not production',
      short_name: 'DEV-WMSU',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_campuses').insert({
      id: campusId,
      university_id: universityId,
      code: 'DEV-MAIN',
      name: 'DEV Main Campus (Seed)',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_colleges').insert({
      id: collegeId,
      university_id: universityId,
      campus_id: campusId,
      code: 'DEV-CCS',
      name: 'DEV College of Computing Studies (Seed)',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_departments').insert({
      id: departmentId,
      college_id: collegeId,
      code: 'DEV-IT',
      name: 'DEV Information Technology Department (Seed)',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_offices').insert({
      id: officeId,
      university_id: universityId,
      campus_id: campusId,
      code: 'DEV-REG',
      name: 'DEV Registrar Office (Seed)',
      office_type: 'academic_admin',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_academic_years').insert({
      id: yearId,
      university_id: universityId,
      code: 'DEV-2025-2026',
      name: 'DEV Academic Year 2025-2026 (Seed)',
      starts_on: '2025-08-01',
      ends_on: '2026-07-31',
      is_current: true,
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_terms').insert({
      id: termId,
      academic_year_id: yearId,
      code: 'DEV-S1',
      name: 'DEV First Semester (Seed)',
      term_type: 'semester',
      sequence_no: 1,
      starts_on: '2025-08-01',
      ends_on: '2025-12-20',
      is_current: true,
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_countries').insert({
      id: countryId,
      iso2: 'PH',
      iso3: 'PHL',
      name: 'Philippines',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_regions').insert({
      id: regionId,
      country_id: countryId,
      code: 'DEV-ZAM',
      name: 'DEV Zamboanga Region (Seed)',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_contact_addresses').insert({
      id: addressId,
      owner_type: 'university',
      owner_id: universityId,
      label: 'primary',
      line1: 'DEV Seed Address Line 1',
      city: 'DEV Seed City',
      region_id: regionId,
      country_id: countryId,
      postal_code: '7000',
      email: 'dev-seed@example.invalid',
      is_primary: true,
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_employee_refs').insert({
      id: employeeId,
      university_id: universityId,
      office_id: officeId,
      department_id: departmentId,
      employee_number: 'DEV-EMP-0001',
      full_name: 'DEV Seed Employee',
      email: 'dev.employee@example.invalid',
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_student_identity_refs').insert({
      id: studentRefId,
      university_id: universityId,
      student_number: 'DEV-STU-0001',
      usis_student_id: studentRefId,
      display_name: 'DEV Seed Student',
      email: 'dev.student@example.invalid',
      status: 'active',
      source_system: 'usis',
      projected_at: now,
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_number_sequences').insert({
      id: sequenceId,
      university_id: universityId,
      code: 'DEV-OR',
      name: 'DEV Official Receipt Sequence (Seed)',
      prefix: 'DEVOR',
      next_value: 1,
      padding: 6,
      status: 'active',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
    await db.table('mdm_system_settings').insert({
      id: settingId,
      university_id: universityId,
      key: 'mdm.seed.notice',
      value: { message: 'Development seed only — not official WMSU organizational data' },
      description: 'Marker setting for DEV MDM seed pack',
      is_development_seed: true,
      created_at: now,
      updated_at: now,
    })
  }
}
