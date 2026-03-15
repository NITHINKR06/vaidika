'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { getApplications, decideApplication, getAllHospitals } from '@/lib/api'
import { CheckCircle2, XCircle, Clock, Building2, LogOut, RefreshCcw } from 'lucide-react'

export default function SysAdminPage() {
    const router = useRouter()
    const { session, logout } = useApp()
    const [tab, setTab] = useState('pending')
    const [applications, setApplications] = useState([])
    const [hospitals, setHospitals] = useState([])
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (!session || session.role !== 'system_admin') { router.push('/auth'); return }
        fetchAll()
    }, [session])

    const fetchAll = () => {
        getApplications('pending').then(setApplications).catch(() => { })
        getAllHospitals().then(setHospitals).catch(() => { })
    }

    const decide = async (id, action, name) => {
        let reason = ''
        if (action === 'reject') {
            reason = prompt('Rejection reason:') || 'Does not meet requirements'
        }
        if (action === 'approve' && !confirm(`Approve ${name}?`)) return
        setLoading(true); setMsg('')
        try {
            await decideApplication(id, { status: action, comments: reason })
            setMsg(`Hospital ${action}d successfully`)
            fetchAll()
        } catch (e) { setMsg(e.message) }
        setLoading(false)
    }

    const statusColor = { approved: 'text-green-400 bg-green-500/10', pending: 'text-amber-400 bg-amber-500/10', rejected: 'text-red-400 bg-red-500/10' }

    return (
        <div className="min-h-screen bg-[#020b18] text-slate-200 p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white">System admin</h1>
                        <p className="text-slate-400 text-sm mt-1">VaidikaAI platform management</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchAll} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                        <button onClick={() => { logout(); router.push('/auth') }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>

                {msg && <div key="msg-box" className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                    {typeof msg === 'string' ? msg : JSON.stringify(msg)}
                </div>}

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                        <div className="text-3xl font-black text-amber-400">{applications.length}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Pending approvals</div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                        <div className="text-3xl font-black text-green-400">{hospitals.filter(h => h.status === 'approved').length}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Active hospitals</div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                        <div className="text-3xl font-black text-blue-400">{hospitals.reduce((a, h) => a + (h.patient_count || 0), 0)}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Total patients</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {['pending', 'hospitals'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-medical-500/10 text-medical-400 border border-medical-500/30' : 'text-slate-400 border border-white/5 hover:border-white/10'}`}>
                            {t === 'pending' ? `Pending applications (${applications.length})` : 'All hospitals'}
                        </button>
                    ))}
                </div>

                {tab === 'pending' ? (
                    <div key="tab-pending" className="space-y-3">
                        {applications.length === 0 ? (
                            <p key="no-apps" className="text-slate-500 text-sm py-8 text-center">No pending applications.</p>
                        ) : (
                            applications.map((a, i) => (
                                <div key={`app-${a.hospital_id}-${i}`} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Building2 className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-white text-lg">{a.name}</span>
                                                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{a.hospital_id}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400">
                                                <span>{a.city}, {a.state}</span>
                                                <span>{a.phone}</span>
                                                <span>{a.admin_email}</span>
                                                <span>License: {a.license_number}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-2">Applied: {new Date(a.applied_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => decide(a.hospital_id, 'approved', a.name)} disabled={loading}
                                                className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                                                <CheckCircle2 className="w-4 h-4" /> Approve
                                            </button>
                                            <button onClick={() => decide(a.hospital_id, 'rejected', a.name)} disabled={loading}
                                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div key="tab-hospitals" className="space-y-2">
                        {hospitals.map((h, i) => (
                            <div key={`hosp-${h.hospital_id}-${i}`} className="flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-200">{h.name}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{h.city}, {h.state} &nbsp;·&nbsp; {h.admin_email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-slate-400">{h.staff_count} staff &nbsp;·&nbsp; {h.patient_count} patients</span>
                                    <span className={`px-3 py-1 rounded-full font-bold capitalize ${statusColor[h.status] || ''}`}>{h.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
