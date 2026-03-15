'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { logoutApi } from '@/lib/api'

const AppContext = createContext()

export function AppProvider({ children }) {
    const [session, setSession] = useState(null)  // { api_key, role, hospital_id, name, hospital_name }
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        try {
            const saved = localStorage.getItem('vaidika_session')
            if (saved) setSession(JSON.parse(saved))
        } catch { }
        setLoading(false)
    }, [])

    const login = (sessionData) => {
        setSession(sessionData)
        localStorage.setItem('vaidika_session', JSON.stringify(sessionData))
    }

    const logout = async () => {
        if (session?.api_key) {
            try { await logoutApi(session.api_key) } catch { }
        }
        setSession(null)
        localStorage.removeItem('vaidika_session')
    }

    // Legacy compat — some pages use hospital/doctor directly
    const hospital = session ? { id: session.hospital_id, name: session.hospital_name } : null
    const doctor = session?.role === 'doctor' ? { name: session.name } : null

    return (
        <AppContext.Provider value={{ session, auth: session, login, logout, loading, hospital, doctor }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
