// lib/useRecorder.js
// Custom hook — records audio from browser mic, returns blob
'use client'
import { useState, useRef, useCallback } from 'react'

export default function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioURL, setAudioURL]   = useState(null)
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])

  const start = useCallback(async () => {
    chunksRef.current = []
    setAudioURL(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      setRecording(true)
    } catch (e) {
      alert('Microphone access denied. Please allow mic in browser settings.')
    }
  }, [])

  const stop = useCallback(() => {
    return new Promise(resolve => {
      const mr = mediaRef.current
      if (!mr) { resolve(null); return }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url  = URL.createObjectURL(blob)
        setAudioURL(url)
        setRecording(false)
        // Stop all mic tracks
        mr.stream.getTracks().forEach(t => t.stop())
        resolve(blob)
      }
      mr.stop()
    })
  }, [])

  return { recording, audioURL, start, stop }
}
