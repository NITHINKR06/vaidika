# agents/schema.py
from pydantic import BaseModel
from typing import List, Optional


class ClinicalRecord(BaseModel):
    patient_id: str
    symptoms: List[str]
    diagnosis: str
    prescriptions: List[str]
    lab_tests: List[str]
    severity: str           # low | medium | high | emergency
    route_to: List[str]     # ['lab', 'pharmacy']
    followup: str
    clinical_notes: str


class PatientRegister(BaseModel):
    patient_id: Optional[str] = None
    name: str
    age: int
    gender: str
    language: str
    hospital_id: Optional[str] = None
    aadhaar_last4: Optional[str] = None


class ConsultationRequest(BaseModel):
    patient_id: str
    transcript: str
    patient_language: str


class DeptUpdateRequest(BaseModel):
    patient_id: str
    dept: str
    action: str
    data: Optional[dict] = {}


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class TTSRequest(BaseModel):
    text: str
    language: str = 'hi-IN'


class STTResponse(BaseModel):
    transcript: str
    language: str
    translated_to_english: Optional[str] = None


class EmergencyAlertRequest(BaseModel):
    patient_id: str
    patient_name: str
    severity: str
    diagnosis: str
    room_number: int


# ── AUTH & MANAGEMENT ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str
    hospital_id: Optional[str] = None

class HospitalApply(BaseModel):
    name: str
    license_number: str
    phone: str
    email: str
    pincode: str
    address: str
    city: str
    state: str
    admin_name: str
    admin_email: str
    password: str

class ApplicationDecision(BaseModel):
    status: str  # approved | rejected
    comments: Optional[str] = None
