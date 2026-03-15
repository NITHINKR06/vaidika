'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { listStaff, addStaff, deactivateStaff, getAnalytics } from '@/lib/api'
import { UserPlus, Users, Building2, FlaskConical, Stethoscope, LogOut, X, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react'

const ROLES = [
    { key: 'doctor', label: 'Doctor', icon: <Stethoscope className="w-4 h-4" /> },
    { key: 'receptionist', label: 'Receptionist', icon: <Users className="w-4 h-4" /> },
    { key: 'lab_tech', label: 'Lab technician', icon: <FlaskConical className="w-4 h-4" /> },
]

export default function AdminPage() {
    const router = useRouter()
    const { auth, logout } = useApp()
    const [staff, setStaff] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ role: 'doctor' })
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')
    const [tab, setTab] = useState('staff')

    useEffect(() => {
        if (!auth || auth.role !== 'hospital_admin') { router.push('/auth'); return }
        fetchStaff()
        getAnalytics().then(setAnalytics).catch(() => {})
    }, [auth])

    const fetchStaff = () => listStaff().then(setStaff).catch(() => {})

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleAdd = async (e) => {
        e.preventDefault()
        setError(''); setMsg(''); setLoading(true)
        try {
            const res = await addStaff(form)
            setMsg(`${res.role} added. Username: ${res.username}`)
            setForm({ role: 'doctor' })
            setShowAdd(false)
            fetchStaff()
        } catch (e) { setError(e.message) }
        setLoading(false)
    }

    const handleDeactivate = async (id, name) => {
        if (!confirm(`Deactivate ${name}? They will lose access immediately.`)) return
        try {
            await deactivateStaff(id)
            fetchStaff()
        } catch (e) { alert(e.message) }
    }

    const handleLogout = () => { logout(); router.push('/auth') }

    const roleColor = { doctor: 'text-blue-400 bg-blue-500/10', receptionist: 'text-teal-400 bg-teal-500/10', lab_tech: 'text-amber-400 bg-amber-500/10', hospital_admin: 'text-purple-400 bg-purple-500/10' }

    return (
        <div className="min-h-screen bg-[#020b18] text-slate-200 p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white">Hospital admin</h1>
                        <p className="text-slate-400 text-sm mt-1">{auth?.name} &nbsp;·&nbsp; ID: {auth?.hospital_id}</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>

                {msg && <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{msg}</div>}
                {error && <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {['staff', 'analytics'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-medical-500/10 text-medical-400 border border-medical-500/30' : 'text-slate-400 border border-white/5 hover:border-white/10'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {tab === 'staff' && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Staff members</h2>
                            <button onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 bg-medical-500 hover:bg-medical-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                                <UserPlus className="w-4 h-4" /> Add staff
                            </button>
                        </div>

                        <div className="space-y-2">
                            {staff.length === 0 && <p className="text-slate-500 text-sm py-8 text-center">No staff added yet. Add your first staff member above.</p>}
                            {staff.map(s => (
                                <div key={s.staff_id} className="flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                                            {ROLES.find(r => r.key === s.role)?.icon || <Users className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-200">{s.name}</div>
                                            <div className="text-xs text-slate-500">@{s.username} &nbsp;·&nbsp; {s.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${roleColor[s.role] || 'text-slate-400 bg-slate-800'}`}>
                                            {s.role.replace('_', ' ')}
                                        </span>
                                        {s.is_active ? (
                                            <button onClick={() => handleDeactivate(s.staff_id, s.name)}
                                                className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all">
                                                Deactivate
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-600 px-3 py-1 rounded-lg border border-white/5">Inactive</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {tab === 'analytics' && analytics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total patients', value: analytics.total_patients },
                            { label: 'Today', value: analytics.today_patients },
                            { label: 'Checked in', value: analytics.checked_in },
                            { label: 'Consultations', value: analytics.total_consultations || 0 },
                        ].map(s => (
                            <div key={s.label} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                                <div className="text-3xl font-black text-white">{s.value}</div>
                                <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                        <div className="col-span-2 md:col-span-4 bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                            <div className="text-sm font-bold text-slate-300 mb-3">Staff by role</div>
                            <div className="flex gap-4 flex-wrap">
                                {Object.entries(analytics.staff_by_role || {}).map(([role, count]) => (
                                    <div key={role} className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${roleColor[role] || 'text-slate-400 bg-slate-800'}`}>
                                        {role.replace('_', ' ')}: {count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add staff modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Add staff member</h3>
                            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</label>
                                <select value={form.role} onChange={set('role')} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-medical-500/50">
                                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                </select>
                            </div>
                            {[
                                { k: 'name', label: 'Full name', placeholder: 'Dr. Priya Sharma' },
                                { k: 'email', label: 'Email', type: 'email', placeholder: 'priya@hospital.com' },
                                { k: 'username', label: 'Username', placeholder: 'drpriya' },
                                { k: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
                                { k: 'specialization', label: 'Specialization (optional)', placeholder: 'Cardiologist' },
                                { k: 'phone', label: 'Phone (optional)', placeholder: '+91 98765 43210' },
                            ].map(f => (
                                <div key={f.k} className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{f.label}</label>
                                    <input type={f.type || 'text'} placeholder={f.placeholder} value={form[f.k] || ''} onChange={set(f.k)}
                                        required={!f.label.includes('optional')}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-medical-500/50 transition-all" />
                                </div>
                            ))}
                            <button type="submit" disabled={loading}
                                className="w-full mt-2 bg-medical-500 hover:bg-medical-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all">
                                {loading ? 'Adding...' : 'Add staff member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
