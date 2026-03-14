'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerPatient, getFullRecord } from '@/lib/api'
import { useApp } from '@/lib/AppContext'
import QRScanner from '@/components/QRScanner'
import {
  UserPlus,
  User,
  Languages,
  Fingerprint,
  Printer,
  PlusCircle,
  ArrowLeft,
  ChevronRight,
  QrCode,
  Activity,
  CheckCircle2,
  Search,
  History,
  AlertCircle,
  FileText
} from 'lucide-react'

const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi' }, { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' }, { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' }, { code: 'bn-IN', label: 'Bengali' },
  { code: 'mr-IN', label: 'Marathi' }, { code: 'gu-IN', label: 'Gujarati' },
  { code: 'en-IN', label: 'English' },
]

export default function ReceptionPage() {
  const router = useRouter()
  const { hospital } = useApp()
  const [mode, setMode] = useState('new') // 'new' or 'returning'
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', language: 'hi-IN', aadhaar_last4: '' })
  const [searchId, setSearchId] = useState('')
  const [patientHistory, setPatientHistory] = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const printRef = useRef()

  useEffect(() => {
    if (!hospital) {
      router.push('/auth')
    }
  }, [hospital, router])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSearch = async (pid) => {
    const id = pid || searchId
    if (!id) return
    setLoading(true); setError(''); setPatientHistory(null)
    try {
      const data = await getFullRecord(id)
      setPatientHistory(data)
      setForm({
        patient_id: data.patient.patient_id,
        name: data.patient.name,
        age: data.patient.age.toString(),
        gender: data.patient.gender,
        language: data.patient.language,
        aadhaar_last4: data.patient.aadhaar_last4 || ''
      })
    } catch (e) { setError('Patient ID not found') }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!form.name.trim() || !form.age) { setError('Name and age are required'); return }
    setLoading(true); setError('')
    try {
      const data = await registerPatient({ ...form, age: parseInt(form.age) })
      setResult(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleScan = (id) => {
    setShowScanner(false)
    setSearchId(id)
    handleSearch(id)
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Token Slip</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; text-align: center; color: #1e293b; background: white; }
        .branding { font-size: 24px; font-weight: 900; color: #0284c7; margin-bottom: 4px; }
        .hospital { font-size: 14px; color: #64748b; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .id  { font-size: 32px; font-weight: 900; letter-spacing: 2px; margin: 16px 0; font-family: monospace; color: #0f172a; }
        .token-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 24px; padding: 24px; margin: 24px 0; }
        .token { font-size: 64px; font-weight: 900; color: #0284c7; line-height: 1; }
        .room  { font-size: 24px; font-weight: 700; color: #475569; margin-top: 8px; }
        img  { width: 220px; height: 220px; margin: 24px auto; display: block; border-radius: 16px; border: 1px solid #f1f5f9; }
        .footer { color: #94a3b8; font-size: 11px; margin-top: 32px; border-top: 1px solid #f1f5f9; pt: 16px; }
        .pt-name { font-size: 20px; font-weight: 700; color: #1e293b; }
      </style></head><body>
      <div class="branding">VaidikaAI</div>
      <div class="hospital">${hospital?.name || 'General Hospital'}</div>
      <div style="color: #64748b; font-size: 12px; margin-bottom: 8px;">PATIENT NAME ${result.is_re_registration ? '(RE-VISIT)' : ''}</div>
      <div class="pt-name">${result.name}</div>
      <div class="id">${result.patient_id}</div>
      <img src="${result.qr_code}" alt="QR Code"/>
      <div style="font-size:12px; color:#64748b; margin-top:12px;">Scan this QR at every department</div>
      
      <div class="token-card">
        <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">QUEUE TOKEN</div>
        <div class="token">${result.token_number}</div>
        <div class="room">REPORT TO ROOM ${result.room_number}</div>
      </div>
      
      <div class="footer">
        ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}<br/>
        Please carry this slip throughout your visit.
      </div>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  if (!hospital) return null

  if (result) return (
    <div className="min-h-screen bg-medical-gradient flex items-center justify-center p-6">
      <div className="glass-card rounded-[2.5rem] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="bg-medical-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider mb-4">
            <CheckCircle2 className="w-3 h-3" /> Registration Successful
          </div>
          <div className="text-3xl font-black text-white tracking-widest uppercase font-mono">{result.patient_id}</div>
          <div className="text-white/80 font-semibold text-lg mt-1">{result.name}</div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-medical-500/5 blur-3xl rounded-full" />
            {result.qr_code && (
              <img src={result.qr_code} alt="Patient QR" className="w-48 h-48 mx-auto rounded-3xl border border-white/10 shadow-2xl relative z-10 p-2 bg-white/5" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="medical-card p-4 text-center border-white/5">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Queue Token</p>
              <div className="text-4xl font-black text-white">{result.token_number}</div>
            </div>
            <div className="medical-card p-4 text-center border-white/5">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Report To</p>
              <div className="text-4xl font-black text-medical-400">R-{result.room_number}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          <button onClick={handlePrint}
            className="w-full bg-medical-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-medical-400 transition shadow-xl shadow-medical-500/20 flex items-center justify-center gap-3">
            <Printer className="w-5 h-5" /> Print Token Slip
          </button>
          <button onClick={() => { setResult(null); setPatientHistory(null); setMode('new'); setForm({ name: '', age: '', gender: 'Male', language: 'hi-IN', aadhaar_last4: '' }) }}
            className="w-full bg-slate-800 text-slate-300 py-4 rounded-2xl font-bold text-sm hover:bg-slate-700 transition flex items-center justify-center gap-2">
            <PlusCircle className="w-5 h-5" /> Next Registration
          </button>
          <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-slate-300 transition-colors pt-2">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient flex flex-col items-center justify-center p-6">
      {/* Scanner Modal */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Side: Info */}
        <div className="lg:col-span-5 text-white space-y-8 animate-in slide-in-from-left-4 duration-700">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-medical-500 rounded-2xl flex items-center justify-center shadow-lg shadow-medical-500/20">
              <UserPlus className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Patient <br /> <span className="text-medical-400 italic">Registration</span></h1>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Digitizing the first touchpoint. Register patients, assign tokens, and bridge the language barrier from the start.
            </p>
          </div>

          <div className="space-y-6">
            <StepInfo icon={<Activity className="w-5 h-5 text-medical-400" />} title="Smart Routing" desc="Automatic room & token allocation based on load." />
            <StepInfo icon={<Languages className="w-5 h-5 text-medical-400" />} title="Bilingual Ready" desc="Patient's language follows them through the journey." />
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-7 glass-card rounded-[2.5rem] p-10 border-white/10 animate-in slide-in-from-right-4 duration-700">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 mb-8">
            <button onClick={() => { setMode('new'); setPatientHistory(null); setForm({ name: '', age: '', gender: 'Male', language: 'hi-IN', aadhaar_last4: '' }) }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'new' ? 'bg-medical-500 text-white shadow-lg shadow-medical-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              New Patient
            </button>
            <button onClick={() => setMode('returning')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'returning' ? 'bg-medical-500 text-white shadow-lg shadow-medical-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              Returning Patient
            </button>
          </div>

          {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-8 flex gap-3 items-center">
            <Activity className="w-4 h-4" /> {error}
          </div>}

          {mode === 'returning' && !patientHistory && (
            <div className="space-y-6 mb-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex gap-4">
                <div className="flex-1">
                  <InputField
                    label="Patient ID lookup"
                    placeholder="VK-2025-XXXXX"
                    icon={<Search className="w-4 h-4" />}
                    value={searchId}
                    onChange={e => setSearchId(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="pt-6">
                  <button onClick={() => handleSearch()} disabled={loading || !searchId}
                    className="bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-700 transition flex items-center gap-2">
                    {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">OR</span>
              </div>
              <button onClick={() => setShowScanner(true)}
                className="w-full bg-slate-900/60 border border-dashed border-slate-700 hover:border-medical-500/50 hover:bg-slate-900/80 transition-all rounded-[2rem] p-8 text-center group">
                <QrCode className="w-10 h-10 text-slate-600 mx-auto mb-3 group-hover:text-medical-400 transition-colors" />
                <div className="text-sm font-bold text-slate-400 group-hover:text-slate-200">Scan Patient Card</div>
                <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">Instant QR Retrieval</div>
              </button>
            </div>
          )}

          {patientHistory && (
            <div className="space-y-6 mb-10 animate-in slide-in-from-top-4 duration-500">
              <div className="p-6 bg-medical-500/10 border border-medical-500/20 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><History className="w-20 h-20" /></div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{patientHistory.patient.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 font-bold uppercase">{patientHistory.patient.gender} • {patientHistory.patient.age}Y</span>
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-mono tracking-widest uppercase">{patientHistory.patient.patient_id}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm
                    ${patientHistory.consultation?.severity === 'emergency' ? 'bg-red-500 text-white' :
                      patientHistory.consultation?.severity === 'high' ? 'bg-orange-500 text-white' :
                        'bg-green-500/20 text-green-400'}`}>
                    Last Severity: {patientHistory.consultation?.severity || 'Normal'}
                  </div>
                </div>

                {patientHistory.consultation && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Previous Diagnosis</p>
                        <p className="text-sm text-slate-200 font-medium">{patientHistory.consultation.diagnosis || 'Initial consultation pending'}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Last Seen</p>
                        <p className="text-sm text-slate-200 font-medium">{new Date(patientHistory.patient.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!patientHistory.consultation && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs italic bg-slate-900/40 p-3 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5" /> No previous clinical record found
                  </div>
                )}
              </div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Update information if changed:</div>
            </div>
          )}

          {(mode === 'new' || patientHistory) && (
            <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <InputField
                  label="Patient Full Name"
                  placeholder="e.g. Rahul Sharma"
                  icon={<User className="w-4 h-4" />}
                  value={form.name}
                  onChange={set('name')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Age"
                    type="number"
                    placeholder="25"
                    value={form.age}
                    onChange={set('age')}
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                    <select value={form.gender} onChange={set('gender')}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:border-medical-500 focus:outline-none transition-all">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                    <Languages className="w-3 h-3" /> Preferred Language
                  </label>
                  <select value={form.language} onChange={set('language')}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-slate-100 text-sm focus:border-medical-500/50 focus:bg-slate-900/80 focus:outline-none transition-all shadow-inner">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <InputField
                  label="Aadhaar Last 4 (Optional)"
                  placeholder="XXXX"
                  maxLength={4}
                  icon={<Fingerprint className="w-4 h-4" />}
                  value={form.aadhaar_last4}
                  onChange={set('aadhaar_last4')}
                />
              </div>

              <button onClick={handleRegister} disabled={loading}
                className="w-full bg-medical-500 hover:bg-medical-400 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-medical-500/10 hover:shadow-medical-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3 group">
                {loading ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Finalizing Protocol...</> : (
                  <>
                    {patientHistory ? 'Re-Register for New Visit' : 'Register & Generate Token'}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// components/InputField
function InputField({ label, icon, ...props }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
        {icon} {label}
      </label>
      <input
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-slate-100 text-sm placeholder:text-slate-700 focus:border-medical-500/50 focus:bg-slate-900/80 focus:outline-none transition-all shadow-inner"
        {...props}
      />
    </div>
  )
}

function StepInfo({ icon, title, desc }) {
  return (
    <div className="flex gap-4 group">
      <div className="w-11 h-11 rounded-xl bg-slate-900/80 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-medical-500/30 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-200 text-sm tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  )
}
