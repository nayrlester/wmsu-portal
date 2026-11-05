import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { PageContainer, ContentWrapper } from '@/components/layout/page-container'
import { FileUploadZone } from '@/components/desk/file-upload-zone'
import {
  DOCUMENT_FILE_ACCEPT,
  DOCUMENT_FILE_ACCEPT_LABEL,
} from '@/features/documents/constants/file-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateDocument,
  useDepartments,
  useDocumentTypes,
} from '@/features/documents/hooks/use-documents'
import { documentsService } from '@/features/documents/services/documents.service'
import { ApiError } from '@/api/errors/api-error'
import {
  DOCUMENT_NAP_OPTIONS,
  DOCUMENT_PRIORITY_OPTIONS,
} from '@/features/documents/types/document.types'
import { stripHtml } from '@/features/documents/utils/html.helpers'
import { recordsApi } from '@/api/modules/records.api'
import { udmsApi } from '@/api/modules/udms.api'

const DocumentRichEditor = lazy(() =>
  import('@/features/documents/components/document-rich-editor').then((module) => ({
    default: module.DocumentRichEditor,
  }))
)

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  departmentId: z.string().optional(),
  documentTypeId: z.string().min(1, 'Document type is required'),
  visibility: z.enum(['public', 'private']),
  confidentiality: z.enum(['public', 'internal', 'confidential', 'restricted']),
  originatingOfficeId: z.string().min(1, 'Originating office is required'),
  receivingOfficeId: z.string().min(1, 'Receiving office is required'),
  documentDate: z.string().min(1, 'Document date is required'),
  subjectKeywords: z.string().min(1, 'Subject / keywords are required'),
  napCategory: z.string().min(1, 'NAP classification is required'),
  retentionScheduleId: z.string().optional(),
  receivingChannel: z.enum(['walk_in', 'email', 'courier', 'portal', 'internal']),
  filePlanNodeId: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type CreateMode = 'upload' | 'editor'

