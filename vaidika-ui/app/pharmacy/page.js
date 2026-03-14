'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import { getFullRecord, updateDepartment } from '@/lib/api'

export default function PharmacyPortal() {
  const [record, setRecord] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dispensing, setDispensing] = useState(false)
  const [error, setError] = useState('')

  const loadPatient = useCallback(async (id) => {
    setPatientId(id); setLoading(true); setError('')
    setRecord(null); setDone(false)
    try { setRecord(await getFullRecord(id)) }
    catch (e) { setError(e.message) }
    setLoading(false)
  }, [])

  const markDispensed = async () => {
    setDispensing(true); setError('')
    try {
      await updateDepartment(patientId, 'pharmacy', 'dispensed', {
        medicines: record.consultation.prescriptions,
        dispensed_at: new Date().toISOString(),
      })
      setDone(true)
    } catch (e) { setError(e.message) }
    setDispensing(false)
  }

  const meds = record?.consultation?.prescriptions || []
  const severity = record?.consultation?.severity
  const alreadyDone = record?.pharmacy_status?.status === 'dispensed'

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-orange-400 text-sm mb-4 block hover:text-orange-600">← Back</Link>
        <h1 className="text-2xl font-bold text-orange-900 mb-6">💊 Pharmacy Portal</h1>

        <PatientLoader onLoad={loadPatient} loading={loading} accentColor="orange" />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {record?.patient && (
          <div className="bg-white rounded-2xl border-l-4 border-orange-500 p-4 mb-5 shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-800">{record.patient.name}</div>
              <div className="text-slate-500 text-sm">
                Age {record.patient.age} · {record.patient.gender} · {record.patient.patient_id}
              </div>
              {record.consultation?.diagnosis && (
                <div className="text-xs text-slate-400 mt-1">Dx: {record.consultation.diagnosis}</div>
              )}
            </div>
            {severity && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${severity === 'emergency' ? 'bg-red-100 text-red-700' :
                  severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                {severity}
              </span>
            )}
          </div>
        )}

        {alreadyDone && !done && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm text-green-800">
            ✅ Medicines already dispensed for this patient.
          </div>
        )}

        {meds.length > 0 && !done && !alreadyDone && (
          <>
            <p className="text-sm text-slate-500 mb-3">Prescribed by doctor — verify and dispense:</p>
            <div className="space-y-3 mb-5">
              {meds.map((med, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="font-semibold text-slate-800">{med}</div>
                </div>
              ))}
            </div>
            <button onClick={markDispensed} disabled={dispensing}
              className="w-full bg-orange-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition">
              {dispensing ? 'Processing...' : 'MARK ALL DISPENSED ✓'}
            </button>
          </>
        )}

        {record && meds.length === 0 && (
          <div className="text-center text-slate-400 py-12">No medicines prescribed for this patient</div>
        )}

        {done && (
          <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-10">
            <div className="text-5xl mb-3">✅</div>
            <div className="text-green-800 font-bold text-xl">All medicines dispensed!</div>
            <div className="text-green-600 text-sm mt-2">Patient is cleared to leave</div>
            <div className="mt-4 space-y-1">
              {meds.map((m, i) => <div key={i} className="text-xs text-slate-500">✓ {m}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
