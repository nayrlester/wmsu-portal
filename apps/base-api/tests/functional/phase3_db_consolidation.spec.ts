import { test } from '@japa/runner'

test.group('Phase 3 database consolidation', () => {
  test('platform db-consolidation describes Phase 3b progress', async ({ client, assert }) => {
    const res = await client.get('/api/v1/platform/db-consolidation')
    res.assertStatus(200)
    assert.equal(res.body().data.phase, 'phase3c-search-path-cutover')
    assert.equal(res.body().data.targetDatabase, 'wmsu_cis')
    assert.isArray(res.body().data.schemas)
    assert.includeMembers(res.body().data.schemas, [
      'common',
      'enrollment',
      'records',
      'finance',
      'library',
      'inventory',
      'documents',
      'audit',
    ])
    assert.property(res.body().data.tooling, 'restoreModule')
    assert.property(res.body().data.tooling, 'cutoverModule')
    assert.isAtLeast(res.body().data.progress.completedCount, 7)
    assert.equal(res.body().data.progress.pendingCount, 0)
    assert.property(res.body().data.tooling, 'absorbModule')
    assert.isAtLeast(res.body().data.progress.cutoverCount, 7)
    assert.equal(res.body().data.progress.cutoverPendingCount, 0)
    const cutover = res.body().data.progress.cutoverModules as Array<{ module: string }>
    for (const name of [
      'common',
      'enrollment',
      'finance',
      'records',
      'library',
      'documents',
      'inventory',
    ]) {
      assert.exists(cutover.find((m) => m.module === name))
    }
    const completed = res.body().data.progress.completedModules as Array<{
      module: string
      tableCount: number
    }>
    for (const name of [
      'enrollment',
      'finance',
      'records',
      'inventory',
      'library',
      'documents',
      'common',
    ]) {
      const row = completed.find((m) => m.module === name)
      assert.exists(row)
      assert.isAtLeast(row!.tableCount, 1)
    }
  })

  test('root catalog advertises db-consolidation entry', async ({ client, assert }) => {
    const res = await client.get('/')
    res.assertStatus(200)
    assert.equal(res.body().data.dbConsolidation, '/api/v1/platform/db-consolidation')
  })
})
