# api/main.py — VaidikaAI v3 Complete Backend
# Run: python api/main.py
# Docs: http://localhost:8000/docs

import sqlite3, uuid, json, datetime, os, threading, base64, io
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv

from agents.schema import (
    PatientRegister, ConsultationRequest, DeptUpdateRequest,
    TranslateRequest, TTSRequest
)
from agents.consultation_agent import generate_clinical_record, check_llm_ready
from voice.sarvam import (
    speech_to_text, translate, text_to_speech,
    stt_and_translate_to_english, translate_and_speak, build_discharge_message
)
from api.database import get_db, init_db
from api.qr_utils import generate_patient_qr, decode_qr_payload
from api.alerts import send_emergency_sms, should_alert
from api.pdf_utils import generate_clinical_pdf

load_dotenv()

app = FastAPI(title='VaidikaAI API v3', version='3.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'],
)


@app.on_event('startup')
def on_startup():
    init_db()
    print('✅ DB ready')
    print('✅ LLM:', 'ready (Gemini/Ollama)' if check_llm_ready() else 'NOT READY — check GOOGLE_API_KEY or start Ollama')


# ── HEALTH ────────────────────────────────────────────────────────
@app.get('/health')
def health():
    return {'api': 'ok', 'llm': check_llm_ready(), 'db': 'ok', 'version': '3.0.0'}


# ── REGISTER PATIENT ──────────────────────────────────────────────
@app.post('/register')
def register_patient(req: PatientRegister):
    """Register patient → returns patient_id, token, room, QR code (base64 PNG)."""
    conn = get_db()
    
    # Calculate new token and room
    count = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
    token_number = count + 1
    room_number = (count % 3) + 1
    
    if req.patient_id:
        # Re-registering existing patient
        patient_id = req.patient_id
        row = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
        if not row:
            conn.close()
            raise HTTPException(404, 'Existing patient ID not found')
        
        # We reuse the ID but update the visit details
        qr_code = generate_patient_qr(patient_id, req.name, token_number, room_number)
        conn.execute(
            '''UPDATE patients SET 
               name=?, age=?, gender=?, language=?, aadhaar_last4=?, 
               token_number=?, room_number=?, qr_code=?, checked_in=0, created_at=? 
               WHERE patient_id=?''',
            (req.name, req.age, req.gender, req.language, req.aadhaar_last4,
             token_number, room_number, qr_code, datetime.datetime.now().isoformat(), patient_id)
        )
    else:
        # New patient registration
        patient_id = f'VK-2025-{str(uuid.uuid4())[:5].upper()}'
        qr_code = generate_patient_qr(patient_id, req.name, token_number, room_number)
        conn.execute(
            'INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            (patient_id, req.name, req.age, req.gender, req.language,
             req.aadhaar_last4, token_number, room_number, qr_code, 0,
             datetime.datetime.now().isoformat())
        )
    
    conn.commit()
    conn.close()

    return {
        'patient_id': patient_id, 'token_number': token_number,
        'room_number': room_number, 'name': req.name,
        'language': req.language, 'qr_code': qr_code, 'status': 'registered',
        'is_re_registration': bool(req.patient_id)
    }


# ── GET PATIENT ───────────────────────────────────────────────────
@app.get('/patient/{patient_id}')
def get_patient(patient_id: str):
    conn = get_db()
    row = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
    conn.close()
    if not row: raise HTTPException(404, 'Patient not found')
    return dict(row)


