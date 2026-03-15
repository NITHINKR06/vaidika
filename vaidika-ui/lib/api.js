// lib/api.js — all API calls in one place
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vaidika-backend.onrender.com'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(e.detail || `Request failed`)
  }
  return res.json()
}

// Patient
export const registerPatient = d => req('/register', { method: 'POST', body: JSON.stringify(d) })
export const getPatient = id => req(`/patient/${id}`)
export const getFullRecord = id => req(`/record/${id}`)
export const getAllPatients = () => req('/patients/all')
export const checkIn = d => req('/checkin', { method: 'POST', body: JSON.stringify(d) })
export const getClinicalPDF_URL = id => `${BASE}/patient/${id}/pdf`

// Consultation
export const saveConsultation = d => req('/consultation', { method: 'POST', body: JSON.stringify(d) })

// Departments
export const updateDepartment = (patientId, dept, action, data = {}) =>
  req('/department/update', { method: 'POST', body: JSON.stringify({ patient_id: patientId, dept, action, data }) })

// Tokens
export const getActiveTokens = () => req('/tokens/active')

// Voice / Language
export const translateText = (text, source_lang, target_lang) =>
  req('/translate', { method: 'POST', body: JSON.stringify({ text, source_lang, target_lang }) })

export const speakB64 = (text, language) =>
  req('/speak-b64', { method: 'POST', body: JSON.stringify({ text, language }) })

export const getDischargeMessage = id => req(`/discharge/${id}`)

// Voice — multipart uploads (no JSON headers)
export async function patientSpeech(audioBlob, language) {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.wav')
  form.append('language', language)
  const res = await fetch(`${BASE}/voice/patient-speech`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('STT failed')
  return res.json()
}

export async function doctorSpeech(audioBlob, patientLanguage) {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.wav')
  form.append('patient_language', patientLanguage)
  const res = await fetch(`${BASE}/voice/doctor-speech`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('STT failed')
  return res.json()
}

// Analytics
export const getAnalytics = () => req('/analytics/summary')

// Health
export const healthCheck = () => req('/health')
