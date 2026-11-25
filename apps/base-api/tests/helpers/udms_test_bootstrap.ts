import DocumentsMainSeeder from '#modules/documents/database/seeders/main_seeder'

let bootstrapped = false

export async function bootstrapUdmsTestData() {
  if (bootstrapped) return
  await new DocumentsMainSeeder().run()
  bootstrapped = true
}

export function shouldBootstrapUdmsFromArgv(argv: string) {
  return /udms_|documents_inprocess/i.test(argv)
}
