'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import PatientLoader from '@/components/PatientLoader'
import {
  getFullRecord, saveConsultation, patientSpeech,
  doctorSpeech, translateText, getDischargeMessage, speakB64,
  getClinicalPDF_URL
} from '@/lib/api'
import useRecorder from '@/lib/useRecorder'

const SEV = {
  low: 'sev-low', medium: 'sev-medium', high: 'sev-high', emergency: 'sev-emergency'
}

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

// Play base64 audio in browser
function playAudio(b64) {
  const audio = new Audio(`data:audio/wav;base64,${b64}`)
  audio.play().catch(() => { })
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-400 w-32 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  )
}

// ── Voice Turn Component ─────────────────────────────────────────
function VoiceTurn({ label, color, onResult, buttonText, processingText }) {
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
        setStatus('Done ✓')
        setTimeout(() => setStatus(''), 2000)
      } catch (e) {
        setStatus(`Error: ${e.message}`)
        setTimeout(() => setStatus(''), 4000)
      }
      setProcessing(false)
    } else {
      start()
    }
  }

  return (
    <div className={`rounded-2xl p-4 border ${color}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        <button
          onClick={handleToggle}
          disabled={processing}
          className={`px-5 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50
            ${recording ? 'bg-red-600 text-white recording-pulse' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
          {processing ? processingText : recording ? '⏹ Stop' : buttonText}
        </button>
      </div>
      {recording && <div className="mt-2 text-xs text-red-500 flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse" />Recording...</div>}
      {status && <div className="mt-2 text-xs text-slate-500">{status}</div>}
    </div>
  )
}

// ── Main Doctor Dashboard ─────────────────────────────────────────
export default function DoctorDashboard() {
  const [record, setRecord] = useState(null)
  const [patientId, setPatientId] = useState('')
  const [loadingPt, setLoadingPt] = useState(false)
  const [conversation, setConversation] = useState([]) // [{role, original, translated, audioB64}]
  const [clinicalRecord, setClinical] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [discharge, setDischarge] = useState(null)
  const [error, setError] = useState('')
  const transcriptRef = useRef([])

  const patLang = record?.patient?.language || 'hi-IN'
  const langName = LANG_NAMES[patLang] || patLang

  const loadPatient = async (id) => {
    setPatientId(id)
    setLoadingPt(true); setError('')
    setRecord(null); setClinical(null); setConversation([]); setDischarge(null)
    transcriptRef.current = []
    try { setRecord(await getFullRecord(id)) }
    catch (e) { setError(e.message) }
    setLoadingPt(false)
  }

  // Patient speaks → transcribe in patient lang → translate to English for doctor
  const handlePatientSpeech = useCallback(async (blob) => {
    const result = await patientSpeech(blob, patLang)
    const turn = {
      role: 'patient',
      original: result.transcript,       // patient's language
      translated: result.english,        // English for doctor
      audioB64: null,
    }
    const updated = [...conversation, turn]
    setConversation(updated)
    transcriptRef.current = updated
  }, [patLang, conversation])

  // Doctor speaks → transcribe English → translate to patient lang → play audio to patient
  const handleDoctorSpeech = useCallback(async (blob) => {
    const result = await doctorSpeech(blob, patLang)
    // Play translated audio to patient immediately
    if (result.audio_b64) playAudio(result.audio_b64)
    const turn = {
      role: 'doctor',
      original: result.english_transcript,  // what doctor said in English
      translated: result.translated,         // what patient hears
      audioB64: result.audio_b64,
    }
    const updated = [...conversation, turn]
    setConversation(updated)
    transcriptRef.current = updated
  }, [patLang, conversation])

  // Build full transcript from conversation turns and send to AI
  const handleConfirm = async () => {
    const turns = transcriptRef.current.length > 0 ? transcriptRef.current : conversation
    if (turns.length === 0) { setError('Record at least one voice turn before confirming'); return }

    // Build readable transcript for Qwen2.5
    const fullTranscript = turns.map(t =>
      `${t.role === 'doctor' ? 'Doctor' : 'Patient'}: ${t.original || t.translated}`
    ).join('\n')

    setLoadingAI(true); setError('')
    try {
      const result = await saveConsultation({
        patient_id: patientId,
        transcript: fullTranscript,
        patient_language: patLang,
      })
      setClinical(result)
    } catch (e) { setError(e.message) }
    setLoadingAI(false)
  }

  // Get discharge message + play audio
  const handleDischarge = async () => {
    try {
      const msg = await getDischargeMessage(patientId)
      setDischarge(msg)
      if (msg.audio_b64) playAudio(msg.audio_b64)
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-slate-400 text-sm mb-4 block hover:text-slate-600">← Back</Link>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">🩺 Doctor Dashboard</h1>

        <PatientLoader onLoad={loadPatient} loading={loadingPt} accentColor="teal" />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {/* Patient card */}
        {record?.patient && (
          <div className="bg-white rounded-2xl border-l-4 border-teal-600 p-5 mb-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold text-slate-800">{record.patient.name}</div>
                <div className="text-slate-500 text-sm mt-1">
                  Age {record.patient.age} · {record.patient.gender} · Speaks <strong>{langName}</strong>
                  {' '}· Token #{record.patient.token_number} · Room {record.patient.room_number}
                </div>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-500 px-3 py-1 rounded-lg">{record.patient.patient_id}</span>
            </div>
          </div>
        )}

        {/* Previous dept status */}
        {record?.lab_status?.status === 'completed' && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-3 text-sm text-teal-800">
            ✅ Lab results received: {JSON.stringify(record.lab_status.results)}
          </div>
        )}
        {record?.pharmacy_status?.status === 'dispensed' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-sm text-green-800">
            ✅ Medicines dispensed by pharmacy
          </div>
        )}

        {/* ── BILINGUAL VOICE CONSULTATION ─────────────────────── */}
        {record && !clinicalRecord && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-700">Bilingual Voice Consultation</h2>
              <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                Patient: {langName} ↔ Doctor: English
              </div>
            </div>

            {/* Voice buttons */}
            <div className="space-y-3 mb-5">
              <VoiceTurn
                label={`🎤 Patient speaks — ${langName}`}
                color="border-blue-100 bg-blue-50"
                onResult={handlePatientSpeech}
                buttonText={`Record Patient (${langName})`}
                processingText="Transcribing..."
              />
              <VoiceTurn
                label="🩺 Doctor speaks — English → translated to patient"
                color="border-teal-100 bg-teal-50"
                onResult={handleDoctorSpeech}
                buttonText="Record Doctor (English)"
                processingText="Translating + speaking..."
              />
            </div>

            {/* Conversation transcript */}
            {conversation.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto space-y-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Conversation</p>
                {conversation.map((turn, i) => (
                  <div key={i} className={`flex gap-3 ${turn.role === 'doctor' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${turn.role === 'doctor' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                      {turn.role === 'doctor' ? 'Dr' : 'Pt'}
                    </div>
                    <div className={`rounded-xl p-3 text-sm max-w-xs
                      ${turn.role === 'doctor' ? 'bg-teal-50' : 'bg-blue-50'}`}>
                      <div className="font-medium text-slate-800">{turn.original}</div>
                      {turn.translated && turn.translated !== turn.original && (
                        <div className="text-slate-400 text-xs mt-1 italic">{turn.translated}</div>
                      )}
                      {turn.audioB64 && (
                        <button onClick={() => playAudio(turn.audioB64)}
                          className="text-xs text-teal-600 mt-1 hover:underline">🔊 Replay</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleConfirm} disabled={loadingAI || conversation.length === 0}
              className="w-full bg-teal-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-600 disabled:opacity-50 transition">
              {loadingAI ? '🤖 AI generating clinical record...' : 'CONFIRM & SEND TO DEPARTMENTS'}
            </button>
          </div>
        )}

        {/* Clinical record */}
        {clinicalRecord && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-200 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-lg">Clinical Record</h2>
              <div className="flex items-center gap-3">
                <a
                  href={getClinicalPDF_URL(patientId)}
                  download={`ClinicalRecord_${patientId}.pdf`}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  📄 Download PDF
                </a>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${SEV[clinicalRecord.severity] || 'bg-slate-100 text-slate-600'}`}>
                  {clinicalRecord.severity}
                </span>
              </div>
            </div>
            <Row label="Diagnosis" value={clinicalRecord.diagnosis} />
            <Row label="Symptoms" value={clinicalRecord.symptoms?.join(', ')} />
            <Row label="Prescriptions" value={clinicalRecord.prescriptions?.join(' | ')} />
            <Row label="Lab Tests" value={clinicalRecord.lab_tests?.join(', ')} />
            <Row label="Follow-up" value={clinicalRecord.followup} />
            <Row label="Notes" value={clinicalRecord.clinical_notes} />
            <Row label="Routed to" value={clinicalRecord.route_to?.join(' + ')} />

            {clinicalRecord.severity === 'emergency' && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                🚨 Emergency alert sent to duty team via SMS
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              {!discharge ? (
                <button onClick={handleDischarge}
                  className="text-sm bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 transition">
                  🔊 Speak discharge message to patient in {langName}
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <div className="text-xs text-amber-400 mb-1">Discharge message ({langName})</div>
                  <div className="text-sm text-amber-900 font-medium">{discharge.message}</div>
                  {discharge.audio_b64 && (
                    <button onClick={() => playAudio(discharge.audio_b64)}
                      className="text-xs text-amber-600 mt-2 hover:underline">🔊 Play again</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
