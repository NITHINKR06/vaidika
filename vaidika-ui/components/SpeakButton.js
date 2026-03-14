'use client'
import { useState } from 'react'
import { speakB64 } from '@/lib/api'
import { unlockAudio, playBase64 } from '@/lib/audioPlayer'

/**
 * Reusable TTS Speak Button.
 */
export default function SpeakButton({ text, language, label, className = '', size = 'sm' }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const handleSpeak = async () => {
        if (!text || loading) return

        // 1. Immediately "unlock" the audio context during the user gesture
        unlockAudio();

        setLoading(true)
        setError(false)

        try {
            // 2. Fetch (this delay is now safe because we unlocked the audio engine above)
            const result = await speakB64(text, language)
            if (!result.audio_b64) throw new Error('Empty audio_b64')

            // 3. Play using the persistent manager
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

    const sizeClasses = size === 'md' ? 'px-4 py-2 text-sm' : 'px-2 py-1 text-xs'

    return (
        <button
            onClick={handleSpeak}
            disabled={loading || !text}
            className={`inline-flex items-center gap-1 rounded-lg font-medium transition
        ${error ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'}
        disabled:opacity-40 ${sizeClasses} ${className}`}
        >
            {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : error ? '❌' : '🔊'}
            {label && <span>{label}</span>}
        </button>
    )
}
