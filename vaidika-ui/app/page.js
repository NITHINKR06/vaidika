'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { healthCheck } from '@/lib/api'
import {
  Users,
  Stethoscope,
  Microscope,
  Pill,
  PieChart,
  Tv,
  ShieldCheck,
  Network
} from 'lucide-react'

const PORTALS = [
  { href: '/reception', icon: <Users className="w-5 h-5" />, title: 'Receptionist', desc: 'Register patients and print QR slips.' },
  { href: '/doctor', icon: <Stethoscope className="w-5 h-5" />, title: 'Doctor Portal', desc: 'Bilingual voice consultation with AI.' },
  { href: '/token-display', icon: <Tv className="w-5 h-5" />, title: 'Token Display', desc: 'Live waiting room queue system.' },
  { href: '/lab', icon: <Microscope className="w-5 h-5" />, title: 'Laboratory', desc: 'Process samples and enter results.' },
  { href: '/pharmacy', icon: <Pill className="w-5 h-5" />, title: 'Pharmacy', desc: 'Dispense medicines with QR scan.' },
  { href: '/analytics', icon: <PieChart className="w-5 h-5" />, title: 'System Insights', desc: 'Clinical stats and severities.' },
]

export default function Home() {
  const router = useRouter()
  const { auth } = useApp()
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!auth) { router.push('/auth'); return }
    if (auth.role === 'doctor') { router.push('/doctor'); return }
    if (auth.role === 'receptionist') { router.push('/reception'); return }
    if (auth.role === 'lab_tech') { router.push('/lab'); return }
    if (auth.role === 'system_admin') { router.push('/sysadmin'); return }
    healthCheck().then(setStatus).catch(() => setStatus({ api: 'offline' }))
  }, [auth, router])

  if (!auth) return <div className="min-h-screen bg-[#020b18]" />

  return (
    <main className="min-h-screen bg-[#020b18] text-slate-200 p-8 lg:p-16 relative overflow-hidden font-sans">
      {/* Dynamic Background Effect */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-medical-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-16 gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Network className="w-3 h-3" /> System Operational
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
              Hospital <span className="text-cyan-400">Dashboard</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Welcome to <span className="text-white font-bold">{auth?.name}</span>. Efficiency at every touchpoint.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl">
            <StatusBadge label="API" ok={status?.api === 'ok'} />
            <StatusBadge label="Neural" ok={status?.ollama === true} />
            <StatusBadge label="DB" ok={status?.db === 'ok'} />
          </div>
        </div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PORTALS.map((p, i) => (
            <Link key={p.href} href={p.href}
              className="group relative bg-[#081225]/60 hover:bg-[#0c1a35]/80 border border-white/5 hover:border-cyan-500/40 rounded-[2rem] p-8 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)] flex flex-col h-[280px]"
            >
              {/* Card Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-8 border border-white/5 text-cyan-500 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-500 shadow-inner">
                {p.icon}
              </div>

              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{p.desc}</p>
              </div>

              <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-cyan-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                Enter Portal <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-[10px] font-mono tracking-[0.2em] uppercase">
          <div>VAIDIKAAI V3.0.0 // {auth?.hospital_id || 'SYSTEM'}</div>
          <div>© 2025 PROTOTHON CLINICAL</div>
        </footer>
      </div>
    </main>
  )
}

function StatusBadge({ label, ok }) {
  return (
    <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5">
      <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`} />
      <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">{label}</span>
    </div>
  )
}
