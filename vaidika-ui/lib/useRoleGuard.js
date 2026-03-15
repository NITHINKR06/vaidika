'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'

export function useRoleGuard(...allowedRoles) {
    const { session, loading } = useApp()
    const router = useRouter()
    useEffect(() => {
        if (loading) return
        if (!session) { router.push('/auth'); return }
        if (!allowedRoles.includes(session.role)) { router.push('/auth') }
    }, [session, loading])
    return { session, ready: !loading && !!session && allowedRoles.includes(session?.role) }
}
