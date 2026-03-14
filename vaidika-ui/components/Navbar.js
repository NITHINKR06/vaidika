'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import {
    LayoutDashboard,
    Users,
    Activity,
    Settings,
    LogOut,
    ChevronDown,
    FlaskConical,
    Pill,
    BarChart3
} from 'lucide-react'

export default function Navbar() {
    const pathname = usePathname()
    const { hospital, doctor, logout } = useApp()

    if (pathname === '/auth' || pathname === '/') return null

    return (
        <nav className="nav-blur px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center">
                        <Activity className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Vaidika<span className="text-medical-400">AI</span></span>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    <NavLink href="/reception" icon={<Users className="w-4 h-4" />} label="Reception" active={pathname.startsWith('/reception')} />
                    <NavLink href="/doctor" icon={<LayoutDashboard className="w-4 h-4" />} label="Doctor" active={pathname.startsWith('/doctor')} />
                    <NavLink href="/lab" icon={<FlaskConical className="w-4 h-4" />} label="Laboratory" active={pathname.startsWith('/lab')} />
                    <NavLink href="/pharmacy" icon={<Pill className="w-4 h-4" />} label="Pharmacy" active={pathname.startsWith('/pharmacy')} />
                    <NavLink href="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Waitroom" active={pathname.startsWith('/analytics')} />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {doctor && (
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-white">Dr. {doctor.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{hospital?.name || 'General Hospital'}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </nav>
    )
}

function NavLink({ href, icon, label, active }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${active
                    ? 'bg-medical-500/10 text-medical-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
        >
            {icon}
            {label}
        </Link>
    )
}
