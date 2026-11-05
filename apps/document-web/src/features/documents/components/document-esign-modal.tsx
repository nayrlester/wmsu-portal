import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Editor } from 'pandadoc-editor'
import { Signing } from 'pandadoc-signing'
import { Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { esignApi } from '@/api/modules/records.api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  findPandaDocFrame,
  waitForPandaDocFrame,
} from '@/features/documents/utils/pandadoc-embed'

type EsignStep = 'idle' | 'place' | 'sign'

interface DocumentEsignModalProps {
  documentId: string
  /** Prefer signing the latest version's primary file. */
  fileId?: string | null
  versionLabel?: string | null
  open: boolean
  onClose: () => void
}

export function DocumentEsignModal({
  documentId,
  fileId,
  versionLabel,
  open,
  onClose,
}: DocumentEsignModalProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const containerDomId = useId().replace(/:/g, '')
  const editorContainerId = `pandadoc-editor-modal-${containerDomId}`
  const signingContainerId = `pandadoc-signing-modal-${containerDomId}`
  const editorRef = useRef<Editor | null>(null)
  const signingRef = useRef<Signing | null>(null)
  const embedShellRef = useRef<HTMLDivElement | null>(null)

  const [step, setStep] = useState<EsignStep>('idle')
  const [editorToken, setEditorToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [embedError, setEmbedError] = useState<string | null>(null)
  const [embedLoading, setEmbedLoading] = useState(false)
  const [embedSize, setEmbedSize] = useState({ width: 960, height: 720 })

  const { data, isLoading } = useQuery({
    queryKey: ['esign', documentId],
    queryFn: () => esignApi.get(documentId),
    enabled: open,
    refetchInterval: (query) => {
      const status = query.state.data?.envelope?.status
      if (status === 'sent' || status === 'viewed' || sessionId) return 5000
      return false
    },
  })

  const measureEmbed = () => {
    const el = embedShellRef.current
    if (!el) return
    const width = Math.max(Math.floor(el.clientWidth), 320)
    // Prefer filling the modal body; fall back to a comfortable viewport-based height.
    const shellHeight = Math.floor(el.clientHeight)
    const height = Math.max(
      shellHeight > 200 ? shellHeight : Math.min(Math.floor(window.innerHeight * 0.58), 760),
      480
    )
    setEmbedSize({ width, height })
  }

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['esign', documentId] })
    queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
    queryClient.invalidateQueries({ queryKey: ['document', documentId] })
  }

  const destroyEmbeds = () => {
    editorRef.current?.destroy()
    editorRef.current = null
    signingRef.current?.destroy()
    signingRef.current = null
  }

  const handleCompleted = async () => {
    try {
      const result = await esignApi.sync(documentId)
      invalidateRelated()
      if (result.envelope.status === 'completed') {
        setSessionId(null)
        setStep('idle')
        destroyEmbeds()
        toast.success('Signature saved', 'Approve is now available.')
        onClose()
      } else {
        toast.info(
          'Not completed yet',
          `Status is "${result.envelope.status}". Click the signature field, finish, then try again.`
        )
      }
    } catch (err) {
      toast.error(
        'Could not sync signature',
        err instanceof ApiError ? err.message : 'Try finishing in the signing frame first'
      )
    }
  }

  const openPlaceStep = (token: string) => {
    setEmbedError(null)
    setEmbedLoading(true)
    setSessionId(null)
    setEditorToken(token)
    setStep('place')
  }

  const openSignStep = (id: string) => {
    setEmbedError(null)
    setEmbedLoading(true)
    setEditorToken(null)
    setSessionId(id)
    setStep('sign')
  }

  const startMutation = useMutation({
    mutationFn: () => esignApi.start(documentId, fileId ? { fileId } : undefined),
    onSuccess: (result) => {
      invalidateRelated()
      if (result.editorToken) {
        openPlaceStep(result.editorToken)
        toast.success('Place signature', 'Drag a signature field onto the PDF, then continue.')
      } else {
        toast.error('E-sign failed', 'No editor token returned from PandaDoc.')
      }
    },
    onError: (err) => {
      toast.error(
        'E-sign failed',
        err instanceof ApiError ? err.message : 'Could not start place-fields'
      )
    },
  })

  const placeSessionMutation = useMutation({
    mutationFn: () => esignApi.placeSession(documentId),
    onSuccess: (result) => {
      invalidateRelated()
      openPlaceStep(result.editorToken)
      toast.success('Placement resumed', 'Drag a signature field, then continue to sign.')
    },
    onError: (err) => {
      toast.error(
        'Could not open placement',
        err instanceof ApiError ? err.message : 'Try starting a new signing session'
      )
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: () => esignApi.finalize(documentId),
    onSuccess: (result) => {
      invalidateRelated()
      destroyEmbeds()
      if (result.sessionId) {
        openSignStep(result.sessionId)
        toast.success('Ready to sign', 'Click the signature field you placed, then finish.')
      } else {
        setStep('idle')
        toast.success('Sent for signature', 'Use Resume signing when ready.')
      }
    },
    onError: (err) => {
      toast.error(
        'Could not continue',
        err instanceof ApiError ? err.message : 'Place a signature field first, then try again'
      )
    },
  })

  const sessionMutation = useMutation({
    mutationFn: () => esignApi.session(documentId),
    onSuccess: (result) => {
      openSignStep(result.sessionId)
      toast.success('Signing session ready')
    },
    onError: (err) => {
      toast.error(
        'Session failed',
        err instanceof ApiError ? err.message : 'Could not open signing session'
      )
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => handleCompleted(),
  })

  const envelope = data?.envelope
  const isCompleted = envelope?.status === 'completed'
  const canPlace =
    Boolean(envelope) && ['draft', 'uploaded'].includes(envelope?.status ?? '')
  const canResume =
    Boolean(envelope) && ['sent', 'viewed'].includes(envelope?.status ?? '')

  useEffect(() => {
    if (!open) {
      setStep('idle')
      setEditorToken(null)
      setSessionId(null)
      setEmbedError(null)
      setEmbedLoading(false)
      destroyEmbeds()
    }
  }, [open])

  useEffect(() => {
    if (!open || step === 'idle' || isCompleted) return
    measureEmbed()
    const onResize = () => {
      measureEmbed()
      const containerId = step === 'place' ? editorContainerId : signingContainerId
      const iframe = findPandaDocFrame(containerId)
      if (!iframe || !embedShellRef.current) return
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.minHeight = `${Math.max(embedShellRef.current.clientHeight, 480)}px`
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, step, isCompleted, editorContainerId, signingContainerId])

  const ensureEmbedHost = (containerId: string) => {
    const shell = embedShellRef.current
    if (!shell) return false
    let host = document.getElementById(containerId)
    if (!(host instanceof HTMLElement) || host.parentElement !== shell) {
      host?.remove()
      host = document.createElement('div')
      host.id = containerId
      host.className = 'w-full bg-white'
      host.style.minHeight = `${embedSize.height}px`
      shell.replaceChildren(host)
    } else if (host instanceof HTMLIFrameElement) {
      // Already replaced by PandaDoc — leave it alone.
      return true
    }
    return true
  }

  const resolveEmbedSize = () => {
    const shell = embedShellRef.current
    const width = Math.max(shell?.clientWidth ?? embedSize.width, 320)
    const shellHeight = shell?.clientHeight ?? 0
    const height = Math.max(
      shellHeight > 200 ? shellHeight : Math.min(Math.floor(window.innerHeight * 0.58), 760),
      480
    )
    return { width, height }
  }

  useEffect(() => {
    if (!open || step !== 'place' || !editorToken || isCompleted) return

    let cancelled = false
    const run = async () => {
      setEmbedLoading(true)
      setEmbedError(null)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      measureEmbed()
      if (!ensureEmbedHost(editorContainerId)) {
        if (!cancelled) {
          setEmbedLoading(false)
          setEmbedError('PandaDoc editor host was not ready. Try Resume placement.')
        }
        return
      }
      const { width, height } = resolveEmbedSize()
      const host = document.getElementById(editorContainerId)
      if (host) {
        host.style.width = '100%'
        host.style.height = '100%'
        host.style.minHeight = `${height}px`
      }

      try {
        destroyEmbeds()
        if (!ensureEmbedHost(editorContainerId)) {
          throw new Error('PandaDoc editor host was not ready.')
        }

        const editor = new Editor(
          editorContainerId,
          {
            width,
            height,
            fieldPlacementOnly: true,
            fields: {
              signature: { visible: true },
              date: { visible: true },
              initials: { visible: true },
              text: { visible: false },
              checkbox: { visible: false },
              dropdown: { visible: false },
              stamp: { visible: false },
              payment_details: { visible: false },
              collect_file: { visible: false },
              radio_buttons: { visible: false },
            },
          },
          { region: 'com' }
        )

        editorRef.current = editor
        await editor.open({
          token: editorToken,
          fieldPlacementOnly: true,
        })
        const framed = await waitForPandaDocFrame(editorContainerId)
        if (!cancelled) {
          setEmbedLoading(false)
          if (!framed) {
            setEmbedError(
              'PandaDoc editor did not render. Check network/ad blockers and try Resume placement.'
            )
          } else {
            setEmbedError(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setEmbedLoading(false)
          setEmbedError(
            err instanceof Error
              ? err.message
              : 'Could not open PandaDoc field placement editor.'
          )
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setEmbedLoading(false)
      editorRef.current?.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, editorToken, isCompleted, editorContainerId, documentId])

  useEffect(() => {
    if (!open || step !== 'sign' || !sessionId || isCompleted) return

    let cancelled = false
    const run = async () => {
      setEmbedLoading(true)
      setEmbedError(null)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      measureEmbed()
      if (!ensureEmbedHost(signingContainerId)) {
        if (!cancelled) {
          setEmbedLoading(false)
          setEmbedError('PandaDoc signing host was not ready. Try Resume signing.')
        }
        return
      }
      const { width, height } = resolveEmbedSize()
      const host = document.getElementById(signingContainerId)
      if (host) {
        host.style.width = '100%'
        host.style.height = '100%'
        host.style.minHeight = `${height}px`
      }

      try {
        signingRef.current?.destroy()
        signingRef.current = null
        if (!ensureEmbedHost(signingContainerId)) {
          throw new Error('PandaDoc signing host was not ready.')
        }

        const signing = new Signing(
          signingContainerId,
          {
            sessionId,
            width,
            height,
          },
          { region: 'com' }
        )

        signing.on('document.completed', () => {
          void handleCompleted()
        })
        signing.on('document.exception', () => {
          setEmbedLoading(false)
          setEmbedError(
            'PandaDoc reported a signing error. Allow cookies/storage for pandadoc.com, then resume.'
          )
        })

        signingRef.current = signing
        await signing.open()
        const framed = await waitForPandaDocFrame(signingContainerId)
        if (!cancelled) {
          setEmbedLoading(false)
          if (!framed) {
            setEmbedError(
              'PandaDoc signing frame did not render. Allow cookies for pandadoc.com, then resume.'
            )
          } else {
            setEmbedError(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setEmbedLoading(false)
          setEmbedError(
            err instanceof Error
              ? err.message
              : 'Could not open PandaDoc signing embed.'
          )
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      setEmbedLoading(false)
      signingRef.current?.destroy()
      signingRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, sessionId, isCompleted, signingContainerId, documentId])

  const title =
    step === 'place'
      ? versionLabel
        ? `Place signature — ${versionLabel}`
        : 'Place signature'
      : step === 'sign'
        ? versionLabel
          ? `Sign ${versionLabel}`
          : 'Sign document'
        : versionLabel
          ? `Sign ${versionLabel}`
          : 'Sign document'

  const helpText =
    step === 'place'
      ? 'Drag a Signature field onto the PDF where it should appear. Assign it to yourself if prompted, then click Continue to sign.'
      : step === 'sign'
        ? 'Click the signature field you placed, finish signing, then wait for status completed.'
        : 'First place where the signature goes, then sign in DocTrack. Approve unlocks after completed.'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      variant="immersive"
      className="max-w-[min(98vw,1180px)]"
      bodyClassName="!flex !flex-col gap-4 overflow-hidden"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {step === 'place' && !isCompleted && (
            <Button
              type="button"
              disabled={finalizeMutation.isPending || embedLoading}
              onClick={() => finalizeMutation.mutate()}
            >
              {finalizeMutation.isPending ? 'Sending…' : 'Continue to sign'}
            </Button>
          )}
          {(step === 'sign' || canResume) && !isCompleted && (
            <Button
              type="button"
              variant="secondary"
              disabled={syncMutation.isPending || embedLoading}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? 'Checking…' : 'I finished signing'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PenLine className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">{helpText}</p>
            {envelope && (
              <Badge variant={isCompleted ? 'default' : 'secondary'} className="capitalize">
                {envelope.status}
              </Badge>
            )}
            {step !== 'idle' && (
              <Badge variant="outline" className="capitalize">
                {step === 'place' ? '1 · Place' : '2 · Sign'}
              </Badge>
            )}
          </div>

          {user?.email && (
            <p className="text-xs text-muted-foreground">Signing as {user.email}</p>
          )}
        </div>

        {isLoading ? (
          <div
            className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-[var(--color-primary-soft)]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-[var(--color-ink)]">Loading e-sign status…</p>
          </div>
        ) : (
          step === 'idle' && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={startMutation.isPending || isCompleted}
                onClick={() => startMutation.mutate()}
              >
                {startMutation.isPending
                  ? 'Preparing with PandaDoc…'
                  : isCompleted
                    ? 'Already signed'
                    : 'Start signing'}
              </Button>
              {canPlace && !editorToken && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={placeSessionMutation.isPending}
                  onClick={() => placeSessionMutation.mutate()}
                >
                  {placeSessionMutation.isPending ? 'Opening…' : 'Resume placement'}
                </Button>
              )}
              {canResume && !sessionId && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={sessionMutation.isPending}
                  onClick={() => sessionMutation.mutate()}
                >
                  {sessionMutation.isPending ? 'Opening…' : 'Resume signing'}
                </Button>
              )}
            </div>
          )
        )}

        {(startMutation.isPending ||
          placeSessionMutation.isPending ||
          sessionMutation.isPending) &&
          step === 'idle' && (
            <div
              className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-[var(--color-primary-soft)]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
              <div className="space-y-1 px-4 text-center">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Connecting to PandaDoc…
                </p>
                <p className="text-xs text-muted-foreground">
                  Creating your signing session. The document editor will appear here shortly.
                </p>
              </div>
            </div>
          )}

        {isCompleted && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Signed copy saved
            {envelope?.signedFile?.originalName
              ? `: ${envelope.signedFile.originalName}`
              : ' as a new document version'}
            .
          </p>
        )}

        {envelope?.errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {envelope.errorMessage}
          </p>
        )}

        {embedError && (
          <p className="shrink-0 text-sm text-destructive" role="alert">
            {embedError}
          </p>
        )}

        {(step === 'place' || step === 'sign') && !isCompleted && (
          <div
            className="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-inner"
            style={{ minHeight: Math.max(embedSize.height, 480) }}
            data-testid={
              step === 'place' ? 'pandadoc-editor-container' : 'pandadoc-signing-container'
            }
          >
            {(embedLoading || finalizeMutation.isPending) && (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[var(--color-canvas)]/95 backdrop-blur-[1px]"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-soft)]">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                </div>
                <div className="max-w-sm space-y-1.5 px-6 text-center">
                  <p className="text-base font-semibold text-[var(--color-ink)]">
                    {finalizeMutation.isPending
                      ? 'Preparing signing session…'
                      : step === 'place'
                        ? 'Loading PandaDoc editor…'
                        : 'Loading PandaDoc signing…'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {finalizeMutation.isPending
                      ? 'Sending your field placement to PandaDoc.'
                      : 'Rendering the document embed. This can take a few seconds.'}
                  </p>
                </div>
              </div>
            )}
            <div
              ref={embedShellRef}
              className="h-full min-h-[480px] w-full bg-white"
              style={{ minHeight: Math.max(embedSize.height, 480) }}
            />
          </div>
        )}
      </div>
    </Dialog>
  )
}
