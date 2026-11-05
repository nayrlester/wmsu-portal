import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap, LoadingState } from '@wmsu/ui'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { UsisShell } from '@/components/shell/usis-shell'
import { RequirePermissionOutlet } from '@/components/auth/require-permission-outlet'
import { resolveHomePath } from '@/lib/permissions'

const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage }))
)
const SsoCallbackPage = lazy(() =>
  import('@/features/auth/pages/sso-callback-page').then((m) => ({ default: m.SsoCallbackPage }))
)
const AccessDeniedPage = lazy(() =>
  import('@/features/auth/pages/access-denied-page').then((m) => ({ default: m.AccessDeniedPage }))
)

const StudentDashboardPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentDashboardPage }))
)
const StudentProfilePage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentProfilePage }))
)
const StudentAdmissionPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentAdmissionPage }))
)
const StudentEnrollmentPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentEnrollmentPage }))
)
const StudentAdvisingPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentAdvisingPage }))
)
const StudentSubjectsPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentSubjectsPage }))
)
const StudentSchedulePage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentSchedulePage }))
)
const StudentStatusPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentStatusPage }))
)
const StudentAssessmentsPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentAssessmentsPage }))
)
const StudentPaymentsPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentPaymentsPage }))
)
const StudentCorPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentCorPage }))
)
const StudentGradesPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentGradesPage }))
)
const StudentHistoryPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentHistoryPage }))
)
const StudentRequirementsPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentRequirementsPage }))
)
const StudentScholarshipsPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentScholarshipsPage }))
)
const StudentSupportPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentSupportPage }))
)
const StudentQueuePage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentQueuePage }))
)
const StudentFacultyEvalPage = lazy(() =>
  import('@/features/student/pages/student-portal-pages').then((m) => ({ default: m.StudentFacultyEvalPage }))
)
const StudentClearanceReportPage = lazy(() =>
  import('@/features/clearance/pages/clearance-report-pages').then((m) => ({ default: m.StudentClearanceReportPage }))
)
const ClearanceVerifyPage = lazy(() =>
  import('@/features/clearance/pages/clearance-report-pages').then((m) => ({ default: m.ClearanceVerifyPage }))
)

const FacultyDashboardPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyDashboardPage }))
)
const FacultyClassesPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyClassesPage }))
)
const FacultyMasterListsPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyMasterListsPage }))
)
const FacultyEncodePage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyEncodePage }))
)
const FacultySubmitPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultySubmitPage }))
)
const FacultyCorrectionsPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyCorrectionsPage }))
)
const FacultyAdvisingPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyAdvisingPage }))
)
const FacultyAdvisingHistoryPage = lazy(() =>
  import('@/features/faculty/pages/faculty-portal-pages').then((m) => ({ default: m.FacultyAdvisingHistoryPage }))
)

const RegistrarDashboardPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarDashboardPage }))
)
const RegistrarApplicantsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarApplicantsPage }))
)
const RegistrarStudentsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarStudentsPage }))
)
const RegistrarEnrollmentsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarEnrollmentsPage }))
)
const RegistrarAcademicPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarAcademicPage }))
)
const RegistrarCurriculumPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarCurriculumPage }))
)
const RegistrarGradesPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarGradesPage }))
)
const RegistrarRequirementsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarRequirementsPage }))
)
const RegistrarRegistrationPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarRegistrationPage }))
)
const RegistrarReportsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({ default: m.RegistrarReportsPage }))
)
const RegistrarAnnouncementsPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({
    default: m.RegistrarAnnouncementsPage,
  }))
)
const RegistrarFacultyEvalPage = lazy(() =>
  import('@/features/registrar/pages/registrar-portal-pages').then((m) => ({
    default: m.RegistrarFacultyEvalPage,
  }))
)

const AdmissionsOfficePage = lazy(() =>
  import('@/features/offices/pages/office-portal-pages').then((m) => ({ default: m.AdmissionsOfficePage }))
)
const GuidanceOfficePage = lazy(() =>
  import('@/features/offices/pages/office-portal-pages').then((m) => ({ default: m.GuidanceOfficePage }))
)
const HealthOfficePage = lazy(() =>
  import('@/features/offices/pages/office-portal-pages').then((m) => ({ default: m.HealthOfficePage }))
)
const OsaOfficePage = lazy(() =>
  import('@/features/offices/pages/office-portal-pages').then((m) => ({ default: m.OsaOfficePage }))
)
const ScholarshipOfficePage = lazy(() =>
  import('@/features/offices/pages/office-portal-pages').then((m) => ({ default: m.ScholarshipOfficePage }))
)

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingState label="Loading page" />
    </div>
  )
}

