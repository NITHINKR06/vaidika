// components/PatientLoader.js
// Reusable bar: text input + QR scan button → calls onLoad(patientId)
'use client'
import { useState, useCallback } from 'react'
import QRScanner from './QRScanner'

export default function PatientLoader({ onLoad, loading, accentColor = 'teal' }) {
  const [patientId, setPatientId] = useState('')
  const [scanning, setScanning] = useState(false)

  const colors = {
    teal: { btn: 'bg-teal-700 hover:bg-teal-600', border: 'focus:border-teal-400', qr: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
    cyan: { btn: 'bg-cyan-700 hover:bg-cyan-600', border: 'focus:border-cyan-400', qr: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
    orange: { btn: 'bg-orange-700 hover:bg-orange-600', border: 'focus:border-orange-400', qr: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
  }
  const c = colors[accentColor] || colors.teal

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
      <div className="flex gap-2 mb-5">
        <input
          value={patientId}
          onChange={e => setPatientId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
          placeholder="Enter Patient ID — e.g. VK-2025-AB12C"
          className={`flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none ${c.border}`}
        />
        {/* QR Scan button */}
        <button
          onClick={() => setScanning(true)}
          title="Scan QR code"
          className={`border ${c.qr} px-4 py-3 rounded-xl font-semibold transition flex items-center gap-1.5 text-sm`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M17 20h3M20 17v3" />
          </svg>
          Scan
        </button>
        <button onClick={handleLoad} disabled={loading}
          className={`${c.btn} text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 transition`}>
          {loading ? '...' : 'Load'}
        </button>
      </div>

      {scanning && <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </>
  )
}
