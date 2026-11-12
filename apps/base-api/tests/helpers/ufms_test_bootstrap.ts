import { seedUimsDemoData as seedFinanceDemo } from '#modules/finance/domain/seed_demo_data'
import { seedUimsDemoData as seedEnrollmentDemo } from '#modules/enrollment/domain/seed_demo_data'

let bootstrapped = false

export async function bootstrapUfmsTestData() {
  if (bootstrapped) return
  await seedFinanceDemo('UNI')
  await seedEnrollmentDemo('UNI')
  bootstrapped = true
}

export function shouldBootstrapUfmsFromArgv(argv: string) {
  return /ufms_package_/i.test(argv)
}
