'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getActiveTokens } from '@/lib/api'

export default function TokenDisplay() {
  const [tokens, setTokens] = useState([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const load = async () => { try { setTokens(await getActiveTokens()) } catch {} }
    load()
    const t1 = setInterval(load, 8000)
    const t2 = setInterval(() => setTime(new Date()), 1000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  const visible = tokens.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex flex-col p-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"/>
      <Link href="/" className="absolute top-5 right-6 text-white/20 text-xs hover:text-white/50 z-10">← Home</Link>

      <div className="text-center mb-8 relative z-10">
        <div className="text-blue-400 text-xs tracking-[0.4em] uppercase mb-2">VaidikaAI Hospital</div>
        <div className="text-5xl font-black tracking-tight">NOW SERVING</div>
        <div className="text-white/30 text-sm mt-2">
          {time.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3 max-w-2xl mx-auto w-full relative z-10">
        {visible.length === 0
          ? <div className="text-center text-white/20 text-xl py-16">No active patients today</div>
          : visible.map((t, i) => (
          <div key={t.patient_id}
            className={`flex items-center justify-between rounded-2xl px-10 py-5 transition-all
              ${i === 0
                ? 'bg-white text-slate-900 shadow-2xl scale-105'
                : 'bg-white/5 border border-white/10 text-white'}`}>
            <div>
              <div className={`text-4xl font-black ${i===0?'text-blue-900':''}`}>
                TOKEN {t.token_number}
              </div>
              <div className={`text-sm mt-1 flex items-center gap-2 ${i===0?'text-slate-500':'text-white/40'}`}>
                {t.name}
                {t.checked_in ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Checked In</span> : null}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs mb-0.5 ${i===0?'text-slate-400':'text-white/30'}`}>ROOM</div>
              <div className={`text-4xl font-black ${i===0?'text-blue-900':'text-yellow-300'}`}>{t.room_number}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8 relative z-10">
        <div className="text-2xl font-mono text-white/30 tracking-widest">{time.toLocaleTimeString('en-IN')}</div>
      </div>
    </div>
  )
}
