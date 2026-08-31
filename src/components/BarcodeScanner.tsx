import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../utils/supabaseClient'

interface Props {
  onProductFound: (product: any) => void
  onClose: () => void
  fmtMoney: (n: number) => string
}

export default function BarcodeScanner({ onProductFound, onClose, fmtMoney }: Props) {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState('')
  const [foundProduct, setFoundProduct] = useState<any>(null)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []))
    return () => { stopScanner() }
  }, [])

  const startScanner = async () => {
    if (!containerRef.current) return
    setScanning(true); setError(''); setFoundProduct(null)
    try {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
        (decodedText) => {
          setLastResult(decodedText)
          lookupProduct(decodedText)
          stopScanner()
        },
        () => {}
      )
    } catch (err: any) {
      setError('Camera access denied or not available. You can type a barcode manually.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
    } catch (_) {}
    setScanning(false)
  }

  const lookupProduct = (code: string) => {
    const clean = code.trim().toLowerCase()
    const found = products.find((p) =>
      p.barcode?.toLowerCase() === clean ||
      p.sku?.toLowerCase() === clean ||
      p.code?.toLowerCase() === clean ||
      p.name?.toLowerCase().includes(clean)
    )
    if (found) {
      setFoundProduct(found)
      setLastResult(code)
    } else {
      setError(`No product found for "${code}"`)
    }
  }

  const handleManualLookup = (code: string) => {
    if (!code.trim()) return
    lookupProduct(code)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 440, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📷 Barcode Scanner</h3>
          <button onClick={() => { stopScanner(); onClose() }} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div id="barcode-reader" ref={containerRef} style={{ width: '100%', borderRadius: 8, overflow: 'hidden', minHeight: scanning ? 200 : 0 }} />

        {!scanning && !foundProduct && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={startScanner} style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              📸 Start Camera Scan
            </button>
          </div>
        )}

        {scanning && (
          <button onClick={stopScanner} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            ⏹ Stop Scanner
          </button>
        )}

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Or type barcode / SKU / product name:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="manual-barcode"
              placeholder="Enter barcode, SKU, or name..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualLookup((e.target as HTMLInputElement).value) }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
              autoFocus
            />
            <button onClick={() => { const v = document.getElementById('manual-barcode') as HTMLInputElement; handleManualLookup(v?.value || '') }} style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🔍 Lookup
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}

        {lastResult && (
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', fontSize: 11 }}>
            Scanned: <b>{lastResult}</b>
          </div>
        )}

        {foundProduct && (
          <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{foundProduct.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Code: {foundProduct.code} · SKU: {foundProduct.sku || '—'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Category: {foundProduct.category || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{fmtMoney(Number(foundProduct.price || 0))}</div>
                <div style={{ fontSize: 12, color: Number(foundProduct.stock_quantity || 0) > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  Stock: {foundProduct.stock_quantity || 0}
                </div>
              </div>
            </div>
            <button onClick={() => { onProductFound(foundProduct); onClose() }} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✓ Add to Document
            </button>
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Supports Code128, EAN13, UPC, QR codes
          </div>
        </div>
      </div>
    </div>
  )
}
