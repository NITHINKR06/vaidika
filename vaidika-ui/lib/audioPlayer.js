'use client'

/**
 * Universal Audio Player for VaidikaAI.
 */

let globalAudio = null;
let currentBlobUrl = null;

function getAudio() {
    if (typeof window === 'undefined') return null;
    if (!globalAudio) {
        globalAudio = new Audio();
    }
    return globalAudio;
}

export async function playBase64(b64, type = 'audio/wav') {
    const audio = getAudio();
    if (!audio) return;

    // 1. Cleanup previous
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }

    try {
        // 2. Transcode
        const cleanB64 = b64.replace(/\s/g, '');
        const binaryStr = atob(cleanB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        // 3. Create Source
        const blob = new Blob([bytes], { type });
        currentBlobUrl = URL.createObjectURL(blob);

        // 4. Reset state explicitly
        audio.src = currentBlobUrl;
        audio.muted = false;
        audio.volume = 1.0;
        audio.load();

        console.log(`[AudioPlayer] Start: ${bytes.length} bytes. Duration: ${audio.duration}s`);

        // Monitor progress
        const monitor = setInterval(() => {
            if (!audio.paused) {
                console.log(`[AudioPlayer] Progress: ${audio.currentTime.toFixed(1)}s / ${audio.duration.toFixed(1)}s`);
            }
        }, 1000);

        audio.onended = () => {
            clearInterval(monitor);
            URL.revokeObjectURL(currentBlobUrl);
            console.log(`[AudioPlayer] Finished.`);
        };

        audio.onerror = (e) => {
            clearInterval(monitor);
            console.error('[AudioPlayer] Audio element error:', e);
        };

        await audio.play();
        return true;
    } catch (e) {
        console.error('[AudioPlayer] Playback error:', e);
        throw e;
    }
}

/**
 * Pre-unlocks the audio engine during a user-gesture handler.
 */
export function unlockAudio() {
    const audio = getAudio();
    if (!audio) return;

    // Explicitly unmute and set volume during gesture
    audio.muted = false;
    audio.volume = 1.0;

    if (audio.paused) {
        // Play a tiny silent bit to "awake" the engine on this singleton
        const silentWav = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
        audio.src = "data:audio/wav;base64," + silentWav;
        audio.play().catch(() => { });
    }
}
