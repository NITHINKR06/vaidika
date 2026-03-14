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
    name: str
    age: int
    gender: str
    language: str
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
