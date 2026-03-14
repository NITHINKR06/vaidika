// components/QRScanner.js
// Drop-in QR scanner component — works in any portal
'use client'
import { useEffect, useRef, useState } from 'react'

export default function QRScanner({ onScan, onClose }) {
  const divRef    = useRef(null)
  const scannerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let scanner
    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Try to parse JSON payload, fallback to raw string as patient_id
            try {
              const data = JSON.parse(decodedText)
              onScan(data.patient_id || decodedText)
            } catch {
              onScan(decodedText)
            }
          },
          () => {}   // ignore per-frame errors
        )
      } catch (e) {
        setError('Camera not available. Enter Patient ID manually.')
      }
    }
    init()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear()
        }).catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Scan Patient QR Code</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {error ? (
          <div className="text-red-600 text-sm text-center py-4">{error}</div>
        ) : (
          <div id="qr-reader" ref={divRef} className="w-full rounded-xl overflow-hidden [&_video]:!w-full [&_video]:!object-cover [&_canvas]:!hidden" />
        )}

        <p className="text-xs text-slate-400 text-center mt-3">Point camera at the QR code on patient's token slip</p>
        <button onClick={onClose}
          className="w-full mt-3 bg-slate-100 text-slate-700 py-2 rounded-xl text-sm hover:bg-slate-200 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}
