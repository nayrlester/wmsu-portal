import router from '@adonisjs/core/services/router'

const BooksController = () => import('#modules/library/controllers/books_controller')

export function registerBookRoutes() {
  router.get('books/categories', [BooksController, 'categories'])
  router.get('books/material-types', [BooksController, 'materialTypes'])
  router.post('books/batch/delete', [BooksController, 'batchDestroy'])
  router.post('books/batch/update', [BooksController, 'batchUpdate'])
  router.get('books', [BooksController, 'index'])
  router.post('books', [BooksController, 'store'])
  router.get('books/:id', [BooksController, 'show'])
  router.patch('books/:id', [BooksController, 'update'])
  router.delete('books/:id', [BooksController, 'destroy'])
  router.get('books/:id/export/marc', [BooksController, 'exportMarc'])
  router.get('books/:id/versions', [BooksController, 'versions'])
  router.get('books/:id/copies', [BooksController, 'copies'])
  router.post('books/:id/copies', [BooksController, 'addCopy'])
  router.patch('books/:bookId/copies/:copyId', [BooksController, 'updateCopy'])
  router.delete('books/:bookId/copies/:copyId', [BooksController, 'destroyCopy'])
  router.get('books/:id/digital-files', [BooksController, 'listDigitalFiles'])
  router.post('books/:id/digital-files', [BooksController, 'uploadDigitalFile'])
  router.get('books/:id/digital-files/:fileId/download', [BooksController, 'downloadDigitalFile'])
}
