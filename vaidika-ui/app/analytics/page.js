'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAnalytics } from '@/lib/api'

const LANG_NAMES = {
  'hi-IN':'Hindi','ta-IN':'Tamil','te-IN':'Telugu','kn-IN':'Kannada',
  'ml-IN':'Malayalam','bn-IN':'Bengali','mr-IN':'Marathi','gu-IN':'Gujarati','en-IN':'English'
}

function StatCard({ label, value, sub, color='bg-white' }) {
  return (
    <div className={`${color} rounded-2xl p-5 shadow-sm`}>
      <div className="text-3xl font-black text-slate-800">{value ?? '—'}</div>
      <div className="font-semibold text-slate-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarChart({ data, colorClass='bg-blue-500' }) {
  if (!data || Object.keys(data).length === 0) return <div className="text-slate-400 text-sm">No data</div>
  const max = Math.max(...Object.values(data))
  return (
    <div className="space-y-2">
      {Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
        <div key={k} className="flex items-center gap-3">
          <div className="w-24 text-xs text-slate-500 text-right shrink-0">{LANG_NAMES[k] || k}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-5 relative">
            <div className={`${colorClass} h-5 rounded-full transition-all`} style={{width:`${(v/max)*100}%`}}/>
          </div>
          <div className="text-xs font-bold text-slate-600 w-6">{v}</div>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setData(await getAnalytics()) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center">
      <div className="text-violet-400 text-lg">Loading analytics...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-violet-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-violet-400 text-sm mb-1 block hover:text-violet-600">← Back</Link>
            <h1 className="text-2xl font-bold text-slate-800">📊 Analytics Dashboard</h1>
          </div>
          <button onClick={load} className="text-sm bg-violet-100 text-violet-700 px-4 py-2 rounded-xl hover:bg-violet-200 transition">
            🔄 Refresh
          </button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Patients"     value={data?.total_patients}      color="bg-white" />
          <StatCard label="Today"              value={data?.today_patients}      color="bg-white" />
          <StatCard label="Checked In"         value={data?.checked_in}          color="bg-white" />
          <StatCard label="Consultations"      value={data?.total_consultations} color="bg-white" />
        </div>

        {/* Alert + dept row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Emergency Alerts Sent" value={data?.emergency_alerts}
            color={data?.emergency_alerts > 0 ? 'bg-red-50 border border-red-200' : 'bg-white'} />
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="font-semibold text-slate-700 mb-3">🔬 Lab</div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">✓ Completed: <strong>{data?.lab?.completed}</strong></span>
              <span className="text-yellow-600">⏳ Pending: <strong>{data?.lab?.pending}</strong></span>
            </div>
            <div className="mt-2 bg-slate-100 rounded-full h-2">
              {data?.lab && (data.lab.completed + data.lab.pending) > 0 && (
                <div className="bg-green-500 h-2 rounded-full"
                  style={{width:`${(data.lab.completed/(data.lab.completed+data.lab.pending))*100}%`}}/>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="font-semibold text-slate-700 mb-3">💊 Pharmacy</div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">✓ Dispensed: <strong>{data?.pharmacy?.dispensed}</strong></span>
              <span className="text-yellow-600">⏳ Pending: <strong>{data?.pharmacy?.pending}</strong></span>
            </div>
            <div className="mt-2 bg-slate-100 rounded-full h-2">
              {data?.pharmacy && (data.pharmacy.dispensed + data.pharmacy.pending) > 0 && (
                <div className="bg-green-500 h-2 rounded-full"
                  style={{width:`${(data.pharmacy.dispensed/(data.pharmacy.dispensed+data.pharmacy.pending))*100}%`}}/>
              )}
            </div>
          </div>
        </div>

        {/* Severity + Language breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Severity Breakdown</h3>
            {data?.severity_breakdown && Object.keys(data.severity_breakdown).length > 0 ? (
              <div className="space-y-2">
                {['emergency','high','medium','low'].map(s => {
                  const count = data.severity_breakdown[s] || 0
                  if (!count) return null
                  const colors = { emergency:'bg-red-500', high:'bg-orange-400', medium:'bg-yellow-400', low:'bg-green-500' }
                  const max = Math.max(...Object.values(data.severity_breakdown))
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-slate-500 text-right capitalize">{s}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-5">
                        <div className={`${colors[s]} h-5 rounded-full`} style={{width:`${(count/max)*100}%`}}/>
                      </div>
                      <div className="text-xs font-bold text-slate-600 w-5">{count}</div>
                    </div>
                  )
                })}
              </div>
            ) : <div className="text-slate-400 text-sm">No consultations yet</div>}
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Patient Languages</h3>
            <BarChart data={data?.language_breakdown} colorClass="bg-violet-400" />
          </div>
        </div>

        {/* Recent patients */}
        {data?.recent_patients?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">Recent Patients</h3>
            <div className="space-y-2">
              {data.recent_patients.map(p => (
                <div key={p.patient_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                    <span className="text-slate-400 text-xs ml-2">Token #{p.token_number} · Room {p.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{LANG_NAMES[p.language] || p.language}</span>
                    <span className="text-xs font-mono text-slate-300">{p.patient_id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