export function CreateDocumentPage() {
  const navigate = useNavigate()
  const createMutation = useCreateDocument()
  const { data: departments } = useDepartments()
  const { data: documentTypes } = useDocumentTypes()
  const { data: schedulesData } = useQuery({
    queryKey: ['retention-schedules'],
    queryFn: () => recordsApi.listSchedules(),
  })
  const { data: filePlanNodes } = useQuery({
    queryKey: ['udms-file-plan'],
    queryFn: () => udmsApi.listFilePlan(),
  })
  const [mode, setMode] = useState<CreateMode>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [contentHtml, setContentHtml] = useState('<p></p>')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'medium',
      visibility: 'private',
      confidentiality: 'internal',
      receivingChannel: 'internal',
    },
  })

  const onSubmit = async (form: FormData) => {
    setError('')
    if (mode === 'editor' && stripHtml(contentHtml).length < 10) {
      setError('Editor content must be at least 10 characters.')
      return
    }

    try {
      const doc = await createMutation.mutateAsync({
        title: form.title,
        description: form.description,
        priority: form.priority,
        departmentId: form.departmentId || form.receivingOfficeId,
        documentTypeId: form.documentTypeId,
        visibility: form.visibility,
        confidentiality: form.confidentiality,
        originatingOfficeId: form.originatingOfficeId,
        receivingOfficeId: form.receivingOfficeId,
        documentDate: form.documentDate,
        subjectKeywords: form.subjectKeywords,
        napCategory: form.napCategory,
        retentionScheduleId: form.retentionScheduleId || undefined,
        receivingChannel: form.receivingChannel,
        filePlanNodeId: form.filePlanNodeId || undefined,
        contentHtml: mode === 'editor' ? contentHtml : undefined,
      })

      if (mode === 'upload' && files[0]) {
        const { versions } = await documentsService.versions(doc.id)
        const versionId = versions[0]?.id
        if (versionId) {
          await documentsService.uploadFile(doc.id, versionId, files[0])
        }
      }

      navigate(`/app/documents/${doc.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isForbidden()) {
          setError('You do not have permission to register documents.')
        } else if (err.isValidation()) {
          setError(err.validationErrors.map((e) => e.message).join(' ') || err.message)
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to register document. Please try again.')
      }
    }
  }

  return (
    <PageContainer title="Register Document" breadcrumb="Home / Documents / Register">
      <ContentWrapper>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="desk-card space-y-4 p-6">
            <h3 className="font-semibold">Records registry (DMS-013)</h3>
            <p className="text-sm text-muted-foreground">
              Required fields follow the TOR incoming registry metadata. A unique reference number is
              generated automatically on save.
            </p>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...register('description')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="documentTypeId">Document type *</Label>
                <Select id="documentTypeId" {...register('documentTypeId')}>
                  <option value="">Select type</option>
                  {documentTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
                {errors.documentTypeId && (
                  <p className="text-xs text-destructive">{errors.documentTypeId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentDate">Document date *</Label>
                <DateField id="documentDate" {...register('documentDate')} />
                {errors.documentDate && (
                  <p className="text-xs text-destructive">{errors.documentDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originatingOfficeId">Originating office *</Label>
                <Select id="originatingOfficeId" {...register('originatingOfficeId')}>
                  <option value="">Select office</option>
                  {departments?.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                {errors.originatingOfficeId && (
                  <p className="text-xs text-destructive">{errors.originatingOfficeId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivingOfficeId">Receiving office *</Label>
                <Select id="receivingOfficeId" {...register('receivingOfficeId')}>
                  <option value="">Select office</option>
                  {departments?.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                {errors.receivingOfficeId && (
                  <p className="text-xs text-destructive">{errors.receivingOfficeId.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subjectKeywords">Subject / keywords *</Label>
                <Input id="subjectKeywords" {...register('subjectKeywords')} />
                {errors.subjectKeywords && (
                  <p className="text-xs text-destructive">{errors.subjectKeywords.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="napCategory">NAP classification *</Label>
                <Select id="napCategory" {...register('napCategory')}>
                  <option value="">Select category</option>
                  {DOCUMENT_NAP_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                {errors.napCategory && (
                  <p className="text-xs text-destructive">{errors.napCategory.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="receivingChannel">Receiving channel</Label>
                <Select id="receivingChannel" {...register('receivingChannel')}>
                  <option value="internal">Internal</option>
                  <option value="walk_in">Walk-in / physical</option>
                  <option value="email">Email</option>
                  <option value="courier">Courier</option>
                  <option value="portal">Online portal</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filePlanNodeId">File-plan folder</Label>
                <Select id="filePlanNodeId" {...register('filePlanNodeId')}>
                  <option value="">Unassigned</option>
                  {filePlanNodes?.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.path} — {node.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" {...register('priority')}>
                  {DOCUMENT_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confidentiality">Confidentiality</Label>
                <Select id="confidentiality" {...register('confidentiality')}>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Tracking privacy</Label>
                <Select id="visibility" {...register('visibility')}>
                  <option value="private">Private — tracking link hidden</option>
                  <option value="public">Public — anyone with tracking # can view status</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retentionScheduleId">Retention schedule</Label>
                <Select id="retentionScheduleId" {...register('retentionScheduleId')}>
                  <option value="">None (periods For Clarification)</option>
                  {schedulesData?.schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department (optional)</Label>
                <Select id="departmentId" {...register('departmentId')}>
                  <option value="">Same as receiving office</option>
                  {departments?.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Tabs defaultValue={mode} value={mode} onValueChange={(value) => setMode(value as CreateMode)}>
              <TabsList>
                <TabsTrigger value="upload">Upload file</TabsTrigger>
                <TabsTrigger value="editor">Write in editor</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  {DOCUMENT_FILE_ACCEPT_LABEL} · max 25 MB
                </p>
                <FileUploadZone
                  accept={DOCUMENT_FILE_ACCEPT}
                  multiple={false}
                  files={files}
                  onFilesChange={setFiles}
                />
              </TabsContent>
              <TabsContent value="editor" className="pt-4">
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <DocumentRichEditor value={contentHtml} onChange={setContentHtml} />
                </Suspense>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 border-t border-border pt-6">
              <Button type="button" variant="outline" onClick={() => navigate('/app/documents')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting ? 'Registering…' : 'Register document'}
              </Button>
            </div>
          </div>
        </form>
      </ContentWrapper>
    </PageContainer>
  )
}
