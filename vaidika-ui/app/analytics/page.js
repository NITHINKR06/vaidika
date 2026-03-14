'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAnalytics } from '@/lib/api'
import { useApp } from '@/lib/AppContext'
import {
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Activity,
  AlertTriangle,
  RefreshCcw,
  ArrowLeft,
  PieChart,
  User,
  Languages,
  History
} from 'lucide-react'

const LANG_NAMES = {
  'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'en-IN': 'English'
}

function StatCard({ label, value, sub, icon, color = 'text-medical-400' }) {
  return (
    <div className="medical-card group">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ${color} border border-white/5 group-hover:bg-medical-500 group-hover:text-white transition-all`}>
          {icon}
        </div>
        <div className="text-2xl font-black text-white">{value ?? '0'}</div>
      </div>
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-1 uppercase font-bold">{sub}</div>}
    </div>
  )
}

function BarChart({ data, colorClass = 'bg-medical-500' }) {
  if (!data || Object.keys(data).length === 0) return <div className="text-slate-600 text-xs italic">No clinical data recorded.</div>
  const max = Math.max(...Object.values(data))
  return (
    <div className="space-y-4">
      {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
        <div key={k} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-slate-400">{LANG_NAMES[k] || k}</span>
            <span className="text-medical-400">{v} Patients</span>
          </div>
          <div className="flex-1 bg-slate-900 border border-white/5 rounded-full h-2 relative overflow-hidden">
            <div className={`${colorClass} h-full rounded-full transition-all duration-1000`} style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const router = useRouter()
  const { hospital } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hospital) {
      router.push('/auth')
    }
  }, [hospital, router])

  const load = async () => {
    setLoading(true)
    try { setData(await getAnalytics()) } catch { }
    setLoading(false)
  }

  useEffect(() => { if (hospital) load() }, [hospital])

  if (!hospital) return null

  if (loading) return (
    <div className="min-h-screen bg-medical-gradient flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-medical-500/20 border-t-medical-500 rounded-full animate-spin" />
      <div className="text-medical-400 text-[10px] font-black uppercase tracking-[0.2em]">Aggregating Clinical Intelligence...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-2">
              <ArrowLeft className="w-3 h-3" /> Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black text-white tracking-tight">System <span className="text-medical-400 italic">Insights</span></h1>
          </div>
          <button onClick={load} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
            <RefreshCcw className="w-4 h-4" /> Sync Data
          </button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Patients" value={data?.total_patients} icon={<Users className="w-5 h-5" />} />
          <StatCard label="Today Priority" value={data?.today_patients} icon={<Clock className="w-5 h-5" />} sub="Daily Throughput" />
          <StatCard label="Active Status" value={data?.checked_in} icon={<Activity className="w-5 h-5" />} />
          <StatCard label="Consultations" value={data?.total_consultations} icon={<CheckCircle2 className="w-5 h-5" />} />
        </div>

        {/* Alert + dept row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`medical-card ${data?.emergency_alerts > 0 ? 'border-red-500/30 bg-red-500/5' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Critical Alerts
              </h3>
              <span className="text-2xl font-black text-white">{data?.emergency_alerts || 0}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-wider">
              Priority SMS interventions triggered today. Duty response protocol active.
            </p>
          </div>

          <DeptCard title="Laboratoy Diagnostics" icon={<PieChart className="w-4 h-4 text-medical-400" />} completed={data?.lab?.completed} pending={data?.lab?.pending} />
          <DeptCard title="Pharmacy Dispensation" icon={<PieChart className="w-4 h-4 text-orange-400" />} completed={data?.pharmacy?.dispensed} pending={data?.pharmacy?.pending} color="orange" />
        </div>

        {/* Severity + Language breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="medical-card">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Severity Triage Analysis</h3>
            {data?.severity_breakdown && Object.keys(data.severity_breakdown).length > 0 ? (
              <div className="space-y-6">
                {['emergency', 'high', 'medium', 'low'].map(s => {
                  const count = data.severity_breakdown[s] || 0
                  const colors = { emergency: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-500' }
                  const max = Math.max(...Object.values(data.severity_breakdown))
                  return (
                    <div key={s} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">{s} Priority</span>
                        <span className="text-white">{count}</span>
                      </div>
                      <div className="flex-1 bg-slate-900 border border-white/5 rounded-full h-2 relative overflow-hidden">
                        <div className={`${colors[s]} h-full rounded-full transition-all duration-1000`} style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <div className="text-slate-600 text-xs italic">No triage data available.</div>}
          </div>

          <div className="medical-card">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 border-b border-white/5 pb-4 flex items-center gap-2">
              <Languages className="w-4 h-4" /> Linguistic Breakdown
            </h3>
            <BarChart data={data?.language_breakdown} colorClass="bg-medical-500" />
          </div>
        </div>

        {/* Recent patients */}
        {data?.recent_patients?.length > 0 && (
          <div className="medical-card">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Access Logs
            </h3>
            <div className="space-y-3">
              {data.recent_patients.map(p => (
                <div key={p.patient_id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-white/5 rounded-2xl group hover:border-medical-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 text-sm uppercase tracking-tight">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Token #{p.token_number} · Room {p.room_number}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-medical-400 uppercase tracking-widest">{LANG_NAMES[p.language] || p.language}</span>
                    <span className="text-[10px] font-mono text-slate-600 mt-1">{p.patient_id}</span>
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

function DeptCard({ title, icon, completed, pending, color = 'medical' }) {
  const total = (completed || 0) + (pending || 0)
  const percent = total > 0 ? (completed / total) * 100 : 0
  const colorClasses = color === 'orange' ? 'bg-orange-500 text-orange-400' : 'bg-medical-500 text-medical-400'

  return (
    <div className="medical-card border-white/5">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="text-2xl font-black text-white">{completed || 0}</div>
          <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Completed</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-white">{pending || 0}</div>
          <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">In Queue</div>
        </div>
      </div>
      <div className="bg-slate-900 border border-white/5 rounded-full h-1.5 overflow-hidden">
        <div className={`${color === 'orange' ? 'bg-orange-500' : 'bg-medical-500'} h-full transition-all duration-1000`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