# ── KIOSK CHECK-IN (patient scans own QR) ─────────────────────────
@app.post('/checkin')
def patient_checkin(data: dict):
    """Patient scans QR at kiosk → marks as checked in."""
    patient_id = data.get('patient_id')
    if not patient_id: raise HTTPException(400, 'patient_id required')
    conn = get_db()
    row = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
    if not row: raise HTTPException(404, 'Patient not found')
    conn.execute('UPDATE patients SET checked_in=1 WHERE patient_id=?', (patient_id,))
    conn.commit(); conn.close()

    # Speak welcome message in patient's language
    welcome_text = f"Welcome {row['name']}. You are Token {row['token_number']}. Please go to Room {row['room_number']}."
    try:
        audio = text_to_speech(
            translate(welcome_text, 'en-IN', row['language']) if row['language'] != 'en-IN' else welcome_text,
            row['language']
        )
        audio_b64 = base64.b64encode(audio).decode('utf-8')
    except Exception:
        audio_b64 = None

    return {
        'patient_id': patient_id, 'name': row['name'],
        'token_number': row['token_number'], 'room_number': row['room_number'],
        'language': row['language'], 'checked_in': True,
        'welcome_audio_b64': audio_b64,
    }


# ── VOICE: PATIENT SPEAKS → ENGLISH FOR DOCTOR ───────────────────
@app.post('/voice/patient-speech')
async def patient_speech(
    audio: UploadFile = File(...),
    language: str = Form('hi-IN')
):
    """
    Patient speaks in their language.
    Returns: original transcript + English translation for doctor.
    """
    audio_bytes = await audio.read()
    try:
        result = stt_and_translate_to_english(audio_bytes, language)
        return {
            'transcript': result['transcript'],          # in patient's language
            'english': result['english'],                # for doctor to read
            'language': language,
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f'❌ Patient Speech Error: {e}')
        raise HTTPException(502, f'Sarvam STT error: {str(e)}')


# ── VOICE: DOCTOR SPEAKS → PATIENT LANGUAGE ──────────────────────
@app.post('/voice/doctor-speech')
async def doctor_speech(
    audio: UploadFile = File(...),
    patient_language: str = Form('hi-IN')
):
    """
    Doctor speaks in English.
    Returns: English transcript + translation in patient language + audio WAV (base64).
    """
    audio_bytes = await audio.read()
    try:
        # Transcribe doctor's English speech
        english_text = speech_to_text(audio_bytes, 'en-IN')

        # Translate + generate audio for patient
        if patient_language != 'en-IN':
            translated = translate(english_text, 'en-IN', patient_language)
            audio_out = text_to_speech(translated, patient_language)
        else:
            translated = english_text
            audio_out = text_to_speech(english_text, 'en-IN')

        audio_b64 = base64.b64encode(audio_out).decode('utf-8')
        return {
            'english_transcript': english_text,
            'translated': translated,
            'patient_language': patient_language,
            'audio_b64': audio_b64,       # play this to patient
        }
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f'❌ Doctor Speech Error: {e}')
        raise HTTPException(502, f'Voice error: {str(e)}')


# ── TRANSLATE TEXT ────────────────────────────────────────────────
@app.post('/translate')
def translate_text(req: TranslateRequest):
    try:
        result = translate(req.text, req.source_lang, req.target_lang)
        return {'translated': result, 'source': req.source_lang, 'target': req.target_lang}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f'Translation error: {str(e)}')


# ── TEXT TO SPEECH ────────────────────────────────────────────────
@app.post('/speak')
def speak(req: TTSRequest):
    try:
        audio = text_to_speech(req.text, req.language)
        return StreamingResponse(iter([audio]), media_type='audio/wav',
            headers={'Content-Disposition': 'attachment; filename=speech.wav'})
    except Exception as e:
        raise HTTPException(502, str(e))


# ── SPEAK BASE64 (for frontend audio playback) ────────────────────
@app.post('/speak-b64')
def speak_b64(req: TTSRequest):
    """Returns audio as base64 string — easier for browser playback."""
    try:
        audio = text_to_speech(req.text, req.language)
        return {'audio_b64': base64.b64encode(audio).decode('utf-8'), 'language': req.language}
    except Exception as e:
        raise HTTPException(502, str(e))


