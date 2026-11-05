import router from '@adonisjs/core/services/router'

const AttendanceController = () => import('#modules/library/controllers/attendance_controller')

export function registerAttendanceRoutes() {
  router.get('attendance/summary', [AttendanceController, 'summary'])
  router.get('attendance/events', [AttendanceController, 'index'])
  router.post('attendance/events', [AttendanceController, 'store'])
}
