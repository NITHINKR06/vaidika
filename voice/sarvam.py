# voice/sarvam.py — Sarvam AI voice pipeline

import os, base64
import requests
from dotenv import load_dotenv

load_dotenv()

SARVAM_KEY = os.getenv('SARVAM_API_KEY', '')
BASE_HEADERS = {'api-subscription-key': SARVAM_KEY}

SUPPORTED_LANGUAGES = {
    'hi-IN': 'Hindi',   'ta-IN': 'Tamil',   'te-IN': 'Telugu',
    'kn-IN': 'Kannada', 'ml-IN': 'Malayalam','bn-IN': 'Bengali',
    'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi',
    'en-IN': 'English',
}


def _check_key():
    if not SARVAM_KEY or SARVAM_KEY == 'your_sarvam_key_here':
        raise ValueError('SARVAM_API_KEY not set in .env')


def speech_to_text(audio_bytes: bytes, language: str = 'hi-IN') -> str:
    """Convert WAV audio bytes → text in given language."""
    _check_key()
    url = 'https://api.sarvam.ai/speech-to-text'
    files = {'file': ('audio.webm', audio_bytes, 'audio/webm')}
    data = {'language_code': language, 'model': 'saarika:v2.5'}
    res = requests.post(url, headers=BASE_HEADERS, files=files, data=data, timeout=30)
    if not res.ok:
        print(f"❌ Sarvam STT Error {res.status_code}: {res.text}")
        res.raise_for_status()
    return res.json().get('transcript', '')


def translate(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text between any two supported languages."""
    _check_key()
    if source_lang == target_lang or not text.strip():
        return text
    url = 'https://api.sarvam.ai/translate'
    payload = {
        'input': text,
        'source_language_code': source_lang,
        'target_language_code': target_lang,
        'model': 'mayura:v1',
    }
    res = requests.post(url, headers={**BASE_HEADERS, 'Content-Type': 'application/json'},
                        json=payload, timeout=30)
    if not res.ok:
        print(f"❌ Sarvam Translate Error {res.status_code}: {res.text}")
        res.raise_for_status()
    return res.json().get('translated_text', '')


def text_to_speech(text: str, language: str = 'hi-IN') -> bytes:
    """Convert text → spoken WAV audio in patient's language."""
    _check_key()
    url = 'https://api.sarvam.ai/text-to-speech'
    payload = {
        'inputs': [text],
        'target_language_code': language,
        'speaker': 'anushka',
        'model': 'bulbul:v2',
    }
    res = requests.post(url, headers={**BASE_HEADERS, 'Content-Type': 'application/json'},
                        json=payload, timeout=30)
    if not res.ok:
        print(f"❌ Sarvam TTS Error {res.status_code}: {res.text}")
        res.raise_for_status()
    # Sarvam returns {"audios": ["<base64 WAV>"], ...}
    data = res.json()
    audio_b64 = data.get('audios', [None])[0]
    if not audio_b64:
        raise ValueError('No audio returned from Sarvam TTS')
    return base64.b64decode(audio_b64)


def stt_and_translate_to_english(audio_bytes: bytes, source_language: str) -> dict:
    """
    Full pipeline: patient audio → transcribed text → English translation.
    Returns both original transcript and English translation.
    Used in doctor consultation mode.
    """
    transcript = speech_to_text(audio_bytes, source_language)
    if source_language == 'en-IN':
        return {'transcript': transcript, 'english': transcript}
    english = translate(transcript, source_language, 'en-IN')
    return {'transcript': transcript, 'english': english}


def translate_and_speak(text: str, source_lang: str, target_lang: str) -> dict:
    """
    Translate text then convert to speech.
    Used when doctor says something → patient hears it in their language.
    Returns translated text + audio bytes.
    """
    translated = translate(text, source_lang, target_lang)
    audio = text_to_speech(translated, target_lang)
    return {'translated': translated, 'audio': audio}


def build_discharge_message(patient_name: str, followup: str, language: str) -> str:
    """Generate personalised discharge message in patient's language."""
    english = (
        f"{patient_name}, your consultation is complete. "
        f"Your medicines have been dispensed. "
        f"Important: {followup}. "
        f"Please take care and get well soon."
    )
    if language == 'en-IN':
        return english
    try:
        return translate(english, 'en-IN', language)
    except Exception:
        return english


if __name__ == '__main__':
    if not SARVAM_KEY or SARVAM_KEY == 'your_sarvam_key_here':
        print('⚠️  Set SARVAM_API_KEY in .env first')
    else:
        r = translate('I have chest pain and fever', 'en-IN', 'hi-IN')
        print(f'✅ Hindi: {r}')