# ── SAVE CONSULTATION ─────────────────────────────────────────────
@app.post('/consultation')
def save_consultation(req: ConsultationRequest):
    """
    1. Translate transcript to English (Sarvam)
    2. Qwen2.5 generates clinical record
    3. Save to SQLite + Delta Lake (async)
    4. Trigger Airflow DAG (async)
    5. Send emergency SMS if high/emergency (async)
    """
    if not check_llm_ready():
        raise HTTPException(503, 'LLM not ready. Configure GOOGLE_API_KEY or start Ollama.')

    english_transcript = req.transcript
    if req.patient_language not in ('en-IN', 'en'):
        try:
            english_transcript = translate(req.transcript, req.patient_language, 'en-IN')
        except Exception:
            english_transcript = req.transcript

    record = generate_clinical_record(english_transcript, req.patient_id)

    conn = get_db()
    consultation_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()

    conn.execute(
        'INSERT INTO consultations VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        (consultation_id, req.patient_id, req.transcript,
         json.dumps(record.symptoms), record.diagnosis,
         json.dumps(record.prescriptions), json.dumps(record.lab_tests),
         record.severity, json.dumps(record.route_to),
         record.followup, record.clinical_notes, now)
    )
    if record.lab_tests:
        conn.execute('INSERT INTO lab_orders VALUES (?,?,?,?,?,?,?)',
            (str(uuid.uuid4()), req.patient_id, json.dumps(record.lab_tests),
             'pending', '{}', now, now))
    if record.prescriptions:
        conn.execute('INSERT INTO prescriptions VALUES (?,?,?,?,?,?)',
            (str(uuid.uuid4()), req.patient_id, json.dumps(record.prescriptions),
             'pending', now, now))
    conn.commit()

    # Get patient info for alerts
    patient = conn.execute('SELECT * FROM patients WHERE patient_id=?', (req.patient_id,)).fetchone()
    conn.close()

    # Background: Delta Lake
    def save_delta():
        try:
            from data.spark_manager import save_consultation_to_delta
            save_consultation_to_delta({**record.model_dump(), 'consultation_id': consultation_id, 'created_at': now})
        except Exception as e:
            print(f'Delta skip: {e}')

    # Background: Airflow
    def trigger_airflow():
        try:
            import subprocess
            conf = json.dumps({'patient_id': req.patient_id, 'lab_tests': record.lab_tests,
                               'prescriptions': record.prescriptions, 'severity': record.severity})
            subprocess.run(['airflow', 'dags', 'trigger', 'hospital_workflow', '--conf', conf],
                           capture_output=True, timeout=10)
        except Exception as e:
            print(f'Airflow skip: {e}')

    # Background: Emergency SMS
    def send_alert():
        if should_alert(record.severity) and patient:
            conn2 = get_db()
            result = send_emergency_sms(patient['name'], req.patient_id, record.severity,
                                         record.diagnosis, patient['room_number'])
            conn2.execute('INSERT INTO emergency_alerts VALUES (?,?,?,?,?,?)',
                (str(uuid.uuid4()), req.patient_id, record.severity, record.diagnosis,
                 1 if result.get('status') == 'sent' else 0, now))
            conn2.commit(); conn2.close()

    for fn in [save_delta, trigger_airflow, send_alert]:
        threading.Thread(target=fn, daemon=True).start()

    return record


# ── DEPARTMENT UPDATE ─────────────────────────────────────────────
@app.post('/department/update')
def dept_update(req: DeptUpdateRequest):
    conn = get_db()
    now = datetime.datetime.now().isoformat()
    conn.execute('INSERT INTO dept_updates VALUES (?,?,?,?,?,?)',
        (str(uuid.uuid4()), req.patient_id, req.dept, req.action, json.dumps(req.data), now))
    if req.dept == 'lab' and req.action == 'submitted_results':
        conn.execute('UPDATE lab_orders SET status=?,results=?,updated_at=? WHERE patient_id=?',
            ('completed', json.dumps(req.data), now, req.patient_id))
    elif req.dept == 'pharmacy' and req.action == 'dispensed':
        conn.execute('UPDATE prescriptions SET status=?,updated_at=? WHERE patient_id=?',
            ('dispensed', now, req.patient_id))
    conn.commit(); conn.close()
    return {'status': 'updated', 'dept': req.dept}


