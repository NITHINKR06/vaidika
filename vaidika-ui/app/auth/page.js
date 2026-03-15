'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { staffLogin, hospitalLogin, systemLogin, hospitalApply } from '@/lib/api'
import { Activity, ArrowRight, Lock, Mail, Key, Building2, User, ShieldCheck, ChevronLeft, PlusCircle } from 'lucide-react'

export default function AuthPage() {
    const router = useRouter()
    const { auth, login } = useApp()
    const [mode, setMode] = useState('staff') // 'staff' | 'hospital_admin' | 'system_admin' | 'apply'
    const [form, setForm] = useState({})
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (auth) redirectByRole(auth.role, router)
    }, [auth, router])

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

    const handleStaffLogin = async (e) => {
        e.preventDefault()
        setError(''); setLoading(true)
        try {
            const res = await staffLogin(form.username, form.password, form.hospital_id?.toUpperCase())
            if (res.api_key) {
                login({ api_key: res.api_key, role: res.role, hospital_id: res.hospital_id, name: res.name })
                redirectByRole(res.role, router)
            } else {
                setError(res.detail || 'Login failed')
            }
        } catch (e) { setError(e.message) }
        setLoading(false)
    }

    const handleHospitalLogin = async (e) => {
        e.preventDefault()
        setError(''); setLoading(true)
        try {
            const res = await hospitalLogin(form.admin_email, form.password)
            if (res.api_key) {
                login({ api_key: res.api_key, role: 'hospital_admin', hospital_id: res.hospital_id, name: res.hospital_name })
                router.push('/admin')
            } else {
                setError(res.detail || 'Login failed')
            }
        } catch (e) { setError(e.message) }
        setLoading(false)
    }

    const handleSystemLogin = async (e) => {
        e.preventDefault()
        setError(''); setLoading(true)
        try {
            const res = await systemLogin(form.username, form.password)
            if (res.api_key) {
                login({ api_key: res.api_key, role: 'system_admin', name: 'System Admin' })
                router.push('/sysadmin')
            } else {
                setError(res.detail || 'Login failed')
            }
        } catch (e) { setError(e.message) }
        setLoading(false)
    }

    const handleApply = async (e) => {
        e.preventDefault()
        setError(''); setSuccess(''); setLoading(true)
        try {
            const res = await hospitalApply(form)
            if (res.hospital_id) {
                setSuccess(`Application submitted! Your Hospital ID is ${res.hospital_id}. Await system admin approval.`)
                setForm({})
            } else {
                setError(res.detail || 'Submission failed')
            }
        } catch (e) { setError(e.message) }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-[#020b18] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-medical-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
                {/* Branding */}
                <div className="text-white space-y-8">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-medical-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-medical-500/30">
                            <Activity className="w-9 h-9" />
                        </div>
                        <h1 className="text-5xl font-black tracking-tight leading-none">
                            Vaidika<span className="text-medical-400">AI</span>
                        </h1>
                        <p className="text-xl font-medium text-slate-300">Multi-Hospital Clinical Platform</p>
                    </div>
                    {/* Mode selector tabs */}
                    <div className="space-y-2">
                        {[
                            { key: 'staff', icon: <User className="w-4 h-4" />, label: 'Staff login', sub: 'Doctor, receptionist, lab tech' },
                            { key: 'hospital_admin', icon: <Building2 className="w-4 h-4" />, label: 'Hospital admin login', sub: 'Manage your hospital staff' },
                            { key: 'system_admin', icon: <ShieldCheck className="w-4 h-4" />, label: 'System admin login', sub: 'Platform owner access' },
                            { key: 'apply', icon: <PlusCircle className="w-4 h-4" />, label: 'Register your hospital', sub: 'Apply to use VaidikaAI' },
                        ].map(m => (
                            <button key={m.key} onClick={() => { setMode(m.key); setError(''); setSuccess('') }}
                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left
                                    ${mode === m.key ? 'bg-medical-500/10 border-medical-500/40 text-white' : 'border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === m.key ? 'bg-medical-500' : 'bg-slate-800'}`}>{m.icon}</div>
                                <div>
                                    <div className="font-semibold text-sm">{m.label}</div>
                                    <div className="text-xs text-slate-500">{m.sub}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form panel */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    {error && <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
                    {success && <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

                    {mode === 'staff' && (
                        <form onSubmit={handleStaffLogin} className="space-y-5">
                            <h3 className="text-2xl font-bold text-white mb-6">Staff login</h3>
                            <AuthInput label="Hospital ID" placeholder="HOSP-XXXXXXXX" value={form.hospital_id || ''} onChange={set('hospital_id')} icon={<Building2 className="w-4 h-4" />} required />
                            <AuthInput label="Username" placeholder="drpriya" value={form.username || ''} onChange={set('username')} icon={<User className="w-4 h-4" />} required />
                            <AuthInput label="Password" type="password" value={form.password || ''} onChange={set('password')} icon={<Lock className="w-4 h-4" />} required />
                            <SubmitBtn loading={loading} label="Login" />
                        </form>
                    )}

                    {mode === 'hospital_admin' && (
                        <form onSubmit={handleHospitalLogin} className="space-y-5">
                            <h3 className="text-2xl font-bold text-white mb-6">Hospital admin login</h3>
                            <AuthInput label="Admin email" type="email" placeholder="admin@yourhospital.com" value={form.admin_email || ''} onChange={set('admin_email')} icon={<Mail className="w-4 h-4" />} required />
                            <AuthInput label="Password" type="password" value={form.password || ''} onChange={set('password')} icon={<Lock className="w-4 h-4" />} required />
                            <SubmitBtn loading={loading} label="Login" />
                        </form>
                    )}

                    {mode === 'system_admin' && (
                        <form onSubmit={handleSystemLogin} className="space-y-5">
                            <h3 className="text-2xl font-bold text-white mb-6">System admin login</h3>
                            <AuthInput label="Username" placeholder="sysadmin" value={form.username || ''} onChange={set('username')} icon={<User className="w-4 h-4" />} required />
                            <AuthInput label="Password" type="password" value={form.password || ''} onChange={set('password')} icon={<Lock className="w-4 h-4" />} required />
                            <SubmitBtn loading={loading} label="Login" />
                        </form>
                    )}

                    {mode === 'apply' && (
                        <form onSubmit={handleApply} className="space-y-4">
                            <h3 className="text-2xl font-bold text-white mb-4">Register hospital</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><AuthInput label="Hospital name" value={form.name || ''} onChange={set('name')} required /></div>
                                <AuthInput label="License number" value={form.license_number || ''} onChange={set('license_number')} required />
                                <AuthInput label="Phone" value={form.phone || ''} onChange={set('phone')} required />
                                <AuthInput label="Email" type="email" value={form.email || ''} onChange={set('email')} required />
                                <AuthInput label="Pincode" value={form.pincode || ''} onChange={set('pincode')} required />
                                <div className="col-span-2"><AuthInput label="Address" value={form.address || ''} onChange={set('address')} required /></div>
                                <AuthInput label="City" value={form.city || ''} onChange={set('city')} required />
                                <AuthInput label="State" value={form.state || ''} onChange={set('state')} required />
                                <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">Admin account</p>
                                </div>
                                <div className="col-span-2"><AuthInput label="Admin name" value={form.admin_name || ''} onChange={set('admin_name')} required /></div>
                                <AuthInput label="Admin email" type="email" value={form.admin_email || ''} onChange={set('admin_email')} required />
                                <AuthInput label="Password" type="password" value={form.password || ''} onChange={set('password')} required />
                            </div>
                            <SubmitBtn loading={loading} label="Submit application" />
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

function redirectByRole(role, router) {
    if (role === 'system_admin') router.push('/sysadmin')
    else if (role === 'hospital_admin') router.push('/admin')
    else if (role === 'receptionist') router.push('/reception')
    else if (role === 'doctor') router.push('/doctor')
    else if (role === 'lab_tech') router.push('/lab')
    else router.push('/')
}

function AuthInput({ label, icon, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">{icon} {label}</label>}
            <input className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm placeholder:text-slate-600 focus:border-medical-500/50 focus:outline-none transition-all" {...props} />
        </div>
    )
}

function SubmitBtn({ loading, label }) {
    return (
        <button type="submit" disabled={loading}
            className="w-full mt-2 bg-medical-500 hover:bg-medical-400 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3">
            {loading ? 'Please wait...' : <>{label} <ArrowRight className="w-4 h-4" /></>}
        </button>
    )
}
