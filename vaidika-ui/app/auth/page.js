'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { Building2, UserCircle2, ArrowRight, ShieldCheck, Activity, Lock, Mail, Key } from 'lucide-react'

const MOCK_HOSPITALS = [
    { id: 'h1', name: 'KMC Hospital, Mangalore', location: 'Hampankatta', color: 'blue' },
    { id: 'h2', name: 'Father Muller Medical College Hospital', location: 'Kankanady', color: 'teal' },
    { id: 'h3', name: 'AJ Hospital & Research Centre', location: 'Kuntikan', color: 'indigo' },
]

const MOCK_DOCTORS = [
    { id: 'd1', hospitalId: 'h1', name: 'Vishweshwara Bhat', speciality: 'Neuro Surgeon' },
    { id: 'd2', hospitalId: 'h1', name: 'Anitha Rao', speciality: 'Cardiologist' },
    { id: 'd3', hospitalId: 'h2', name: 'Santhosh Kumar', speciality: 'General Physician' },
    { id: 'd4', hospitalId: 'h2', name: 'Rashmi Shetty', speciality: 'Pediatrician' },
    { id: 'd5', hospitalId: 'h3', name: 'Prasad Hegde', speciality: 'Orthopedic Surgeon' },
]

export default function AuthPage() {
    const router = useRouter()
    const { selectHospital, selectDoctor, hospital: selectedHospital, doctor: selectedDoctor } = useApp()

    // Steps: 1: Hospital Select, 2: Hospital Login, 3: Doctor Select, 4: Doctor Login
    const [step, setStep] = useState(1)
    const [tempHospital, setTempHospital] = useState(null)
    const [tempDoctor, setTempDoctor] = useState(null)

    // Form States
    const [email, setEmail] = useState('admin@hospital.com')
    const [password, setPassword] = useState('hospital123')
    const [pin, setPin] = useState('1234')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (selectedHospital && !selectedDoctor) setStep(3)
        if (selectedHospital && selectedDoctor) router.push('/')
    }, [selectedHospital, selectedDoctor, router])

    const handleHospitalSelect = (h) => {
        setTempHospital(h)
        setStep(2)
        setError('')
    }

    const handleHospitalLogin = (e) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            if (email === 'admin@hospital.com' && password === 'hospital123') {
                selectHospital(tempHospital)
                setStep(3)
            } else {
                setError('Invalid hospital credentials')
            }
            setLoading(false)
        }, 800)
    }

    const handleDoctorSelect = (d) => {
        setTempDoctor(d)
        setStep(4)
        setError('')
    }

    const handleDoctorLogin = (e) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            if (pin === '1234') {
                selectDoctor(tempDoctor)
                router.push('/')
            } else {
                setError('Invalid secure PIN')
            }
            setLoading(false)
        }, 800)
    }

    return (
        <div className="min-h-screen bg-medical-gradient flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-medical-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
                {/* Left Side: Branding */}
                <div className="text-white space-y-8 animate-in slide-in-from-left-8 duration-700">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-medical-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-medical-500/30">
                            <Activity className="w-9 h-9" />
                        </div>
                        <h1 className="text-5xl font-black tracking-tight leading-none">
                            Vaidika<span className="text-medical-400">AI</span>
                        </h1>
                        <p className="text-xl font-medium text-slate-300">Unified Clinical Intelligence Network</p>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 medical-card border-white/5 bg-slate-900/40 backdrop-blur-xl">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-medical-400" /> Multi-Hospital Protocol
                            </h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Access patient records seamlessly across our cloud-mesh network. Identification via Bio-ID or QR Linkage.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 pl-4">
                            <Feature icon={<Lock className="w-4 h-4 text-medical-400" />} text="Military-grade Patient Privacy" />
                            <Feature icon={<Activity className="w-4 h-4 text-medical-400" />} text="Real-time Neural Consultation" />
                        </div>
                    </div>
                </div>

                {/* Right Side: Step-based Auth */}
                <div className="glass-card rounded-[3rem] p-10 md:p-12 border-white/10 shadow-2xl animate-in slide-in-from-right-8 duration-700">
                    {/* Progress Indicator */}
                    <div className="flex gap-2 mb-8 items-center">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? 'w-8 bg-medical-500' : 'w-4 bg-slate-800'}`} />
                        ))}
                        <span className="ml-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Step {step}/4</span>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-8 animate-in shake-1 duration-300">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in transition-all">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Hospital Network</h3>
                                <p className="text-slate-400 text-sm">Select your medical facility from Mangalore cluster.</p>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {MOCK_HOSPITALS.map((h) => (
                                    <button key={h.id} onClick={() => handleHospitalSelect(h)} className="w-full medical-card group hover:border-medical-500/40 flex items-center justify-between p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-medical-500/20 transition-all">
                                                <Building2 className="w-6 h-6 text-medical-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-200">{h.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{h.location}</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-medical-400 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleHospitalLogin} className="space-y-6 animate-in slide-in-from-right-4 transition-all">
                            <button onClick={() => setStep(1)} className="text-[10px] font-black text-medical-400 hover:text-medical-300 uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors">
                                ← Back to Network
                            </button>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Hospital Login</h3>
                                <p className="text-slate-400 text-sm">Sign in to <span className="text-medical-400 font-bold">{tempHospital?.name}</span></p>
                            </div>
                            <div className="space-y-4">
                                <AuthInput label="Institutional Email" type="email" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} />
                                <AuthInput label="Portal Password" type="password" value={password} onChange={e => setPassword(e.target.value)} icon={<Key className="w-4 h-4" />} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-medical-500 hover:bg-medical-400 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-medical-500/20 transition-all flex items-center justify-center gap-3">
                                {loading ? 'Authorizing...' : <>Secure Access <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 transition-all">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Select Physician</h3>
                                <p className="text-slate-400 text-sm">Choose the active doctor for this session.</p>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {MOCK_DOCTORS.filter(d => d.hospitalId === selectedHospital?.id).map((d) => (
                                    <button key={d.id} onClick={() => handleDoctorSelect(d)} className="w-full medical-card group hover:border-medical-500/40 flex items-center justify-between p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-medical-500/20 transition-all">
                                                <UserCircle2 className="w-6 h-6 text-medical-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-200">Dr. {d.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{d.speciality}</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-medical-400 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <form onSubmit={handleDoctorLogin} className="space-y-6 animate-in slide-in-from-right-4 transition-all">
                            <button onClick={() => setStep(3)} className="text-[10px] font-black text-medical-400 hover:text-medical-300 uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors">
                                ← Back to Doctors
                            </button>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Secure Entry</h3>
                                <p className="text-slate-400 text-sm">Dr. <span className="text-medical-400 font-bold">{tempDoctor?.name}</span>, please enter your PIN.</p>
                            </div>
                            <AuthInput label="Personnel Pin" type="password" value={pin} onChange={e => setPin(e.target.value)} icon={<Lock className="w-4 h-4" />} maxLength={4} />
                            <button type="submit" disabled={loading} className="w-full bg-medical-500 hover:bg-medical-400 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-medical-500/20 transition-all flex items-center justify-center gap-3">
                                {loading ? 'Verifying...' : <>Enter Dashboard <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

function AuthInput({ label, icon, ...props }) {
    return (
        <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                {icon} {label}
            </label>
            <input
                className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3.5 text-slate-200 text-sm placeholder:text-slate-700 focus:border-medical-500/50 focus:outline-none transition-all"
                {...props}
            />
        </div>
    )
}

function Feature({ icon, text }) {
    return (
        <div className="flex items-center gap-3 text-[13px] font-medium text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
                {icon}
            </div>
            <span>{text}</span>
        </div>
    )
}
