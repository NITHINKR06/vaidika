'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { healthCheck } from '@/lib/api'

const PORTALS = [
  { href:'/reception',     icon:'🏥', title:'Reception',     desc:'Register patients + print QR slip',    bg:'bg-blue-900'   },
  { href:'/token-display', icon:'📺', title:'Token Display', desc:'Waiting room TV screen',               bg:'bg-indigo-900' },
  { href:'/doctor',        icon:'🩺', title:'Doctor',        desc:'Bilingual voice consultation + AI',    bg:'bg-teal-800'   },
  { href:'/lab',           icon:'🔬', title:'Laboratory',    desc:'Scan QR → enter test results',         bg:'bg-cyan-800'   },
  { href:'/pharmacy',      icon:'💊', title:'Pharmacy',      desc:'Scan QR → dispense medicines',         bg:'bg-orange-700' },
  { href:'/analytics',     icon:'📊', title:'Analytics',     desc:'Daily stats, severity, languages',     bg:'bg-violet-800' },
]

export default function Home() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    healthCheck().then(setStatus).catch(() => setStatus({ api:'offline' }))
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <div className="inline-block bg-white/10 text-white/50 text-xs px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">
          Protothon Hackathon 2025
        </div>
        <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">VaidikaAI</h1>
        <p className="text-blue-300">Speak any language. Receive world-class care.</p>
      </div>

      {status && (
        <div className="flex gap-3 mb-8 flex-wrap justify-center">
          {[
            { label:'API',    ok: status.api === 'ok'     },
            { label:'Ollama', ok: status.ollama === true  },
            { label:'DB',     ok: status.db === 'ok'      },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium
              ${s.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-green-400' : 'bg-red-400'}`}/>
              {s.label} {s.ok ? 'ready' : 'offline'}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {PORTALS.map(p => (
          <Link key={p.href} href={p.href}
            className={`${p.bg} text-white rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-200`}>
            <div className="text-3xl mb-3">{p.icon}</div>
            <div className="font-bold text-lg">{p.title}</div>
            <div className="text-white/60 text-sm mt-1">{p.desc}</div>
          </Link>
        ))}
      </div>

      <p className="text-white/20 text-xs mt-10 font-mono">API: http://localhost:8000 · Docs: /docs</p>
    </main>
  )
}
