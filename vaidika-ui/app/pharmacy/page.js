'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import SpeakButton from '@/components/SpeakButton'
import { getFullRecord, updateDepartment, getPharmacyQueue } from '@/lib/api'
import { useApp } from '@/lib/AppContext'
import { useRoleGuard } from '@/lib/useRoleGuard'
import { Pill, CheckCircle2, AlertCircle, ArrowLeft, PackageCheck, Languages, User, History } from 'lucide-react'

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

export default function PharmacyPortal() {
  const { auth } = useApp()
  const { ready } = useRoleGuard('pharmacist', 'hospital_admin')
  const [record, setRecord] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dispensing, setDispensing] = useState(false)
  const [error, setError] = useState('')
  const [queue, setQueue] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const loadQueue = useCallback(async () => {
    try { setQueue(await getPharmacyQueue()) } catch { }
  }, [])

  useEffect(() => {
    if (ready) {
      loadQueue()
      const ival = setInterval(loadQueue, 10000)
      return () => clearInterval(ival)
    }
  }, [loadQueue, ready])

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
        medicines: meds,
        dispensed_at: new Date().toISOString(),
      })
      setDone(true)
      loadQueue()
    } catch (e) { setError(e.message) }
    setDispensing(false)
  }

  const meds = record?.consultation?.prescriptions || []
  const severity = record?.consultation?.severity
  const alreadyDone = record?.pharmacy_status?.status === 'dispensed'
  const patLang = record?.patient?.language || 'hi-IN'
  const langName = LANG_NAMES[patLang] || patLang

  if (!ready) return null

  return (
    <div className="min-h-screen bg-medical-gradient p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Pill className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Pharmacy <span className="text-orange-400">Portal</span></h1>
          </div>
          <Link href="/" className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            <div className="medical-card">
              <PatientLoader onLoad={loadPatient} loading={loading} accentColor="orange" />
            </div>

            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 items-center">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>}

            {record?.patient && (
              <div className="medical-card border-white/5 animate-in fade-in duration-500">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-orange-400 border border-white/5">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 uppercase tracking-tight">{record.patient.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                        {record.patient.patient_id} · {record.patient.age}Y · <Languages className="w-3 h-3" /> {langName}
                      </div>
                      {record.consultation?.diagnosis && (
                        <div className="text-[10px] text-orange-400/60 mt-2 font-mono uppercase">Current DX: {record.consultation.diagnosis}</div>
                      )}
                    </div>
                  </div>
                  {severity && (
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest 
                      ${severity === 'emergency' ? 'bg-red-500/20 text-red-400' :
                        severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                      {severity}
                    </span>
                  )}
                </div>
              </div>
            )}

            {alreadyDone && !done && (
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex gap-3 items-center">
                <CheckCircle2 className="w-4 h-4" /> Prescription already dispensed.
              </div>
            )}

            {meds.length > 0 && !done && !alreadyDone && (
              <div className="space-y-4 pb-12 transition-all">
                <div className="medical-card border-white/5 bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Prescribed medication</p>
                    <SpeakButton text={`You have been prescribed: ${meds.join(', ')}`} language={patLang} label={`Explain in ${langName}`} size="sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {meds.map((med, i) => (
                    <div key={i} className="medical-card bg-slate-800/20 border-white/5 flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-orange-400 font-black text-xs border border-white/5 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        {i + 1}
                      </div>
                      <div className="font-bold text-slate-200 flex-1">{med}</div>
                      <SpeakButton text={med} language={patLang} size="sm" />
                    </div>
                  ))}
                </div>
                <button onClick={markDispensed} disabled={dispensing}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-orange-400 disabled:opacity-50 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3">
                  {dispensing ? 'Processing...' : <><PackageCheck className="w-5 h-5" /> Mark all as dispensed</>}
                </button>
              </div>
            )}

            {record && meds.length === 0 && (
              <div className="medical-card h-48 border-dashed flex flex-col items-center justify-center text-slate-600 gap-4">
                <Pill className="w-8 h-8 opacity-20" />
                <div className="text-sm font-medium uppercase tracking-widest text-[10px] font-bold">No items queued for pharmacy</div>
              </div>
            )}

            {done && (
              <div className="medical-card text-center py-16 animate-in zoom-in-95 duration-500 border-green-500/30 bg-green-500/5">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Dispensing Complete</h2>
                <p className="text-slate-400 text-sm mt-2">Patient records updated across all hospitals.</p>
                <div className="mt-8 space-y-2">
                  {meds.map((m, i) => <div key={i} className="text-xs font-bold text-green-400 uppercase tracking-widest">✓ {m}</div>)}
                </div>
              </div>
            )}

            {record?.history?.length > 1 && (
              <div className="pt-6 border-t border-white/5">
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-orange-400 transition-colors bg-slate-900/40 px-4 py-2 rounded-lg border border-white/5">
                  <History className="w-3.5 h-3.5" /> {showHistory ? 'Hide Global Patient History' : `View Global History (${record.history.length - 1} past visits)`}
                </button>
                {showHistory && (
                  <div className="space-y-4 mt-4 animate-in slide-in-from-top-4 duration-300">
                    {record.history.map((h, i) => (
                      <div key={i} className="medical-card bg-slate-900/20 border-white/5 text-xs hover:border-orange-500/20 transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="font-bold text-slate-200 uppercase tracking-tight">{h.hospital_name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(h.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Diagnosis</p>
                            <p className="text-slate-300 font-medium">{h.diagnosis}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Medication</p>
                            <div className="flex flex-wrap gap-1">
                              {h.prescriptions.map((p, j) => (
                                <span key={j} className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] border border-white/5">{p}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
              Pending Queue <span className="w-5 h-5 bg-orange-500/20 text-orange-400 rounded-md flex items-center justify-center text-[10px]">{queue.length}</span>
            </h3>
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {queue.length === 0 ? (
                <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  No pending patients
                </div>
              ) : (
                queue.map(q => (
                  <button key={q.rx_id} onClick={() => loadPatient(q.patient_id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all group animate-in fade-in
                      ${patientId === q.patient_id ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/5' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white capitalize">{q.name}</span>
                      <span className="text-[10px] font-black text-orange-400">T{q.token_number}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                      {q.patient_id}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
