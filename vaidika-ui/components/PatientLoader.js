// components/PatientLoader.js
// Reusable bar: text input + QR scan button → calls onLoad(patientId)
'use client'
import { useState, useCallback } from 'react'
import QRScanner from './QRScanner'
import { Search, QrCode, ArrowRight, Loader2 } from 'lucide-react'

export default function PatientLoader({ onLoad, loading, accentColor = 'medical' }) {
  const [patientId, setPatientId] = useState('')
  const [scanning, setScanning] = useState(false)

  const handleLoad = useCallback(() => {
    if (patientId.trim()) onLoad(patientId.trim())
  }, [patientId, onLoad])

  const handleScan = useCallback((scannedId) => {
    setPatientId(scannedId)
    setTimeout(() => {
      setScanning(false)
      onLoad(scannedId)
    }, 500)
  }, [onLoad])

  return (
    <>
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-medical-400 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoad()}
            placeholder="Search Patient ID..."
            className="w-full h-full bg-slate-900/40 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 text-sm focus:border-medical-500/50 focus:outline-none transition-all placeholder:text-slate-700"
          />
        </div>

        <div className="flex gap-2 h-full">
          <button
            onClick={() => setScanning(true)}
            className="flex-1 md:flex-none bg-slate-800 border border-white/5 px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center gap-2 group whitespace-nowrap">
            <QrCode className="w-3.5 h-3.5" />
            Scan
          </button>

          <button
            onClick={handleLoad}
            disabled={loading || !patientId.trim()}
            className="flex-1 md:flex-none bg-medical-500 hover:bg-medical-400 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-md shadow-medical-500/10 whitespace-nowrap">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ArrowRight className="w-3.5 h-3.5" /> Load</>}
          </button>
        </div>
      </div>

      {scanning && <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </>
  )
}
