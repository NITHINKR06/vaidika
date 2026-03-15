'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import SpeakButton from '@/components/SpeakButton'
import { getFullRecord, updateDepartment } from '@/lib/api'
import { useApp } from '@/lib/AppContext'
import { useRoleGuard } from '@/lib/useRoleGuard'
import {
  Microscope,
  FlaskConical,
  CheckCircle2,
  History,
  AlertCircle,
  ArrowLeft,
  Send,
  Languages
} from 'lucide-react'

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

export default function LabPortal() {
  const router = useRouter()
  const { auth, hospital } = useApp()
  const { ready } = useRoleGuard('lab_tech', 'hospital_admin')
  const [record, setRecord] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [results, setResults] = useState({})
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmit] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (ready && !auth) {
      router.push('/auth')
    }
  }, [auth, ready, router])

  if (!ready) return null

  const loadPatient = useCallback(async (id) => {
    setPatientId(id); setLoading(true); setError('')
    setRecord(null); setDone(false); setResults({})
    try { setRecord(await getFullRecord(id)) }
    catch (e) { setError(e.message) }
    setLoading(false)
  }, [])

  const submitResults = async () => {
    const tests = record?.consultation?.lab_tests || []
    const missing = tests.filter(t => !results[t]?.trim())
    if (missing.length) { setError(`Fill results for: ${missing.join(', ')}`); return }
    setSubmit(true); setError('')
    try { await updateDepartment(patientId, 'lab', 'submitted_results', results); setDone(true) }
    catch (e) { setError(e.message) }
    setSubmit(false)
  }

  const tests = record?.consultation?.lab_tests || []
  const patLang = record?.patient?.language || 'hi-IN'
  const langName = LANG_NAMES[patLang] || patLang
  const severity = record?.consultation?.severity

  if (!auth) return null

  return (
    <div className="min-h-screen bg-medical-gradient p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-medical-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-medical-500/20">
              <Microscope className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Laboratory <span className="text-medical-400">Portal</span></h1>
          </div>
          <Link href="/" className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
        </div>

        <div className="medical-card">
          <PatientLoader onLoad={loadPatient} loading={loading} accentColor="medical" />
        </div>

        {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 items-center">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>}

        {record?.patient && (
          <div className="medical-card flex justify-between items-center border-white/5 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-medical-400 border border-white/5">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-200 uppercase tracking-tight">{record.patient.name}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                  {record.patient.patient_id} · {record.patient.age}Y · <Languages className="w-3 h-3" /> {langName}
                </div>
              </div>
            </div>
            {severity && (
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest 
                ${severity === 'emergency' ? 'bg-red-500/20 text-red-400' :
                  severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                {severity} Severity
              </span>
            )}
          </div>
        )}

        {record?.lab_status?.status === 'completed' && !done && (
          <div className="p-4 rounded-2xl bg-medical-500/10 border border-medical-500/20 text-medical-400 text-xs flex gap-3 items-center">
            <History className="w-4 h-4" /> This protocol has already been reported.
          </div>
        )}

        {tests.length > 0 && !done && record?.lab_status?.status !== 'completed' && (
          <div className="space-y-4 pb-12">
            <div className="medical-card border-white/5 bg-slate-900/40">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Required Diagnostics</p>
                <SpeakButton
                  text={`You need to do the following tests: ${tests.join(', ')}`}
                  language={patLang}
                  label={`Explain in ${langName}`}
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tests.map(test => (
                <div key={test} className="medical-card bg-slate-800/20 border-white/5 group hover:border-medical-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-3">
                      <div className="w-2 h-2 bg-medical-500 rounded-full group-hover:animate-pulse" />
                      {test}
                    </div>
                    <SpeakButton text={test} language={patLang} size="sm" />
                  </div>
                  <input placeholder={`Enter results for ${test}...`} value={results[test] || ''}
                    onChange={e => setResults({ ...results, [test]: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-medical-500 transition-all placeholder:text-slate-700" />
                </div>
              ))}
            </div>

            <button onClick={submitResults} disabled={submitting}
              className="w-full bg-medical-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-medical-400 disabled:opacity-50 transition-all shadow-xl shadow-medical-500/20 flex items-center justify-center gap-3">
              {submitting ? 'Submitting Clinical Data...' : <><Send className="w-5 h-5" /> Submit to Physician Dashboard</>}
            </button>
          </div>
        )}

        {record && tests.length === 0 && (
          <div className="medical-card h-48 border-dashed flex flex-col items-center justify-center text-slate-600 gap-4">
            <FlaskConical className="w-8 h-8 opacity-20" />
            <div className="text-sm font-medium">No diagnostic tests currently queued.</div>
          </div>
        )}

        {done && (
          <div className="medical-card text-center py-16 animate-in zoom-in-95 duration-500 border-green-500/30 bg-green-500/5">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Diagnostics Updated</h2>
            <p className="text-slate-400 text-sm mt-2">Data successfully transmitted to Doctor Dashboard</p>
            <div className="mt-8 flex flex-col items-center gap-2">
              {Object.entries(results).map(([k, v]) => (
                <div key={k} className="text-xs font-medium text-slate-500 flex gap-2">
                  <span>{k}:</span>
                  <span className="text-green-400 font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
