import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useCreateBook, useUpdateBook } from '@/hooks/use-books'
import { useBooksStore } from '@/stores/books-store'
import { getApiErrorMessage } from '@/lib/api-client'
import { MATERIAL_TYPE_OPTIONS, type Book, type MaterialType } from '@/types/books'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  authors: z.string().min(1, 'At least one author required'),
  subjects: z.string().optional(),
  isbn13: z.string().optional(),
  isbn10: z.string().optional(),
  issn: z.string().optional(),
  catalogBarcode: z.string().optional(),
  genre: z.string().optional(),
  materialType: z.enum([
    'book',
    'serial',
    'journal',
    'article',
    'thesis',
    'dissertation',
    'audiovisual',
    'electronic',
  ]),
  classificationScheme: z.enum(['', 'ddc', 'lcc']),
  classificationNumber: z.string().optional(),
  publicationYear: z.number().min(1000).max(9999).optional().or(z.nan()).optional(),
  publisherName: z.string().optional(),
  categoryName: z.string().optional(),
  description: z.string().optional(),
  isDigital: z.boolean().optional(),
  initialCopies: z.number().min(0).max(100).optional(),
  shelfLocation: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function bookToDefaults(book: Book): FormValues {
  return {
    title: book.title,
    subtitle: book.subtitle ?? '',
    authors: book.authors.join(', '),
    subjects: (book.subjects ?? []).join(', '),
    isbn13: book.isbn13 ?? '',
    isbn10: book.isbn10 ?? '',
    issn: book.issn ?? '',
    catalogBarcode: book.catalogBarcode ?? '',
    genre: book.genre ?? '',
    materialType: (book.materialType as MaterialType) || 'book',
    classificationScheme: (book.classificationScheme as '' | 'ddc' | 'lcc') || '',
    classificationNumber: book.classificationNumber ?? '',
    publicationYear: book.publicationYear ?? undefined,
    publisherName: book.publisher ?? '',
    categoryName: book.category ?? '',
    description: book.description ?? '',
    isDigital: book.isDigital,
    initialCopies: 0,
    shelfLocation: '',
  }
}

export function BookFormModal() {
  const { isFormOpen, editingBook, closeForm } = useBooksStore()
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      authors: '',
      materialType: 'book',
      classificationScheme: '',
      isDigital: false,
      initialCopies: 1,
    },
  })

  const classificationScheme = watch('classificationScheme')

  useEffect(() => {
    if (isFormOpen) {
      reset(
        editingBook
          ? bookToDefaults(editingBook)
          : {
              title: '',
              authors: '',
              subjects: '',
              materialType: 'book',
              classificationScheme: '',
              isDigital: false,
              initialCopies: 1,
            }
      )
    }
  }, [isFormOpen, editingBook, reset])

  async function onSubmit(values: FormValues) {
    const authors = values.authors.split(',').map((a) => a.trim()).filter(Boolean)
    const subjects = values.subjects
      ? values.subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    if (values.classificationScheme && !values.classificationNumber?.trim()) {
      setError('classificationNumber', {
        message: 'Classification number is required when a scheme is selected',
      })
      return
    }

    try {
      const classificationScheme =
        values.classificationScheme === '' ? null : values.classificationScheme
      const publicationYear =
        values.publicationYear && !Number.isNaN(values.publicationYear)
          ? values.publicationYear
          : null

      if (editingBook) {
        await updateBook.mutateAsync({
          id: editingBook.id,
          payload: {
            title: values.title,
            subtitle: values.subtitle || null,
            isbn13: values.isbn13 || null,
            isbn10: values.isbn10 || null,
            issn: values.issn || null,
            catalogBarcode: values.catalogBarcode || null,
            genre: values.genre || null,
            materialType: values.materialType,
            classificationScheme,
            classificationNumber: values.classificationNumber || null,
            publicationYear,
            publisherName: values.publisherName || null,
            categoryName: values.categoryName || null,
            description: values.description || null,
            isDigital: values.isDigital,
            authors,
            subjects,
          },
        })
      } else {
        await createBook.mutateAsync({
          title: values.title,
          subtitle: values.subtitle,
          isbn13: values.isbn13,
          isbn10: values.isbn10,
          issn: values.issn,
          catalogBarcode: values.catalogBarcode,
          genre: values.genre,
          materialType: values.materialType,
          classificationScheme: classificationScheme || undefined,
          classificationNumber: values.classificationNumber,
          publicationYear: publicationYear ?? undefined,
          publisherName: values.publisherName,
          categoryName: values.categoryName,
          description: values.description,
          isDigital: values.isDigital,
          authors,
          subjects,
          initialCopies: values.initialCopies ?? 1,
          shelfLocation: values.shelfLocation,
        })
      }
      closeForm()
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) })
    }
  }

  const isEdit = !!editingBook

  return (
    <Dialog
      open={isFormOpen}
      onClose={closeForm}
      title={isEdit ? 'Edit catalog record' : 'Add catalog record'}
      description={
        isEdit
          ? 'Update bibliographic metadata (LIB-001 / LIB-017)'
          : 'Create a bibliographic record for the university collection'
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="catalog-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="authors">Authors / contributors * (comma-separated)</Label>
            <Input id="authors" placeholder="Author name" {...register('authors')} />
            {errors.authors && <p className="text-sm text-red-600">{errors.authors.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subjects">Subjects (comma-separated)</Label>
            <Input id="subjects" placeholder="Education, Philippines" {...register('subjects')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialType">Material type *</Label>
            <select
              id="materialType"
              className="flex h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
              {...register('materialType')}
            >
              {MATERIAL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicationYear">Publication year</Label>
            <Input
              id="publicationYear"
              type="number"
              min={1000}
              max={9999}
              {...register('publicationYear', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isbn13">ISBN-13</Label>
            <Input id="isbn13" placeholder="9780143127741" {...register('isbn13')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isbn10">ISBN-10</Label>
            <Input id="isbn10" {...register('isbn10')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issn">ISSN</Label>
            <Input id="issn" {...register('issn')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalogBarcode">Catalog barcode</Label>
            <Input id="catalogBarcode" {...register('catalogBarcode')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classificationScheme">Classification scheme</Label>
            <select
              id="classificationScheme"
              className="flex h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
              {...register('classificationScheme')}
            >
              <option value="">None</option>
              <option value="ddc">DDC</option>
              <option value="lcc">LCC</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classificationNumber">
              Classification number{classificationScheme ? ' *' : ''}
            </Label>
            <Input id="classificationNumber" {...register('classificationNumber')} />
            {errors.classificationNumber && (
              <p className="text-sm text-red-600">{errors.classificationNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" placeholder="Fiction" {...register('genre')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publisherName">Publisher</Label>
            <Input id="publisherName" {...register('publisherName')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryName">Collection category</Label>
            <Input id="categoryName" placeholder="Literature" {...register('categoryName')} />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="initialCopies">Initial copies</Label>
                <Input
                  id="initialCopies"
                  type="number"
                  min={0}
                  max={100}
                  {...register('initialCopies', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shelfLocation">Shelf location</Label>
                <Input id="shelfLocation" placeholder="A-12-3" {...register('shelfLocation')} />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="isDigital"
              type="checkbox"
              className="h-4 w-4 rounded"
              {...register('isDigital')}
            />
            <Label htmlFor="isDigital">Digital edition available</Label>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              {...register('description')}
            />
          </div>
        </div>

        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={closeForm}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create record'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
