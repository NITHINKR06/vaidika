# VaidikaAI v3 🏥
**AI-powered multilingual hospital workflow — Protothon Hackathon 2025**

> Speak any language. Receive world-class care.

---

## What's New in v3
- 🎤 **Real-time bilingual voice** — patient speaks Hindi, doctor hears English live. Doctor speaks English, patient hears it in Hindi instantly.
- 📱 **QR code on every token slip** — scan at doctor, lab, pharmacy to load patient in one second
- 🖨️ **Print-ready token slip** — generates from browser, no extra software
- 🚨 **Emergency SMS alerts** — Twilio sends SMS to duty team for high/emergency cases
- 📊 **Analytics dashboard** — live stats, severity breakdown, language chart, dept completion rates
- ✅ **Patient check-in kiosk** — patient scans own QR, hears welcome message in their language

---

## Architecture

```
Patient speaks Hindi
        ↓
Browser mic → /voice/patient-speech → Sarvam STT → Hindi text
        ↓
Sarvam translate → English text shown to doctor
        ↓
Doctor speaks English
        ↓
Browser mic → /voice/doctor-speech → Sarvam STT → English text
        ↓
Sarvam translate → Hindi text + Sarvam TTS → audio played to patient
        ↓
Doctor clicks CONFIRM
        ↓
Full transcript → Qwen2.5:7b (Ollama, local) → ClinicalRecord JSON
        ↓
┌─────────────┬──────────────┬────────────────┐
│  SQLite DB  │  Delta Lake  │  Airflow DAG   │
│  (main)     │  (analytics) │  lab+pharmacy  │
└─────────────┴──────────────┴────────────────┘
        ↓                           ↓
  Next.js portals          Twilio SMS (if emergency)
```

---

## Project Structure

```
vaidika-v3/
├── agents/
│   ├── schema.py                   # All Pydantic models
│   └── consultation_agent.py       # Qwen2.5:7b via Ollama
├── voice/
│   └── sarvam.py                   # STT + translate + TTS + bilingual pipeline
├── api/
│   ├── database.py                 # SQLite init (all tables)
│   ├── qr_utils.py                 # QR code generation (base64 PNG)
│   ├── alerts.py                   # Twilio SMS emergency alerts
│   └── main.py                     # FastAPI — 12 endpoints
├── pipelines/
│   └── hospital_dag.py             # Airflow DAG (parallel lab+pharmacy+alert)
├── data/
│   └── spark_manager.py            # PySpark + Delta Lake
├── docker/
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── vaidika-ui/
│   ├── app/
│   │   ├── page.js                 # Home hub (API/Ollama/DB status)
│   │   ├── reception/page.js       # Register + QR slip + print
│   │   ├── token-display/page.js   # Waiting room TV
│   │   ├── doctor/page.js          # Bilingual voice + AI record + discharge audio
│   │   ├── lab/page.js             # QR scan + enter results
│   │   ├── pharmacy/page.js        # QR scan + dispense
│   │   └── analytics/page.js       # Live dashboard
│   ├── components/
│   │   ├── QRScanner.js            # Camera QR scanner (html5-qrcode)
│   │   └── PatientLoader.js        # Reusable: text input + QR scan button
│   ├── lib/
│   │   ├── api.js                  # All API calls
│   │   └── useRecorder.js          # Browser mic recording hook
│   └── package.json
├── requirements.txt
└── .env.example
```

---

## Setup

### Step 1 — Environment variables
```bash
cp .env.example .env
```
Fill in `.env`:
| Key | Where to get it |
|-----|----------------|
| `SARVAM_API_KEY` | https://dashboard.sarvam.ai → Sign up → API Keys |
| `GOOGLE_API_KEY` | https://aistudio.google.com → Get API Key |
| `TWILIO_ACCOUNT_SID` | https://twilio.com → Console (leave blank to disable SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number |
| `EMERGENCY_ALERT_NUMBER` | Doctor/duty team phone number |

### Step 2 — Python dependencies
```bash
# Core API (Python 3.10 to 3.14 supported)
pip install -r requirements.txt

# Optional: Data Pipelines (Requires Python < 3.14)
# pip install -r requirements-pipelines.txt
```
> [!NOTE]
> The core API supports Python 3.14. However, `apache-airflow` and `pyspark` do not yet support Python 3.14. If you are on Python 3.14, the API will automatically skip these features.


### Step 3 — Ollama + Qwen2.5
```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull qwen2.5:7b

# Verify
ollama list   # should show qwen2.5:7b
```

### Step 4 — Test AI agent alone
```bash
python -m agents.consultation_agent
# Prints a filled ClinicalRecord JSON in ~3 seconds
```

### Step 5 — Start backend
```bash
python api/main.py
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Step 6 — Start frontend
```bash
cd vaidika-ui
npm install
npm run dev
# Frontend: http://localhost:3000
```

### Step 7 (Optional) — Airflow
```bash
export AIRFLOW_HOME=~/airflow
airflow db init
airflow users create --username admin --password admin \
  --firstname Admin --lastname User --role Admin --email admin@test.com