# ── FULL RECORD ───────────────────────────────────────────────────
@app.get('/record/{patient_id}')
def get_full_record(patient_id: str):
    conn = get_db()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
    if not patient: raise HTTPException(404, 'Patient not found')
    consult  = conn.execute('SELECT * FROM consultations WHERE patient_id=? ORDER BY created_at DESC LIMIT 1', (patient_id,)).fetchone()
    lab      = conn.execute('SELECT * FROM lab_orders WHERE patient_id=? ORDER BY created_at DESC LIMIT 1', (patient_id,)).fetchone()
    rx       = conn.execute('SELECT * FROM prescriptions WHERE patient_id=? ORDER BY created_at DESC LIMIT 1', (patient_id,)).fetchone()
    updates  = conn.execute('SELECT * FROM dept_updates WHERE patient_id=? ORDER BY updated_at DESC', (patient_id,)).fetchall()
    conn.close()
    return {
        'patient': dict(patient),
        'consultation': {
            'symptoms':      json.loads(consult['symptoms']) if consult else [],
            'diagnosis':     consult['diagnosis'] if consult else '',
            'prescriptions': json.loads(consult['prescriptions']) if consult else [],
            'lab_tests':     json.loads(consult['lab_tests']) if consult else [],
            'severity':      consult['severity'] if consult else '',
            'route_to':      json.loads(consult['route_to']) if consult else [],
            'followup':      consult['followup'] if consult else '',
            'clinical_notes':consult['clinical_notes'] if consult else '',
            'created_at':    consult['created_at'] if consult else None,
        } if consult else {},
        'lab_status': {
            'status': lab['status'] if lab else 'not_ordered',
            'tests':  json.loads(lab['tests']) if lab else [],
            'results':json.loads(lab['results']) if lab else {},
        },
        'pharmacy_status': {
            'status':   rx['status'] if rx else 'not_prescribed',
            'medicines':json.loads(rx['medicines']) if rx else [],
        },
        'dept_updates': [{'dept':u['dept'],'action':u['action'],'data':json.loads(u['data']),'updated_at':u['updated_at']} for u in updates],
    }


# ── ACTIVE TOKENS ─────────────────────────────────────────────────
@app.get('/tokens/active')
def get_active_tokens():
    conn = get_db()
    today = datetime.date.today().isoformat()
    rows = conn.execute(
        "SELECT patient_id,name,token_number,room_number,checked_in FROM patients WHERE created_at LIKE ? ORDER BY token_number",
        (f'{today}%',)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── DISCHARGE MESSAGE ─────────────────────────────────────────────
@app.get('/discharge/{patient_id}')
def discharge(patient_id: str):
    conn = get_db()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
    consult = conn.execute('SELECT followup FROM consultations WHERE patient_id=? ORDER BY created_at DESC LIMIT 1', (patient_id,)).fetchone()
    conn.close()
    if not patient: raise HTTPException(404, 'Not found')
    followup = consult['followup'] if consult else 'Follow up with your doctor'
    try:
        message = build_discharge_message(patient['name'], followup, patient['language'])
    except Exception:
        message = f"{patient['name']}, your visit is complete. {followup}"

    # Generate audio
    audio_b64 = None
    try:
        audio = text_to_speech(message, patient['language'])
        audio_b64 = base64.b64encode(audio).decode('utf-8')
    except Exception:
        pass

    return {'message': message, 'language': patient['language'],
            'patient_name': patient['name'], 'audio_b64': audio_b64}


# ── PDF DOWNLOAD ──────────────────────────────────────────────────
@app.get('/patient/{patient_id}/pdf')
def download_clinical_pdf(patient_id: str):
    """Generates and returns the clinical record as a PDF."""
    conn = get_db()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
    if not patient: 
        conn.close()
        raise HTTPException(404, 'Patient not found')
        
    consult = conn.execute('SELECT * FROM consultations WHERE patient_id=? ORDER BY created_at DESC LIMIT 1', (patient_id,)).fetchone()
    conn.close()
    
    if not consult:
        raise HTTPException(404, 'No consultation record found for this patient')

    # Prepare data for PDF
    clinical_record = {
        'diagnosis': consult['diagnosis'],
        'symptoms': json.loads(consult['symptoms']),
        'prescriptions': json.loads(consult['prescriptions']),
        'lab_tests': json.loads(consult['lab_tests']),
        'severity': consult['severity'],
        'followup': consult['followup'],
        'clinical_notes': consult['clinical_notes']
    }
    
    pdf_bytes = generate_clinical_pdf(dict(patient), clinical_record)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=ClinicalRecord_{patient_id}.pdf'}
    )


