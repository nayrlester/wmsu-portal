import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  User,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  Wallet,
  Award,
  HeartHandshake,
  Ticket,
  Users,
  School,
  PenLine,
  History,
  Building2,
  Stethoscope,
  Scale,
  BadgePercent,
  UserRoundPlus,
  Layers,
  ShieldCheck,
  Undo2,
  ScrollText,
  BarChart3,
  Megaphone,
  ClipboardCheck,
  Settings,
} from 'lucide-react'
import {
  hasAnyPermission,
  hasStudentPortalAccess,
  USIS_STUDENT_NAV_PERMISSIONS,
} from '@/lib/permissions'

const STUDENT_NAV_PERMS = [...USIS_STUDENT_NAV_PERMISSIONS]

export type UsisNavItem = {
  id: string
  label: string
  path: string
  icon: LucideIcon
  permissions: string[]
}

export type UsisNavGroup = {
  id: string
  label: string
  items: UsisNavItem[]
}

export const NAV_GROUPS: UsisNavGroup[] = [
  {
    id: 'student',
    label: 'Student portal',
    items: [
      {
        id: 'stu-dash',
        label: 'Dashboard',
        path: '/student',
        icon: LayoutDashboard,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-profile',
        label: 'Profile',
        path: '/student/profile',
        icon: User,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-admission',
        label: 'Admission status',
        path: '/student/admission',
        icon: UserRoundPlus,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-enroll',
        label: 'Enrollment',
        path: '/student/enrollment',
        icon: ClipboardList,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-advise',
        label: 'Academic advising',
        path: '/student/advising',
        icon: School,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-subjects',
        label: 'Subject selection',
        path: '/student/subjects',
        icon: BookOpen,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-schedule',
        label: 'Class schedule',
        path: '/student/schedule',
        icon: Calendar,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-tasks',
        label: 'Task calendar',
        path: '/student/task-calendar',
        icon: Calendar,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-status',
        label: 'Enrollment status',
        path: '/student/status',
        icon: ShieldCheck,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-assess',
        label: 'Assessment forms',
        path: '/student/assessments',
        icon: FileText,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-pay',
        label: 'Payment status',
        path: '/student/payments',
        icon: Wallet,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-cor',
        label: 'Certificate of Registration',
        path: '/student/cor',
        icon: Award,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-grades',
        label: 'Grades',
        path: '/student/grades',
        icon: GraduationCap,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-history',
        label: 'Academic history',
        path: '/student/history',
        icon: History,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-req',
        label: 'Requirements',
        path: '/student/requirements',
        icon: Layers,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-schol',
        label: 'Scholarships',
        path: '/student/scholarships',
        icon: BadgePercent,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-sss',
        label: 'Support requests',
        path: '/student/support',
        icon: HeartHandshake,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-queue',
        label: 'Queue / appointments',
        path: '/student/queue',
        icon: Ticket,
        permissions: STUDENT_NAV_PERMS,
      },
      {
        id: 'stu-clear',
        label: 'Clearance certificate',
        path: '/student/clearance',
        icon: ShieldCheck,
        permissions: ['clearance.read'],
      },
      {
        id: 'stu-faculty-eval',
        label: 'Faculty evaluation',
        path: '/student/faculty-eval',
        icon: ClipboardCheck,
        permissions: ['faculty_eval.submit'],
      },
    ],
  },
  {
    id: 'faculty',
    label: 'Faculty portal',
    items: [
      {
        id: 'fac-dash',
        label: 'Dashboard',
        path: '/faculty',
        icon: LayoutDashboard,
        permissions: ['grades.write', 'advising.write'],
      },
      {
        id: 'fac-classes',
        label: 'Assigned classes',
        path: '/faculty/classes',
        icon: Users,
        permissions: ['grades.write'],
      },
      {
        id: 'fac-master',
        label: 'Class master lists',
        path: '/faculty/master-lists',
        icon: ClipboardList,
        permissions: ['grades.write'],
      },
      {
        id: 'fac-encode',
        label: 'Grade encoding',
        path: '/faculty/grades/encode',
        icon: PenLine,
        permissions: ['grades.write'],
      },
      {
        id: 'fac-submit',
        label: 'Grade submission',
        path: '/faculty/grades/submit',
        icon: FileText,
        permissions: ['grades.write'],
      },
      {
        id: 'fac-corr',
        label: 'Grade corrections',
        path: '/faculty/grades/corrections',
        icon: Undo2,
        permissions: ['grades.write', 'grades.approve'],
      },
      {
        id: 'fac-advise',
        label: 'Academic advising',
        path: '/faculty/advising',
        icon: School,
        permissions: ['advising.write', 'advising.read'],
      },
      {
        id: 'fac-ahist',
        label: 'Advising history',
        path: '/faculty/advising/history',
        icon: ScrollText,
        permissions: ['advising.read'],
      },
    ],
  },
  {
    id: 'registrar',
    label: 'Registrar portal',
    items: [
      {
        id: 'reg-dash',
        label: 'Dashboard',
        path: '/registrar',
        icon: LayoutDashboard,
        permissions: ['enrollments.read', 'applicants.read', 'students.read'],
      },
      {
        id: 'reg-app',
        label: 'Applicants',
        path: '/registrar/applicants',
        icon: UserRoundPlus,
        permissions: ['applicants.read'],
      },
      {
        id: 'reg-stu',
        label: 'Student records',
        path: '/registrar/students',
        icon: GraduationCap,
        permissions: ['students.read'],
      },
      {
        id: 'reg-req',
        label: 'Student requirements',
        path: '/registrar/requirements',
        icon: Layers,
        permissions: ['deficiencies.read'],
      },
      {
        id: 'reg-enr',
        label: 'Enrollment management',
        path: '/registrar/enrollments',
        icon: ClipboardList,
        permissions: ['enrollments.read'],
      },
      {
        id: 'reg-approve',
        label: 'Registration approval',
        path: '/registrar/registration',
        icon: ShieldCheck,
        permissions: ['enrollments.write'],
      },
      {
        id: 'reg-acad',
        label: 'Academic structure',
        path: '/registrar/academic',
        icon: Building2,
        permissions: ['academic.read', 'academic.write'],
      },
      {
        id: 'reg-curr',
        label: 'Curriculum',
        path: '/registrar/curriculum',
        icon: BookOpen,
        permissions: ['academic.read'],
      },
      {
        id: 'reg-grades',
        label: 'Grade monitoring',
        path: '/registrar/grades',
        icon: PenLine,
        permissions: ['grades.read', 'grades.admin'],
      },
      {
        id: 'reg-reports',
        label: 'Reports',
        path: '/registrar/reports',
        icon: FileText,
        permissions: ['enrollments.read', 'reports.read'],
      },
      {
        id: 'reg-clearance',
        label: 'Clearance QR print',
        path: '/registrar/clearance',
        icon: ShieldCheck,
        permissions: ['clearance.read', 'students.read'],
      },
      {
        id: 'reg-announce',
        label: 'Announcements',
        path: '/registrar/announcements',
        icon: Megaphone,
        permissions: ['announcements.read'],
      },
      {
        id: 'reg-faculty-eval',
        label: 'Faculty evaluation',
        path: '/registrar/faculty-eval',
        icon: ClipboardCheck,
        permissions: ['faculty_eval.read'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'admin-settings',
        label: 'Settings',
        path: '/registrar/settings',
        icon: Settings,
        permissions: ['academic.read', 'academic.write'],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      {
        id: 'analytics-reports',
        label: 'Reports & dashboards',
        path: '/reports',
        icon: BarChart3,
        permissions: [
          'reports.read',
          'enrollments.read',
          'applicants.read',
          'grades.read',
          'scholarships.read',
          'guidance.read',
          'health.read',
          'osa.read',
        ],
      },
    ],
  },
  {
    id: 'offices',
    label: 'Administrative offices',
    items: [
      {
        id: 'adm',
        label: 'Admissions Office',
        path: '/offices/admissions',
        icon: UserRoundPlus,
        permissions: ['applicants.read', 'applicants.write'],
      },
      {
        id: 'osa',
        label: 'Student Affairs',
        path: '/offices/osa',
        icon: Scale,
        permissions: ['osa.read', 'osa.write'],
      },
      {
        id: 'gui',
        label: 'Guidance & Counseling',
        path: '/offices/guidance',
        icon: HeartHandshake,
        permissions: ['guidance.read', 'guidance.write'],
      },
      {
        id: 'hlt',
        label: 'Health Services',
        path: '/offices/health',
        icon: Stethoscope,
        permissions: ['health.read', 'health.write'],
      },
      {
        id: 'sch',
        label: 'Scholarship Office',
        path: '/offices/scholarship',
        icon: BadgePercent,
        permissions: ['scholarships.read', 'scholarships.write'],
      },
    ],
  },
]

export function filterNavGroups(permissions: string[], roles: string[] = []): UsisNavGroup[] {
  const studentPortal = hasStudentPortalAccess(permissions, roles)
  const roleSlugs = roles.map((r) => r.toLowerCase())
  const registrarStaff =
    permissions.includes('*') ||
    permissions.includes('admin') ||
    roleSlugs.includes('identity_admin') ||
    roleSlugs.includes('admin') ||
    permissions.includes('enrollments.read') ||
    permissions.includes('enrollments.write')

  if (studentPortal && !registrarStaff) {
    return NAV_GROUPS.filter((group) => group.id === 'student').map((group) => ({
      ...group,
      items: group.items,
    }))
  }

  return NAV_GROUPS.filter((group) => group.id !== 'student' || studentPortal)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAnyPermission(permissions, item.permissions)),
    }))
    .filter((group) => group.items.length > 0)
}