function ProtectedLayout() {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return (
    <UsisShell>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </UsisShell>
  )
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (token) {
    return <Navigate to={resolveHomePath(user?.permissions ?? [], user?.roles ?? [])} replace />
  }
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={resolveHomePath(user?.permissions ?? [], user?.roles ?? [])} replace />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HttpNotifyBootstrap />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/sso/callback"
            element={
              <Suspense fallback={<PageFallback />}>
                <SsoCallbackPage />
              </Suspense>
            }
          />
          <Route
            path="/clearance/verify/:token"
            element={
              <Suspense fallback={<PageFallback />}>
                <ClearanceVerifyPage />
              </Suspense>
            }
          />
          <Route element={<ProtectedLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<HomeRedirect />} />
            <Route path="access-denied" element={<AccessDeniedPage />} />

            <Route
              element={
                <RequirePermissionOutlet
                  anyOf={['portal.student', 'students.self', 'faculty_eval.submit']}
                  allowStudentRole
                />
              }
            >
              <Route path="student" element={<StudentDashboardPage />} />
              <Route path="student/dashboard" element={<Navigate to="/student" replace />} />
              <Route path="student/profile" element={<StudentProfilePage />} />
              <Route path="student/admission" element={<StudentAdmissionPage />} />
              <Route path="student/enrollment" element={<StudentEnrollmentPage />} />
              <Route path="student/advising" element={<StudentAdvisingPage />} />
              <Route path="student/subjects" element={<StudentSubjectsPage />} />
              <Route path="student/schedule" element={<StudentSchedulePage />} />
              <Route path="student/status" element={<StudentStatusPage />} />
              <Route path="student/assessments" element={<StudentAssessmentsPage />} />
              <Route path="student/payments" element={<StudentPaymentsPage />} />
              <Route path="student/cor" element={<StudentCorPage />} />
              <Route path="student/grades" element={<StudentGradesPage />} />
              <Route path="student/history" element={<StudentHistoryPage />} />
              <Route path="student/requirements" element={<StudentRequirementsPage />} />
              <Route path="student/scholarships" element={<StudentScholarshipsPage />} />
              <Route path="student/support" element={<StudentSupportPage />} />
              <Route path="student/queue" element={<StudentQueuePage />} />
              <Route path="student/faculty-eval" element={<StudentFacultyEvalPage />} />
              <Route path="student/clearance" element={<StudentClearanceReportPage />} />
            </Route>

            <Route
              element={
                <RequirePermissionOutlet
                  anyOf={['grades.read', 'grades.write', 'advising.read', 'advising.write']}
                />
              }
            >
              <Route path="faculty" element={<FacultyDashboardPage />} />
              <Route path="faculty/classes" element={<FacultyClassesPage />} />
              <Route path="faculty/master-lists" element={<FacultyMasterListsPage />} />
              <Route path="faculty/grades/encode" element={<FacultyEncodePage />} />
              <Route path="faculty/grades/submit" element={<FacultySubmitPage />} />
              <Route path="faculty/grades/corrections" element={<FacultyCorrectionsPage />} />
              <Route path="faculty/advising" element={<FacultyAdvisingPage />} />
              <Route path="faculty/advising/history" element={<FacultyAdvisingHistoryPage />} />
            </Route>

            <Route
              element={
                <RequirePermissionOutlet
                  anyOf={['enrollments.read', 'applicants.read', 'students.read', 'academic.write', 'announcements.read', 'faculty_eval.read']}
                />
              }
            >
              <Route path="registrar" element={<RegistrarDashboardPage />} />
              <Route path="registrar/applicants" element={<RegistrarApplicantsPage />} />
              <Route path="registrar/students" element={<RegistrarStudentsPage />} />
              <Route path="registrar/enrollments" element={<RegistrarEnrollmentsPage />} />
              <Route path="registrar/academic" element={<RegistrarAcademicPage />} />
              <Route path="registrar/curriculum" element={<RegistrarCurriculumPage />} />
              <Route path="registrar/grades" element={<RegistrarGradesPage />} />
              <Route path="registrar/requirements" element={<RegistrarRequirementsPage />} />
              <Route path="registrar/registration" element={<RegistrarRegistrationPage />} />
              <Route path="registrar/reports" element={<RegistrarReportsPage />} />
              <Route path="registrar/announcements" element={<RegistrarAnnouncementsPage />} />
              <Route path="registrar/faculty-eval" element={<RegistrarFacultyEvalPage />} />
              <Route path="reports" element={<RegistrarReportsPage />} />
            </Route>

            <Route
              element={
                <RequirePermissionOutlet
                  anyOf={[
                    'applicants.read',
                    'applicants.write',
                    'osa.read',
                    'guidance.read',
                    'health.read',
                    'scholarships.read',
                  ]}
                />
              }
            >
              <Route path="offices/admissions" element={<AdmissionsOfficePage />} />
              <Route path="offices/guidance" element={<GuidanceOfficePage />} />
              <Route path="offices/health" element={<HealthOfficePage />} />
              <Route path="offices/osa" element={<OsaOfficePage />} />
              <Route path="offices/scholarship" element={<ScholarshipOfficePage />} />
            </Route>
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
