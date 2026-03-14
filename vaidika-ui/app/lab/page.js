'use client'
import { useState } from 'react'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import { getFullRecord, updateDepartment } from '@/lib/api'

export default function LabPortal() {
  const [record, setRecord]     = useState(null)
  const [patientId, setPatientId] = useState('')
  const [results, setResults]   = useState({})
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [submitting, setSubmit] = useState(false)
  const [error, setError]       = useState('')

  const loadPatient = async (id) => {
    setPatientId(id); setLoading(true); setError('')
    setRecord(null); setDone(false); setResults({})
    try { setRecord(await getFullRecord(id)) }
    catch (e) { setError(e.message) }
    setLoading(false)
  }

  const submitResults = async () => {
    const tests = record?.consultation?.lab_tests || []
    const missing = tests.filter(t => !results[t]?.trim())
    if (missing.length) { setError(`Fill results for: ${missing.join(', ')}`); return }
    setSubmit(true); setError('')
    try { await updateDepartment(patientId, 'lab', 'submitted_results', results); setDone(true) }
    catch (e) { setError(e.message) }
    setSubmit(false)
  }

  const tests    = record?.consultation?.lab_tests || []
  const severity = record?.consultation?.severity

  return (
    <div className="min-h-screen bg-cyan-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-cyan-400 text-sm mb-4 block hover:text-cyan-600">← Back</Link>
        <h1 className="text-2xl font-bold text-cyan-900 mb-6">🔬 Laboratory Portal</h1>

        <PatientLoader onLoad={loadPatient} loading={loading} accentColor="cyan" />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {record?.patient && (
          <div className="bg-white rounded-2xl border-l-4 border-cyan-500 p-4 mb-5 shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-800">{record.patient.name}</div>
              <div className="text-slate-500 text-sm">Age {record.patient.age} · {record.patient.patient_id}</div>
            </div>
            {severity && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                severity==='emergency'?'bg-red-100 text-red-700':
                severity==='high'?'bg-orange-100 text-orange-700':'bg-slate-100 text-slate-600'}`}>
                {severity}
              </span>
            )}
          </div>
        )}

        {record?.lab_status?.status === 'completed' && !done && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-sm text-teal-800">
            ℹ️ Results already submitted for this patient.
          </div>
        )}

        {tests.length > 0 && !done && record?.lab_status?.status !== 'completed' && (
          <div className="space-y-3 mb-5">
            <p className="text-sm text-slate-500 mb-2">Tests ordered by doctor — fill all results:</p>
            {tests.map(test => (
              <div key={test} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"/>
                  {test}
                </div>
                <input placeholder={`Result for ${test}`} value={results[test]||''}
                  onChange={e => setResults({...results,[test]:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"/>
              </div>
            ))}
            <button onClick={submitResults} disabled={submitting}
              className="w-full bg-cyan-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-cyan-600 disabled:opacity-50 transition">
              {submitting ? 'Submitting...' : 'SUBMIT RESULTS TO DOCTOR'}
            </button>
          </div>
        )}

        {record && tests.length === 0 && (
          <div className="text-center text-slate-400 py-12">No lab tests ordered for this patient</div>
        )}

        {done && (
          <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-10">
            <div className="text-5xl mb-3">✅</div>
            <div className="text-green-800 font-bold text-xl">Results submitted!</div>
            <div className="text-green-600 text-sm mt-1">Doctor dashboard updated live</div>
            <div className="mt-4 text-xs text-slate-400 space-y-1">
              {Object.entries(results).map(([k,v]) => <div key={k}>{k}: <strong>{v}</strong></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
