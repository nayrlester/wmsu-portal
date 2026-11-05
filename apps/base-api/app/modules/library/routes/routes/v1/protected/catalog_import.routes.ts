import router from '@adonisjs/core/services/router'

const CatalogImportController = () => import('#modules/library/controllers/catalog_import_controller')

export function registerCatalogImportRoutes() {
  router.post('catalog/import/csv', [CatalogImportController, 'importCsv'])
  router.post('catalog/import/marc', [CatalogImportController, 'importMarc'])
  router.post('catalog/import/xlsx', [CatalogImportController, 'importXlsx'])
  router.get('catalog/books/:id/versions', [CatalogImportController, 'versions'])
}
