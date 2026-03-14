// components/QRScanner.js
// Drop-in QR scanner component — works in any portal
'use client'
import { useEffect, useRef, useState } from 'react'
import { X, QrCode, AlertCircle } from 'lucide-react'

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const hasScanned = useRef(false)

  useEffect(() => {
    let isCancelled = false
    let scanner = null

    const init = async () => {
      try {
        const Html5QrcodeModule = await import('html5-qrcode')
        const Html5Qrcode = Html5QrcodeModule.Html5Qrcode || (Html5QrcodeModule.default ? Html5QrcodeModule.default.Html5Qrcode : null)

        if (!Html5Qrcode) throw new Error('Scanner module failed to initialize')
        if (isCancelled) return

        const container = document.getElementById('qr-reader')
        if (!container) return

        scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (hasScanned.current || isCancelled) return
            hasScanned.current = true

            try {
              const data = JSON.parse(decodedText)
              onScan(data.patient_id || decodedText)
            } catch {
              onScan(decodedText)
            }
          },
          () => { }
        )
      } catch (e) {
        if (!isCancelled) {
          setError('Clinical vision system offline. Please enter identification manually.')
        }
      }
    }

    init()

    return () => {
      isCancelled = true
      if (scanner) {
        scanner.stop().then(() => {
          scanner.clear()
        }).catch(() => { })
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-hospital-secondary/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="glass-card rounded-[2.5rem] w-full max-w-sm overflow-hidden border-white/10 shadow-2xl">
        <div className="p-6 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-medical-500 flex items-center justify-center text-white">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Protocol Scanner</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-red-400 text-[10px] font-bold text-center py-10 flex flex-col items-center gap-3 uppercase tracking-widest leading-loose">
              <AlertCircle className="w-8 h-8 opacity-50" />
              {error}
            </div>
          ) : (
            <div className="relative group">
              <div id="qr-reader" className="w-full rounded-2xl overflow-hidden [&_video]:!w-full [&_video]:!object-cover [&_canvas]:!hidden border-2 border-slate-800 group-hover:border-medical-500/50 transition-all duration-500" />
              <div className="absolute inset-0 pointer-events-none border-[20px] border-slate-900/50 border-double m-4 rounded-xl opacity-20" />
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-bold text-center mt-6 uppercase tracking-widest">Aligh QR code within the visual frame</p>

          <button onClick={onClose}
            className="w-full mt-6 bg-slate-800 text-slate-300 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
