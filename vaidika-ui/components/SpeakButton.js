'use client'
import { useState } from 'react'
import { speakB64 } from '@/lib/api'
import { unlockAudio, playBase64 } from '@/lib/audioPlayer'
import { Volume2, Loader2, AlertCircle } from 'lucide-react'

/**
 * Reusable TTS Speak Button.
 */
export default function SpeakButton({ text, language, label, className = '', size = 'sm' }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const handleSpeak = async () => {
        if (!text || loading) return

        unlockAudio();
        setLoading(true)
        setError(false)

        try {
            const result = await speakB64(text, language)
            if (!result.audio_b64) throw new Error('Empty audio_b64')

            console.log(`[SpeakButton] Fetch done, starting playback...`)
            await playBase64(result.audio_b64)
            console.log('✅ [SpeakButton] Play success')

        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('[SpeakButton] Error:', e)
                setError(true)
                setTimeout(() => setError(false), 3000)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleSpeak}
            disabled={loading || !text}
            title={label || 'Listen to speech'}
            className={`
                inline-flex items-center gap-2 font-bold uppercase tracking-widest transition-all duration-300
                ${size === 'md' ? 'px-4 py-2 text-[10px]' : 'px-3 py-1.5 text-[9px]'}
                ${error
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                    : 'bg-medical-500/10 text-medical-400 border border-medical-500/20 hover:bg-medical-500 hover:text-white hover:border-medical-500'}
                rounded-xl disabled:opacity-40 shadow-sm
            `}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : error ? (
                <AlertCircle className="w-3.5 h-3.5" />
            ) : (
                <Volume2 className="w-3.5 h-3.5" />
            )}
            {label && <span>{label}</span>}
        </button>
    )
}
