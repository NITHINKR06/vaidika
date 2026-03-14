'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
    const [hospital, setHospital] = useState(null)
    const [doctor, setDoctor] = useState(null)
    const [selectedLanguage, setSelectedLanguage] = useState('hi-IN')

    // Auth States
    const [hospitalLoggedIn, setHospitalLoggedIn] = useState(false)
    const [doctorLoggedIn, setDoctorLoggedIn] = useState(false)

    // Load from local storage on mount
    useEffect(() => {
        const savedHospital = localStorage.getItem('vaidika_hospital')
        const savedDoctor = localStorage.getItem('vaidika_doctor')

        if (savedHospital) {
            setHospital(JSON.parse(savedHospital))
            setHospitalLoggedIn(true)
        }
        if (savedDoctor) {
            setDoctor(JSON.parse(savedDoctor))
            setDoctorLoggedIn(true)
        }
    }, [])

    const selectHospital = (h) => {
        setHospital(h)
        setHospitalLoggedIn(true)
        localStorage.setItem('vaidika_hospital', JSON.stringify(h))
    }

    const selectDoctor = (d) => {
        setDoctor(d)
        setDoctorLoggedIn(true)
        localStorage.setItem('vaidika_doctor', JSON.stringify(d))
    }

    const logout = () => {
        setHospital(null)
        setDoctor(null)
        setHospitalLoggedIn(false)
        setDoctorLoggedIn(false)
        localStorage.removeItem('vaidika_hospital')
        localStorage.removeItem('vaidika_doctor')
    }

    return (
        <AppContext.Provider value={{
            hospital, selectHospital, hospitalLoggedIn,
            doctor, selectDoctor, doctorLoggedIn,
            selectedLanguage, setSelectedLanguage,
            logout
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
