import router from '@adonisjs/core/services/router'

const BorrowingsController = () => import('#modules/library/controllers/borrowings_controller')

export function registerBorrowingRoutes() {
  router.get('borrowings/dashboard', [BorrowingsController, 'dashboard'])
  router.get('borrowings/loan-rules', [BorrowingsController, 'loanRules'])
  router.patch('borrowings/loan-rules', [BorrowingsController, 'updateLoanRules'])
  router.get('borrowings', [BorrowingsController, 'index'])
  router.post('borrowings/request', [BorrowingsController, 'request'])
  router.post('borrowings/checkout', [BorrowingsController, 'directCheckout'])
  router.post('borrowings/batch/checkout', [BorrowingsController, 'batchCheckout'])
  router.post('borrowings/batch/checkin', [BorrowingsController, 'batchCheckin'])
  router.get('borrowings/:id', [BorrowingsController, 'show'])
  router.get('borrowings/:id/events', [BorrowingsController, 'events'])
  router.post('borrowings/:id/approve', [BorrowingsController, 'approve'])
  router.post('borrowings/:id/checkout', [BorrowingsController, 'checkout'])
  router.post('borrowings/:id/return', [BorrowingsController, 'return'])
  router.post('borrowings/:id/renew', [BorrowingsController, 'renew'])
  router.post('borrowings/:id/mark-lost', [BorrowingsController, 'markLost'])
}
