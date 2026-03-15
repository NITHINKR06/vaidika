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
    TranslateRequest, TTSRequest, LoginRequest, HospitalApply, ApplicationDecision
)
from fastapi.security import APIKeyHeader
from fastapi import Depends
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
    allow_origins=['*'],  # Allow all origins for production/cross-domain
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# ── AUTH UTIL ───────────────────────────────────────────────────
api_key_header = APIKeyHeader(name='X-API-Key', auto_error=False)

def get_auth(api_key: str = Depends(api_key_header)):
    if not api_key: return None
    conn = get_db()
    auth = conn.execute('SELECT * FROM api_keys WHERE key=?', (api_key,)).fetchone()
    conn.close()
    return dict(auth) if auth else None

def require_auth(roles: list = None):
    def dependency(auth = Depends(get_auth)):
        if not auth: raise HTTPException(401, 'Valid API Key required')
        if roles and auth['role'] not in roles:
            raise HTTPException(403, f'Forbidden: requires {roles}')
        return auth
    return dependency

@app.on_event('startup')
def on_startup():
    init_db()
    # Seed System Admin from .env
    user = os.getenv('SYSTEM_ADMIN_USERNAME', 'sysadmin')
    pw   = os.getenv('SYSTEM_ADMIN_PASSWORD', 'VaidikaAdmin@2025')
    print(f'✅ DB ready. System Admin: {user}')
    print('✅ LLM:', 'ready (Gemini/Ollama)' if check_llm_ready() else 'NOT READY — check GOOGLE_API_KEY or start Ollama')


# ── AUTH ENDPOINTS ───────────────────────────────────────────────

@app.post('/system/login')
def system_login(req: LoginRequest):
    admin_user = os.getenv('SYSTEM_ADMIN_USERNAME', 'sysadmin')
    admin_pass = os.getenv('SYSTEM_ADMIN_PASSWORD', 'VaidikaAdmin@2025')
    
    if req.username == admin_user and req.password == admin_pass:
        key = f'sk_sys_{uuid.uuid4().hex[:8]}'
        conn = get_db()
        conn.execute('INSERT INTO api_keys VALUES (?,?,?,?,?)',
            (key, 'system', 'system_admin', datetime.datetime.now().isoformat(), None))
        conn.commit(); conn.close()
        return {'api_key': key, 'role': 'system_admin'}
    raise HTTPException(401, 'Invalid system credentials')

@app.post('/hospital/apply')
def hospital_apply(req: HospitalApply):
    app_id = f'APP-{uuid.uuid4().hex[:8].upper()}'
    conn = get_db()
    conn.execute('INSERT INTO applications VALUES (?,?,?,?,?)',
        (app_id, req.json(), 'pending', '', datetime.datetime.now().isoformat()))
    conn.commit(); conn.close()
    return {'hospital_id': app_id, 'status': 'pending'}

@app.post('/hospital/login')
def hospital_login(req: LoginRequest):
    conn = get_db()
    h = conn.execute('SELECT * FROM hospitals WHERE email=? AND password=?', (req.email, req.password)).fetchone()
    if not h:
        conn.close()
        raise HTTPException(401, 'Invalid hospital credentials')
    key = f'sk_hosp_{uuid.uuid4().hex[:8]}'
    conn.execute('INSERT INTO api_keys VALUES (?,?,?,?,?)',
        (key, h['hospital_id'], 'hospital_admin', datetime.datetime.now().isoformat(), None))
    conn.commit(); conn.close()
    return {'api_key': key, 'role': 'hospital_admin', 'hospital_id': h['hospital_id'], 'hospital_name': h['name']}

@app.post('/staff/login')
def staff_login(req: LoginRequest):
    conn = get_db()
    s = conn.execute('SELECT * FROM staff WHERE username=? AND password=? AND UPPER(hospital_id)=UPPER(?)',
        (req.username, req.password, req.hospital_id)).fetchone()
    if not s:
        # Debug: check if user exists at all to provide better error info in logs
        exist = conn.execute('SELECT 1 FROM staff WHERE username=? AND UPPER(hospital_id)=UPPER(?)', (req.username, req.hospital_id)).fetchone()
        conn.close()
        if exist:
            print(f"DEBUG: Staff login failed for {req.username} at {req.hospital_id} - Password mismatch")
        else:
            print(f"DEBUG: Staff login failed for {req.username} at {req.hospital_id} - Staff not found")
        raise HTTPException(401, 'Invalid staff credentials')
    key = f'sk_staff_{uuid.uuid4().hex[:8]}'
    conn.execute('INSERT INTO api_keys VALUES (?,?,?,?,?)',
        (key, s['staff_id'], s['role'], datetime.datetime.now().isoformat(), None))
    conn.commit(); conn.close()
    return {'api_key': key, 'role': s['role'], 'hospital_id': req.hospital_id, 'name': s['name']}