cp pipelines/hospital_dag.py ~/airflow/dags/
airflow standalone
# http://localhost:8080
```

### Step 8 (Optional) — Delta Lake
```bash
sudo apt install default-jdk   # Java required
python data/spark_manager.py
```

---

## Running Everything

| Terminal | Command | Opens at |
|----------|---------|----------|
| 1 | `ollama serve` | — |
| 2 | `python api/main.py` | http://localhost:8000/docs |
| 3 | `cd vaidika-ui && npm run dev` | http://localhost:3000 |
| 4 (optional) | `airflow standalone` | http://localhost:8080 |

---

## Complete Patient Journey

### 1. Reception → `/reception`
- Staff enters patient name, age, gender, preferred language
- System generates Patient ID (`VK-2025-XXXXX`), token number, room number
- **QR code generated automatically** — embedded in page
- Click **🖨️ Print Token Slip** → browser print dialog → patient carries this slip

### 2. Waiting Room → `/token-display`
- TV screen shows current tokens + room numbers
- Auto-refreshes every 8 seconds
- Shows "Checked In" badge when patient scans kiosk

### 3. Doctor → `/doctor`
- Staff scans patient QR code **or** types Patient ID
- Patient card loads instantly
- **Bilingual voice consultation:**
  - Click **"Record Patient (Hindi)"** → patient speaks → transcribed in Hindi → shown in English to doctor
  - Click **"Record Doctor (English)"** → doctor speaks → translated to Hindi → **played aloud to patient automatically**
  - Full bilingual conversation shown turn-by-turn
- Click **CONFIRM** → Qwen2.5 generates clinical record in ~3 seconds
- If emergency: **SMS alert sent to duty team via Twilio**
- Click **"Speak discharge message"** → system speaks to patient in their language

### 4. Lab → `/lab`
- Scan patient QR or type ID
- Ordered tests appear automatically (from doctor's record)
- Fill results → click **SUBMIT RESULTS TO DOCTOR**
- Doctor dashboard updates live

### 5. Pharmacy → `/pharmacy`
- Scan patient QR or type ID
- Prescribed medicines listed automatically
- Click **MARK ALL DISPENSED**

### 6. Analytics → `/analytics`
- Total patients, today's count, check-ins, consultations
- Emergency alerts sent counter
- Lab and pharmacy completion progress bars
- Severity breakdown chart
- Language distribution chart
- Recent patients list

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API + Ollama + DB status |
| POST | `/register` | Register patient → ID + token + QR code |
| GET | `/patient/{id}` | Get patient info |
| POST | `/checkin` | Patient kiosk check-in → welcome audio |
| POST | `/voice/patient-speech` | Audio → STT + translate to English |
| POST | `/voice/doctor-speech` | Audio → STT → translate to patient lang + audio |
| POST | `/consultation` | Transcript → AI record → Airflow + Delta Lake + SMS |
| GET | `/record/{id}` | Full record (patient + consult + lab + pharmacy) |
| POST | `/department/update` | Lab/pharmacy post results |
| GET | `/tokens/active` | Today's token list |
| POST | `/translate` | Translate any text (Sarvam) |
| POST | `/speak-b64` | Text → speech audio base64 |
| GET | `/discharge/{id}` | Discharge message + audio in patient's language |
| GET | `/analytics/summary` | Full dashboard stats |
| GET | `/patients/all` | All patients |

---

## Demo Script (Practice 3 times)

| # | URL | Action |
|---|-----|--------|
| 1 | `/reception` | Register Ravi Kumar, 52, Male, Hindi → print slip |
| 2 | `/token-display` | Show token on TV |
| 3 | `/doctor` | Scan QR from slip → patient loads |
| 4 | `/doctor` | Click "Record Patient" → speak "Seene mein dard hai" |
| 5 | `/doctor` | See Hindi transcribed + English translation shown |
| 6 | `/doctor` | Click "Record Doctor" → say "I'm prescribing Aspirin" |
| 7 | `/doctor` | Patient hears Hindi audio automatically |
| 8 | `/doctor` | Click CONFIRM → watch AI generate record in 3s |
| 9 | `/lab` | Scan QR → enter ECG/CBC results → submit |
| 10 | `/pharmacy` | Scan QR → mark dispensed |
| 11 | `/analytics` | Show live stats to judges |

**Judge Q&A:**

| Question | Answer |
|----------|--------|
| How does voice work? | Sarvam AI — STT in patient's language, translate both ways, TTS back to patient. All in under 2 seconds per turn. |
| What AI generates the record? | Qwen2.5:7b running locally via Ollama. No internet. No API cost. Temperature 0 for consistent medical output. |
| How are departments connected? | One patient ID. Doctor saves → Airflow triggers lab + pharmacy in parallel. All read from same SQLite + Delta Lake. |
| What happens in emergency? | Severity tagged as "emergency" by AI → Twilio SMS sent to duty team instantly. |
| What if internet fails? | Ollama runs offline. SQLite is local. Only Sarvam + Twilio need internet. Core system works without it. |
| How fast? | QR scan → patient loads: instant. Voice turn: ~1.5s. AI record: ~3s. |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Local AI | Qwen2.5:7b via Ollama (100% offline) |
| Voice + Translation | Sarvam AI — saarika:v2 (STT), mayura:v1 (translate), bulbul:v1 (TTS) |
| QR Generation | Python `qrcode` library |
| QR Scanning | `html5-qrcode` (browser camera) |
| Emergency Alerts | Twilio SMS API |
| Backend | FastAPI + SQLite |
| Frontend | Next.js 14 + Tailwind CSS |
| Pipeline | Apache Airflow 2.9 |
| Data Store | PySpark 3.5 + Delta Lake 3.1 |
| Container | Docker + Docker Compose |

---

*VaidikaAI v3 — Protothon Hackathon 2025*
