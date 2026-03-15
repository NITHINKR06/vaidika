'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import { LayoutDashboard, Users, Activity, LogOut, FlaskConical, Pill, BarChart3, ShieldCheck, Building2 } from 'lucide-react'

const ROLE_LINKS = {
    receptionist: [{ href: '/reception', icon: <Users className="w-4 h-4" />, label: 'Reception' }],
    doctor: [{ href: '/doctor', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Doctor' }],
    lab_tech: [{ href: '/lab', icon: <FlaskConical className="w-4 h-4" />, label: 'Laboratory' }],
    hospital_admin: [
        { href: '/admin', icon: <Building2 className="w-4 h-4" />, label: 'Admin' },
        { href: '/analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
    ],
    system_admin: [{ href: '/sysadmin', icon: <ShieldCheck className="w-4 h-4" />, label: 'System admin' }],
}

export default function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { auth, logout } = useApp()

    if (!auth || pathname === '/auth') return null

    const links = ROLE_LINKS[auth.role] || []

    const handleLogout = () => { logout(); router.push('/auth') }

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
                    {links.map(l => (
                        <NavLink key={l.href} href={l.href} icon={l.icon} label={l.label} active={pathname.startsWith(l.href)} />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-white">{auth.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{auth.role?.replace('_', ' ')}</div>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors" title="Logout">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </nav>
    )
}

function NavLink({ href, icon, label, active }) {
    return (
        <Link href={href} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${active ? 'bg-medical-500/10 text-medical-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
            {icon}{label}
        </Link>
    )
}
