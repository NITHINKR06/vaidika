'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import SpeakButton from '@/components/SpeakButton'
import { unlockAudio, playBase64 } from '@/lib/audioPlayer'
import { useApp } from '@/lib/AppContext'
import { useRoleGuard } from '@/lib/useRoleGuard'
import {
  getFullRecord, saveConsultation, patientSpeech,
  doctorSpeech, translateText, getDischargeMessage, speakB64,
  getClinicalPDF_URL
} from '@/lib/api'
import useRecorder from '@/lib/useRecorder'
import {
  Mic,
  Stethoscope,
  ClipboardList,
  MessageSquare,
  FileText,
  Download,
  User,
  History,
  AlertCircle,
  Play,
  CheckCircle2,
  PhoneCall,
  Loader2,
  Pill,
  Microscope
} from 'lucide-react'

const SEV = {
  low: 'sev-low', medium: 'sev-medium', high: 'sev-high', emergency: 'sev-emergency'
}

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

function playAudio(b64) {
  if (!b64) return;
  playBase64(b64).catch(e => {
    if (e.name !== 'AbortError') console.error('[Audio] Play failed:', e)
  });
}

// ── Voice Turn Component ─────────────────────────────────────────
function VoiceTurn({ label, icon, onResult, buttonText, processingText }) {
  const { recording, start, stop } = useRecorder()
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState('')

  const handleToggle = async () => {
    if (recording) {
      const blob = await stop()
      if (!blob) return
      setProcessing(true)
      setStatus('Processing speech...')
      try {
        await onResult(blob)
        setStatus('Analysis complete')
        setTimeout(() => setStatus(''), 2000)
      } catch (e) {
        setStatus(`Error: ${e.message}`)
        setTimeout(() => setStatus(''), 4000)
      }
      setProcessing(false)
    } else {
      unlockAudio()
      start()
    }
  }

  return (
    <div className="medical-card group border-white/5 hover:border-medical-500/30 transition-all p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-medical-400 border border-white/5">
            {icon}
          </div>
          <span className="font-bold text-sm text-slate-200 tracking-tight">{label}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={processing}
          className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2
            ${recording
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 recording-pulse'
              : 'bg-medical-500/10 text-medical-400 hover:bg-medical-500 hover:text-white border border-medical-500/20'}`}>
          {processing ? processingText : recording ? <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Stop</> : buttonText}
        </button>
      </div>
      {status && <div className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse pl-14">{status}</div>}
    </div>
  )
}

// ── Main Doctor Dashboard ─────────────────────────────────────────
export default function DoctorDashboard() {
  const router = useRouter()
  const { hospital, doctor: currentDoc } = useApp()
  const { ready } = useRoleGuard('doctor')
  if (!ready) return null
  const [record, setRecord] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [loadingPt, setLoadingPt] = useState(false)
  const [conversation, setConversation] = useState([])
  const [clinicalRecord, setClinical] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [discharge, setDischarge] = useState(null)
  const [error, setError] = useState('')
  const transcriptRef = useRef([])

  useEffect(() => {
    if (!hospital || !currentDoc) {
      router.push('/auth')
    }
  }, [hospital, currentDoc, router])

  const patLang = record?.patient?.language || 'hi-IN'
  const langName = LANG_NAMES[patLang] || patLang

  const loadPatient = useCallback(async (id) => {
    setPatientId(id)
    setLoadingPt(true); setError('')
    setRecord(null); setClinical(null); setConversation([]); setDischarge(null)
    transcriptRef.current = []
    try { setRecord(await getFullRecord(id)) }
    catch (e) { setError(e.message) }
    setLoadingPt(false)
  }, [])

  const handlePatientSpeech = useCallback(async (blob) => {
    const result = await patientSpeech(blob, patLang)
    const turn = { role: 'patient', original: result.transcript, translated: result.english, audioB64: null }
    setConversation(prev => {
      const updated = [...prev, turn]; transcriptRef.current = updated; return updated
    })
  }, [patLang])

  const handleDoctorSpeech = useCallback(async (blob) => {
    const result = await doctorSpeech(blob, patLang)
    if (result.audio_b64) playAudio(result.audio_b64)
    const turn = { role: 'doctor', original: result.english_transcript, translated: result.translated, audioB64: result.audio_b64 }
    setConversation(prev => {
      const updated = [...prev, turn]; transcriptRef.current = updated; return updated
    })
  }, [patLang])

  const handleConfirm = async () => {
    const turns = transcriptRef.current.length > 0 ? transcriptRef.current : conversation
    if (turns.length === 0) { setError('Record at least one voice turn before confirming'); return }
    const fullTranscript = turns.map(t => `${t.role === 'doctor' ? 'Doctor' : 'Patient'}: ${t.original || t.translated}`).join('\n')
    setLoadingAI(true); setError('')
    try {
      const result = await saveConsultation({ patient_id: patientId, transcript: fullTranscript, patient_language: patLang })
      setClinical(result)
    } catch (e) { setError(e.message) }
    setLoadingAI(false)
  }

  const handleDischarge = async () => {
    unlockAudio()
    try {
      const msg = await getDischargeMessage(patientId)
      setDischarge(msg)
      if (msg.audio_b64) playAudio(msg.audio_b64)
    } catch (e) { setError(e.message) }
  }

  if (!hospital || !currentDoc) return null

  return (
    <div className="min-h-screen bg-medical-gradient">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">

        {/* Left Sidebar: Patient Profile */}
        <div className="lg:col-span-3 space-y-6">
          <div className="medical-card h-full bg-slate-900/80">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <User className="w-3 h-3" /> Registration
            </h2>

            <PatientLoader onLoad={loadPatient} loading={loadingPt} accentColor="medical" />

            {error && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>}

            {record?.patient && (
              <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-medical-500/10 border border-medical-500/20 flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-medical-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">{record.patient.name}</h3>
                  <p className="text-medical-400 text-[10px] font-bold tracking-widest uppercase mt-1">{record.patient.patient_id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatBox label="Age" value={record.patient.age} />
                  <StatBox label="Gender" value={record.patient.gender} />
                  <StatBox label="Token" value={`#${record.patient.token_number}`} />
                  <StatBox label="Language" value={langName} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Treatment Journey</h4>
                  <TimelineItem active={record.lab_status?.status === 'completed'} label="Laboratory" result={record.lab_status?.results} />
                  <TimelineItem active={record.pharmacy_status?.status === 'dispensed'} label="Pharmacy" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Consultation Area */}
        <div className="lg:col-span-6 space-y-6">
          {!record ? (
            <div className="medical-card h-[600px] flex flex-col items-center justify-center text-center space-y-4 opacity-50 border-dashed">
              <Stethoscope className="w-12 h-12 text-slate-700" />
              <div className="text-slate-500 font-medium">Please select or scan a patient <br /> to begin consultation.</div>
            </div>
          ) : !clinicalRecord ? (
            <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 gap-4">
                <VoiceTurn
                  label={`Patient Interaction`}
                  icon={<MessageSquare className="w-4 h-4" />}
                  onResult={handlePatientSpeech}
                  buttonText={`Rec Patient (${langName})`}
                  processingText="Analyzing Voice..."
                />
                <VoiceTurn
                  label="Doctor Response"
                  icon={<Mic className="w-4 h-4" />}
                  onResult={handleDoctorSpeech}
                  buttonText="Rec Doctor (English)"
                  processingText="Synthesizing..."
                />
              </div>

              <div className="medical-card flex-1 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" /> Live Consultation Transcript
                  </h3>
                  <div className="text-[10px] bg-medical-500/10 text-medical-400 px-2 py-1 rounded-full border border-medical-500/20 font-bold uppercase tracking-widest">
                    Bilingual Mode Active
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {conversation.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-700 italic text-sm">
                      No conversation data yet. Use the buttons above to record.
                    </div>
                  )}
                  {conversation.map((turn, i) => (
                    <div key={i} className={`flex gap-4 ${turn.role === 'doctor' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border 
                        ${turn.role === 'doctor' ? 'bg-medical-500/20 border-medical-500/30 text-medical-400' : 'bg-slate-800 border-white/5 text-slate-400'}`}>
                        {turn.role === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg
                        ${turn.role === 'doctor' ? 'bg-medical-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'}`}>
                        <div className="font-medium text-sm leading-relaxed">{turn.original}</div>
                        {turn.translated && turn.translated !== turn.original && (
                          <div className="mt-3 pt-3 border-t border-white/10 text-xs italic flex items-center justify-between gap-4">
                            <span className="opacity-60">{turn.translated}</span>
                            <SpeakButton text={turn.translated} language={turn.role === 'doctor' ? patLang : 'en-IN'} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleConfirm} disabled={loadingAI || conversation.length === 0}
                  className="w-full mt-6 bg-medical-500 hover:bg-medical-400 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] disabled:opacity-50 transition-all shadow-lg shadow-medical-500/10 flex items-center justify-center gap-2 group">
                  {loadingAI ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Consultation...</> : <>Generate Clinical Record <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /></>}
                </button>
              </div>
            </div>
          ) : (
            <div className="medical-card space-y-6 animate-in zoom-in-95 duration-500 border-green-500/30">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-medical-400" /> Clinical Intelligence Order
                </h3>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${SEV[clinicalRecord.severity]}`}>
                  {clinicalRecord.severity} Severity
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <RecordField label="Diagnosis" value={clinicalRecord.diagnosis} icon={<AlertCircle className="w-4 h-4" />} canSpeak={true} lang={patLang} />
                <RecordField label="Symptoms" value={clinicalRecord.symptoms?.join(', ')} icon={<History className="w-4 h-4" />} />
                <RecordField label="Prescriptions" value={clinicalRecord.prescriptions?.join(', ')} icon={<Pill className="w-4 h-4" />} canSpeak={true} lang={patLang} />
                <RecordField label="Laboratory Orders" value={clinicalRecord.lab_tests?.join(', ')} icon={<Microscope className="w-4 h-4" />} />
              </div>

              <div className="glass-card bg-amber-500/10 border-amber-500/20 p-6 rounded-3xl">
                <h4 className="text-amber-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-500" /> Patient Instruction & Discharge
                </h4>
                {!discharge ? (
                  <button onClick={handleDischarge}
                    className="w-full bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 px-6 py-4 rounded-2xl font-bold text-sm transition-all transition-all duration-300">
                    Generate Bilingual Discharge Speech
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-amber-200/80 italic text-sm leading-relaxed">&ldquo;{discharge.message}&rdquo;</p>
                    <button onClick={() => playAudio(discharge.audio_b64)}
                      className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400">
                      <Play className="w-4 h-4 fill-current" /> REPLAY IN {langName.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Actions & PDF */}
        <div className="lg:col-span-3 space-y-6">
          {clinicalRecord && (
            <div className="medical-card space-y-6 animate-in slide-in-from-right-4 duration-500">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Actions</h3>
              <a
                href={getClinicalPDF_URL(patientId)}
                download={`ClinicalRecord_${patientId}.pdf`}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-2xl p-4 flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">Record PDF</div>
                  <div className="text-[10px] text-slate-500">HIPAA Secured Bundle</div>
                </div>
              </a>

              {clinicalRecord.severity === 'emergency' && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> Emergency Protocol
                  </div>
                  <p className="text-[10px] opacity-70">Duty team has been notified via priority SMS. Specialized response initiated.</p>
                </div>
              )}

              <button onClick={() => window.location.reload()} className="w-full p-4 rounded-2xl border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
                Next Patient
              </button>
            </div>
          )}

          <div className="medical-card">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Doctor Session</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-medical-500/10 flex items-center justify-center text-medical-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Dr. {currentDoc?.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{currentDoc?.speciality || 'Medical Officer'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 shadow-sm">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1.5">{label}</div>
      <div className="text-base font-bold text-white tracking-tight">{value}</div>
    </div>
  )
}

function TimelineItem({ active, label, result }) {
  return (
    <div className={`flex items-start gap-4 ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5 border
        ${active ? 'bg-medical-500/20 border-medical-500/30 text-medical-400' : 'bg-slate-800 border-white/5 text-slate-600'}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wide">{label}</div>
        {result && <div className="text-[10px] text-slate-500 mt-1 font-medium">{JSON.stringify(result)}</div>}
      </div>
    </div>
  )
}

function RecordField({ label, value, icon, canSpeak, lang }) {
  if (!value) return null
  return (
    <div className="space-y-2 border-b border-white/5 pb-4 last:border-0">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
          {icon} {label}
        </label>
        {canSpeak && <SpeakButton text={value} language={lang} size="sm" />}
      </div>
      <div className="text-slate-300 font-medium leading-relaxed">{value}</div>
    </div>
  )
}