@app.post('/logout')
def logout(auth = Depends(require_auth())):
    conn = get_db()
    conn.execute('DELETE FROM api_keys WHERE owner_id=?', (auth['owner_id'],))
    conn.commit(); conn.close()
    return {'status': 'logged_out'}


# ── SYSTEM ADMIN ──────────────────────────────────────────────────
@app.get('/system/applications')
def get_apps(status: str = 'pending', auth = Depends(require_auth(['system_admin']))):
    conn = get_db()
    rows = conn.execute('SELECT * FROM applications WHERE status=?', (status,)).fetchall()
    conn.close()
    res = []
    for r in rows:
        d = dict(r)
        app_data = json.loads(d.pop('data'))
        # Flatten application data into the top level
        # Rename app_id to hospital_id and created_at to applied_at for frontend compatibility
        flat = {
            **app_data,
            'hospital_id': d['app_id'],
            'status': d['status'],
            'comments': d['comments'],
            'applied_at': d['created_at']
        }
        res.append(flat)
    return res

@app.post('/system/applications/{app_id}')
def decide_app(app_id: str, req: ApplicationDecision, auth = Depends(require_auth(['system_admin']))):
    conn = get_db()
    row = conn.execute('SELECT * FROM applications WHERE app_id=?', (app_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404, 'Application not found')
    
    conn.execute('UPDATE applications SET status=?, comments=? WHERE app_id=?', (req.status, req.comments, app_id))
    
    if req.status == 'approved':
        # Create hospital
        data = json.loads(row['data'])
        h_id = f'HOSP-{uuid.uuid4().hex[:6].upper()}'
        conn.execute('INSERT INTO hospitals VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            (h_id, data['name'], data['license_number'], data['phone'], data['email'],
             data['pincode'], data['address'], data['city'], data['state'],
             data['admin_email'], data['password'], datetime.datetime.now().isoformat()))
    
    conn.commit(); conn.close()
    return {'status': req.status}

@app.get('/system/hospitals')
def get_hospitals(auth = Depends(require_auth(['system_admin']))):
    conn = get_db()
    rows = conn.execute('SELECT * FROM hospitals').fetchall()
    res = []
    for r in rows:
        h = dict(r)
        h['status'] = 'approved' # Since they are in hospitals table
        # Get staff count for this hospital
        sc = conn.execute('SELECT COUNT(*) FROM staff WHERE hospital_id=?', (h['hospital_id'],)).fetchone()[0]
        h['staff_count'] = sc
        # Patient count (now correctly linked)
        pc = conn.execute('SELECT COUNT(*) FROM patients WHERE hospital_id=?', (h['hospital_id'],)).fetchone()[0]
        h['patient_count'] = pc 
        res.append(h)
    conn.close()
    return res


# ── HOSPITAL ADMIN ────────────────────────────────────────────────
@app.post('/hospital/staff/add')
def add_staff(staff: dict, auth = Depends(require_auth(['hospital_admin']))):
    staff_id = f'STAFF-{uuid.uuid4().hex[:6].upper()}'
    conn = get_db()
    conn.execute('INSERT INTO staff VALUES (?,?,?,?,?,?,?)',
        (staff_id, auth['owner_id'], staff['name'], staff['username'], staff['password'], staff['role'], datetime.datetime.now().isoformat()))
    conn.commit(); conn.close()
    return {'staff_id': staff_id}