# ── ANALYTICS ─────────────────────────────────────────────────────
@app.get('/analytics/summary')
def analytics_summary():
    """Dashboard stats — total patients, severity breakdown, dept completion rates."""
    conn = get_db()
    today = datetime.date.today().isoformat()

    total          = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
    today_count    = conn.execute("SELECT COUNT(*) FROM patients WHERE created_at LIKE ?", (f'{today}%',)).fetchone()[0]
    checked_in     = conn.execute('SELECT COUNT(*) FROM patients WHERE checked_in=1').fetchone()[0]

    sev_rows       = conn.execute("SELECT severity, COUNT(*) as cnt FROM consultations GROUP BY severity").fetchall()
    severity_breakdown = {r['severity']: r['cnt'] for r in sev_rows}

    lang_rows      = conn.execute("SELECT language, COUNT(*) as cnt FROM patients GROUP BY language").fetchall()
    language_breakdown = {r['language']: r['cnt'] for r in lang_rows}

    lab_done       = conn.execute("SELECT COUNT(*) FROM lab_orders WHERE status='completed'").fetchone()[0]
    lab_pending    = conn.execute("SELECT COUNT(*) FROM lab_orders WHERE status='pending'").fetchone()[0]
    rx_done        = conn.execute("SELECT COUNT(*) FROM prescriptions WHERE status='dispensed'").fetchone()[0]
    rx_pending     = conn.execute("SELECT COUNT(*) FROM prescriptions WHERE status='pending'").fetchone()[0]
    emergencies    = conn.execute("SELECT COUNT(*) FROM emergency_alerts").fetchone()[0]
    consultations  = conn.execute("SELECT COUNT(*) FROM consultations").fetchone()[0]

    # Last 10 patients
    recent = conn.execute(
        "SELECT patient_id,name,token_number,room_number,language,created_at FROM patients ORDER BY created_at DESC LIMIT 10"
    ).fetchall()

    conn.close()
    return {
        'total_patients':      total,
        'today_patients':      today_count,
        'checked_in':          checked_in,
        'total_consultations': consultations,
        'emergency_alerts':    emergencies,
        'severity_breakdown':  severity_breakdown,
        'language_breakdown':  language_breakdown,
        'lab':   {'completed': lab_done,  'pending': lab_pending},
        'pharmacy': {'dispensed': rx_done, 'pending': rx_pending},
        'recent_patients': [dict(r) for r in recent],
    }


# ── ALL PATIENTS ──────────────────────────────────────────────────
@app.get('/patients/all')
def get_all_patients():
    conn = get_db()
    rows = conn.execute('SELECT * FROM patients ORDER BY created_at DESC').fetchall()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == '__main__':
    import uvicorn
    print('🏥 VaidikaAI API v3 starting...')
    print('📖 Docs: http://localhost:8000/docs')
    uvicorn.run('api.main:app', host='0.0.0.0', port=8000, reload=True)
