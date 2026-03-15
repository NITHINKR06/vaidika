// lib/api.js — VaidikaAI v4 — all API calls with auth
const BASE = process.env.NEXT_PUBLIC_API_URL

function getKey() {
    try {
        const s = localStorage.getItem('vaidika_session')
        return s ? JSON.parse(s).api_key : null
    } catch { return null }
}

async function req(path, opts = {}, apiKey = null) {
    const key = apiKey || getKey()
    const headers = { 'Content-Type': 'application/json', ...(key ? { 'X-API-Key': key } : {}) }
    const res = await fetch(`${BASE}${path}`, { headers, ...opts })
    if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(e.detail || 'Request failed')
    }
    return res.json()
}

// ── AUTH ──────────────────────────────────────────────────────────
export const systemLogin = d => req('/system/login', { method: 'POST', body: JSON.stringify(d) })
export const hospitalApply = d => req('/hospital/apply', { method: 'POST', body: JSON.stringify(d) })
export const hospitalLogin = d => req('/hospital/login', { method: 'POST', body: JSON.stringify(d) })
export const staffLogin = d => req('/staff/login', { method: 'POST', body: JSON.stringify(d) })
export const logoutApi = (key) => req('/logout', { method: 'POST' }, key)

// ── SYSTEM ADMIN ──────────────────────────────────────────────────
export const getApplications = (status = 'pending') => req(`/system/applications?status=${status}`)
export const decideApplication = (id, d) => req(`/system/applications/${id}`, { method: 'POST', body: JSON.stringify(d) })
export const getAllHospitals = () => req('/system/hospitals')

// ── HOSPITAL ADMIN ────────────────────────────────────────────────
export const addStaff = d => req('/hospital/staff/add', { method: 'POST', body: JSON.stringify(d) })
export const listStaff = () => req('/hospital/staff')
export const deactivateStaff = id => req(`/hospital/staff/${id}/deactivate`, { method: 'POST' })

// ── PATIENT ───────────────────────────────────────────────────────
export const registerPatient = d => req('/register', { method: 'POST', body: JSON.stringify(d) })
export const getPatient = id => req(`/patient/${id}`)
export const getFullRecord = id => req(`/record/${id}`)
export const checkIn = d => req('/checkin', { method: 'POST', body: JSON.stringify(d) })
export const getClinicalPDF_URL = id => `${BASE}/patient/${id}/pdf?api_key=${getKey()}`

// ── CONSULTATION ──────────────────────────────────────────────────
export const saveConsultation = d => req('/consultation', { method: 'POST', body: JSON.stringify(d) })

// ── DEPARTMENTS ───────────────────────────────────────────────────
export const updateDepartment = (patientId, dept, action, data = {}) =>
    req('/department/update', { method: 'POST', body: JSON.stringify({ patient_id: patientId, dept, action, data }) })

// ── TOKENS ────────────────────────────────────────────────────────
export const getActiveTokens = () => req('/tokens/active')

// ── VOICE / LANGUAGE ──────────────────────────────────────────────
export const translateText = (text, source_lang, target_lang) =>
    req('/translate', { method: 'POST', body: JSON.stringify({ text, source_lang, target_lang }) })
export const speakB64 = (text, language) =>
    req('/speak-b64', { method: 'POST', body: JSON.stringify({ text, language }) })
export const getDischargeMessage = id => req(`/discharge/${id}`)

export async function patientSpeech(audioBlob, language) {
    const key = getKey()
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.wav')
    form.append('language', language)
    const res = await fetch(`${BASE}/voice/patient-speech`, {
        method: 'POST', body: form,
        headers: key ? { 'X-API-Key': key } : {}
    })
    if (!res.ok) throw new Error('STT failed')
    return res.json()
}

export async function doctorSpeech(audioBlob, patientLanguage) {
    const key = getKey()
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.wav')
    form.append('patient_language', patientLanguage)
    const res = await fetch(`${BASE}/voice/doctor-speech`, {
        method: 'POST', body: form,
        headers: key ? { 'X-API-Key': key } : {}
    })
    if (!res.ok) throw new Error('STT failed')
    return res.json()
}

// ── ANALYTICS ─────────────────────────────────────────────────────
export const getAnalytics = () => req('/analytics/summary')

// ── HEALTH ────────────────────────────────────────────────────────
export const healthCheck = () => req('/health')