@app.get('/hospital/staff')
def list_staff(auth = Depends(require_auth(['hospital_admin']))):
    conn = get_db()
    rows = conn.execute('SELECT * FROM staff WHERE hospital_id=?', (auth['owner_id'],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post('/hospital/staff/{staff_id}/deactivate')
def deactivate_staff(staff_id: str, auth = Depends(require_auth(['hospital_admin']))):
    conn = get_db()
    conn.execute('DELETE FROM staff WHERE staff_id=? AND hospital_id=?', (staff_id, auth['owner_id']))
    conn.commit(); conn.close()
    return {'status': 'deactivated'}


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
               name=?, age=?, gender=?, language=?, hospital_id=?, aadhaar_last4=?, 
               token_number=?, room_number=?, qr_code=?, checked_in=0, created_at=? 
               WHERE patient_id=?''',
            (req.name, req.age, req.gender, req.language, req.hospital_id, req.aadhaar_last4,
             token_number, room_number, qr_code, datetime.datetime.now().isoformat(), patient_id)
        )
    else:
        # New patient registration
        patient_id = f'VK-2025-{str(uuid.uuid4())[:5].upper()}'
        qr_code = generate_patient_qr(patient_id, req.name, token_number, room_number)
        conn.execute(
            'INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            (patient_id, req.name, req.age, req.gender, req.language,
             req.aadhaar_last4, token_number, room_number, qr_code, 0,
             req.hospital_id, datetime.datetime.now().isoformat())
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
def save_consultation(req: ConsultationRequest, auth = Depends(require_auth(['doctor', 'hospital_admin']))):
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
        'INSERT INTO consultations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        (consultation_id, req.patient_id, req.transcript,
         json.dumps(record.symptoms), record.diagnosis,
         json.dumps(record.prescriptions), json.dumps(record.lab_tests),
         record.severity, json.dumps(record.route_to),
         record.followup, record.clinical_notes, now, auth['hospital_id'])
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


# ── PENDING QUEUES ────────────────────────────────────────────────
@app.get('/pharmacy/pending')
def get_pharmacy_pending(auth = Depends(require_auth(['pharmacist', 'hospital_admin', 'receptionist']))):
    conn = get_db()
    rows = conn.execute('''
        SELECT p.patient_id, p.name, p.token_number, rx.rx_id, rx.created_at
        FROM prescriptions rx
        JOIN patients p ON rx.patient_id = p.patient_id
        WHERE rx.status = 'pending' AND p.hospital_id = ?
        ORDER BY rx.created_at ASC
    ''', (auth['owner_id'] if auth['role'] == 'hospital_admin' else auth['hospital_id'],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get('/lab/pending')
def get_lab_pending(auth = Depends(require_auth(['lab_tech', 'hospital_admin', 'receptionist']))):
    conn = get_db()
    rows = conn.execute('''
        SELECT p.patient_id, p.name, p.token_number, lo.order_id, lo.created_at
        FROM lab_orders lo
        JOIN patients p ON lo.patient_id = p.patient_id
        WHERE lo.status = 'pending' AND p.hospital_id = ?
        ORDER BY lo.created_at ASC
    ''', (auth['owner_id'] if auth['role'] == 'hospital_admin' else auth['hospital_id'],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── FULL RECORD ───────────────────────────────────────────────────
@app.get('/record/{patient_id}')
def get_full_record(patient_id: str):
    conn = get_db()
    # Support case-insensitive patient_id search
    row = conn.execute('SELECT * FROM patients WHERE UPPER(patient_id)=UPPER(?)', (patient_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, 'Patient not found')
    
    patient = dict(row)
    p_id = patient['patient_id']

    # Get FULL history
    consults = conn.execute('''
        SELECT c.*, h.name as hospital_name 
        FROM consultations c 
        LEFT JOIN hospitals h ON c.hospital_id = h.hospital_id
        WHERE c.patient_id=? 
        ORDER BY c.created_at DESC
    ''', (p_id,)).fetchall()
    
    labs = conn.execute('SELECT * FROM lab_orders WHERE patient_id=? ORDER BY created_at DESC', (p_id,)).fetchall()
    prescriptions = conn.execute('SELECT * FROM prescriptions WHERE patient_id=? ORDER BY created_at DESC', (p_id,)).fetchall()
    updates = conn.execute('SELECT * FROM dept_updates WHERE patient_id=? ORDER BY updated_at DESC', (p_id,)).fetchall()
    
    conn.close()
    
    return {
        'patient': patient,
        'history': [
            {
                'consultation_id': c['consultation_id'],
                'hospital_name': c['hospital_name'] or 'Unknown Hospital',
                'diagnosis': c['diagnosis'],
                'severity': c['severity'],
                'created_at': c['created_at'],
                'symptoms': json.loads(c['symptoms']),
                'prescriptions': json.loads(c['prescriptions']),
                'lab_tests': json.loads(c['lab_tests']),
                'followup': c['followup'],
                'clinical_notes': c['clinical_notes']
            } for c in consults
        ],
        'lab_history': [dict(l) for l in labs],
        'prescription_history': [dict(pr) for pr in prescriptions],
        # Latest record format for backward compatibility
        'consultation': {
            'symptoms':      json.loads(consults[0]['symptoms']) if consults else [],
            'diagnosis':     consults[0]['diagnosis'] if consults else '',
            'prescriptions': json.loads(consults[0]['prescriptions']) if consults else [],
            'lab_tests':     json.loads(consults[0]['lab_tests']) if consults else [],
            'severity':      consults[0]['severity'] if consults else '',
            'route_to':      json.loads(consults[0]['route_to']) if consults else [],
            'followup':      consults[0]['followup'] if consults else '',
            'clinical_notes':consults[0]['clinical_notes'] if consults else '',
            'created_at':    consults[0]['created_at'] if consults else None,
        } if consults else {},
        'lab_status': {
            'status': labs[0]['status'] if labs else 'not_ordered',
            'tests':  json.loads(labs[0]['tests']) if labs else [],
            'results':json.loads(labs[0]['results']) if labs else {},
        },
        'pharmacy_status': {
            'status':   prescriptions[0]['status'] if prescriptions else 'not_prescribed',
            'medicines':json.loads(prescriptions[0]['medicines']) if prescriptions else [],
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
