'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { registerPatient } from '@/lib/api'

const LANGUAGES = [
  { code:'hi-IN', label:'Hindi'     }, { code:'ta-IN', label:'Tamil'     },
  { code:'te-IN', label:'Telugu'    }, { code:'kn-IN', label:'Kannada'   },
  { code:'ml-IN', label:'Malayalam' }, { code:'bn-IN', label:'Bengali'   },
  { code:'mr-IN', label:'Marathi'   }, { code:'gu-IN', label:'Gujarati'  },
  { code:'en-IN', label:'English'   },
]

export default function ReceptionPage() {
  const [form, setForm]     = useState({ name:'', age:'', gender:'Male', language:'hi-IN', aadhaar_last4:'' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const printRef = useRef()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleRegister = async () => {
    if (!form.name.trim() || !form.age) { setError('Name and age are required'); return }
    setLoading(true); setError('')
    try {
      const data = await registerPatient({ ...form, age: parseInt(form.age) })
      setResult(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Token Slip</title>
      <style>
        body { font-family: sans-serif; padding: 20px; text-align: center; }
        .id  { font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 12px 0; }
        .token { font-size: 48px; font-weight: 900; color: #1e3a8a; }
        .room  { font-size: 24px; color: #374151; margin-top: 4px; }
        img  { width: 200px; height: 200px; margin: 16px auto; display: block; }
        hr   { margin: 16px 0; border-color: #e5e7eb; }
        p    { color: #6b7280; font-size: 13px; }
      </style></head><body>
      <p style="font-size:18px;font-weight:700;">VaidikaAI Hospital</p>
      <p>${new Date().toLocaleDateString('en-IN', { dateStyle:'full' })}</p>
      <hr/>
      <p>Patient Name</p><div style="font-size:22px;font-weight:700;">${result.name}</div>
      <p style="margin-top:8px;">Patient ID</p>
      <div class="id">${result.patient_id}</div>
      <img src="${result.qr_code}" alt="QR Code"/>
      <p style="font-size:11px;color:#9ca3af;">Scan QR at doctor, lab &amp; pharmacy</p>
      <hr/>
      <div class="token">TOKEN ${result.token_number}</div>
      <div class="room">Report to Room ${result.room_number}</div>
      <hr/>
      <p>Please carry this slip throughout your visit.</p>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  if (result) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white p-6 text-center">
          <div className="text-sm text-blue-300 mb-1">Patient Registered ✅</div>
          <div className="text-2xl font-extrabold tracking-wider">{result.patient_id}</div>
          <div className="text-blue-200 mt-1">{result.name}</div>
        </div>

        {/* QR Code */}
        <div className="p-6 text-center" ref={printRef}>
          <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide">Scan at doctor · lab · pharmacy</p>
          {result.qr_code && (
            <img src={result.qr_code} alt="Patient QR" className="w-44 h-44 mx-auto rounded-xl border border-slate-100" />
          )}
          {/* Token */}
          <div className="mt-5 bg-slate-900 rounded-2xl px-6 py-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400">Token Number</p>
              <div className="text-4xl font-black text-white">{result.token_number}</div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Room</p>
              <div className="text-4xl font-black text-yellow-400">{result.room_number}</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Language: <strong>{result.language}</strong></p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button onClick={handlePrint}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2">
            🖨️ Print Token Slip
          </button>
          <button onClick={() => { setResult(null); setForm({ name:'', age:'', gender:'Male', language:'hi-IN', aadhaar_last4:'' }) }}
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition">
            Register Next Patient
          </button>
          <Link href="/" className="text-center text-slate-400 text-sm hover:text-slate-600">← Home</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-md">
        <Link href="/" className="text-blue-400 text-sm mb-5 block hover:text-blue-600">← Back</Link>
        <h1 className="text-2xl font-bold text-blue-900 mb-1">Patient Registration</h1>
        <p className="text-slate-400 text-sm mb-6">Reception desk</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        <label className="block text-xs text-slate-500 mb-1 ml-1">Full Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Ravi Kumar"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-400"/>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1 ml-1">Age *</label>
            <input value={form.age} onChange={set('age')} type="number" placeholder="Age"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1 ml-1">Gender</label>
            <select value={form.gender} onChange={set('gender')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>

        <label className="block text-xs text-slate-500 mb-1 ml-1">Preferred Language *</label>
        <select value={form.language} onChange={set('language')}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-400">
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>

        <label className="block text-xs text-slate-500 mb-1 ml-1">Aadhaar Last 4 Digits (optional)</label>
        <input value={form.aadhaar_last4} onChange={set('aadhaar_last4')} placeholder="XXXX" maxLength={4}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-blue-400"/>

        <button onClick={handleRegister} disabled={loading}
          className="w-full bg-blue-900 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-800 disabled:opacity-50 transition">
          {loading ? 'Registering...' : 'Register Patient'}
        </button>
      </div>
    </div>
  )
}
