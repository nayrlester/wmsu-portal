import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, MapPin, ImagePlus, CloudUpload, ScanBarcode, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { loadFieldQueue, enqueueScan, syncFieldQueue, clearSyncedQueue } from '../api/field-queue'
import type { FieldQueueItem } from '../types'

interface GeoCoords {
  latitude: number
  longitude: number
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
    }
  }
}

export function FieldPage() {
  const [searchParams] = useSearchParams()
  const [countId, setCountId] = useState(searchParams.get('countId') ?? '')
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const [geoError, setGeoError] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()
  const [queue, setQueue] = useState<FieldQueueItem[]>(() => loadFieldQueue())
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [cameraSupported, setCameraSupported] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectTimer = useRef<number | null>(null)

  useEffect(() => {
    setCameraSupported(typeof window.BarcodeDetector === 'function')
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setGeoError('')
      },
      (err) => setGeoError(err.message || 'Unable to get location'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const stopCamera = useCallback(() => {
    if (detectTimer.current) {
      window.clearInterval(detectTimer.current)
      detectTimer.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const refreshQueue = () => setQueue(loadFieldQueue())

  const handleEnqueue = (code: string) => {
    if (!countId.trim() || !code.trim()) return
    enqueueScan({
      countId: countId.trim(),
      barcode: code.trim(),
      quantity,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      photoDataUrl,
      scannedAt: new Date().toISOString(),
    })
    setBarcode('')
    setPhotoDataUrl(undefined)
    setQuantity(1)
    refreshQueue()
  }

  const startCamera = async () => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      const detector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
      })
      detectTimer.current = window.setInterval(async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) {
            setBarcode(codes[0].rawValue)
            handleEnqueue(codes[0].rawValue)
            stopCamera()
          }
        } catch {
          /* ignore frame errors */
        }
      }, 500)
    } catch {
      setCameraSupported(false)
      stopCamera()
    }
  }

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const result = await syncFieldQueue()
      clearSyncedQueue()
      refreshQueue()
      setSyncMsg(`Synced ${result.synced}, failed ${result.failed}`)
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const pending = queue.filter((q) => !q.synced).length
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true

  return (
    <div className="mx-auto max-w-lg space-y-4 animate-fade-up pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Field Count</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Mobile barcode scanning with offline queue
          </p>
        </div>
        {!online && (
          <Badge variant="warning">
            <WifiOff className="mr-1 h-3 w-3" /> Offline
          </Badge>
        )}
      </div>

      <div className="uims-card space-y-4 p-4">
        <Input
          label="Count ID"
          value={countId}
          onChange={(e) => setCountId(e.target.value)}
          placeholder="Paste physical count ID"
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {coords
            ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
            : geoError || 'Locating…'}
        </div>

        {cameraSupported && (
          <div className="space-y-2">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="aspect-video w-full rounded-2xl bg-black object-cover"
                  muted
                  playsInline
                />
                <Button variant="outline" className="w-full" onClick={stopCamera}>
                  Stop Camera
                </Button>
              </>
            ) : (
              <Button variant="outline" className="w-full" onClick={startCamera}>
                <Camera className="h-4 w-4" /> Scan with Camera
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-[1fr_80px] gap-2">
          <Input
            label="Barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleEnqueue(barcode)
              }
            }}
            placeholder="Scan or type barcode"
          />
          <Input
            label="Qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-[var(--color-primary-soft)]">
          <ImagePlus className="h-4 w-4" />
          {photoDataUrl ? 'Photo attached' : 'Attach photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPhotoChange}
          />
        </label>

        {photoDataUrl && (
          <img
            src={photoDataUrl}
            alt="Scan evidence"
            className="h-24 w-full rounded-xl object-cover"
          />
        )}

        <Button
          className="w-full"
          disabled={!countId || !barcode}
          onClick={() => handleEnqueue(barcode)}
        >
          <ScanBarcode className="h-4 w-4" /> Queue Scan
        </Button>
      </div>

      <div className="uims-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Offline Queue ({pending} pending)</h2>
          <Button size="sm" disabled={syncing || pending === 0} onClick={handleSync}>
            {syncing ? <Spinner className="h-4 w-4" /> : <CloudUpload className="h-4 w-4" />}
            Sync
          </Button>
        </div>
        {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
        {queue.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No scans queued yet.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {queue.slice(0, 30).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-[var(--color-primary-soft)]/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">{item.barcode}</div>
                  <div className="text-[10px] text-muted-foreground">
                    qty {item.quantity} · {new Date(item.scannedAt).toLocaleTimeString()}
                  </div>
                  {item.error && <div className="text-[10px] text-red-600">{item.error}</div>}
                </div>
                <Badge variant={item.synced ? 'success' : 'warning'}>
                  {item.synced ? 'synced' : 'queued'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
