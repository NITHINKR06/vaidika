'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import SpeakButton from '@/components/SpeakButton'
import { getFullRecord, updateDepartment } from '@/lib/api'
import { useRoleGuard } from '@/lib/useRoleGuard'
import { Pill, CheckCircle2, AlertCircle, ArrowLeft, PackageCheck, Languages, User } from 'lucide-react'

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

export default function PharmacyPortal() {
  const { ready } = useRoleGuard('lab_tech', 'hospital_admin')
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
  const patLang = record?.patient?.language || 'hi-IN'
  const langName = LANG_NAMES[patLang] || patLang

  if (!ready) return null

  return (
    <div className="min-h-screen bg-medical-gradient p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
                    <div className="text-[10px] text-orange-400/60 mt-2 font-mono">DX: {record.consultation.diagnosis}</div>
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
          <div className="space-y-4 pb-12">
            <div className="medical-card border-white/5 bg-slate-900/40">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Prescribed medication</p>
                <SpeakButton text={`You have been prescribed: ${meds.join(', ')}`} language={patLang} label={`Explain in ${langName}`} size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {meds.map((med, i) => (
                <div key={i} className="medical-card bg-slate-800/20 border-white/5 flex items-center gap-4 group hover:border-orange-500/30">
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
            <div className="text-sm font-medium">No medication prescribed for this patient.</div>
          </div>
        )}

        {done && (
          <div className="medical-card text-center py-16 animate-in zoom-in-95 duration-500 border-green-500/30 bg-green-500/5">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Prescription filled</h2>
            <p className="text-slate-400 text-sm mt-2">Inventory updated and patient cleared.</p>
            <div className="mt-8 space-y-2">
              {meds.map((m, i) => <div key={i} className="text-xs font-bold text-green-400 uppercase tracking-widest">✓ {m}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
