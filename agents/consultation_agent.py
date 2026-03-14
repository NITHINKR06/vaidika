# agents/consultation_agent.py
import ollama
import json
import os
import google.generativeai as genai
import anthropic
from dotenv import load_dotenv
from agents.schema import ClinicalRecord

load_dotenv()

SYSTEM_PROMPT = """You are a highly accurate clinical AI assistant in an Indian hospital.
Read doctor-patient consultation transcripts and extract structured medical data.
Return ONLY valid JSON — no explanation, no markdown fences, no extra text.
Severity:
  emergency → chest pain+arm/jaw pain, breathing difficulty, stroke, unconscious
  high      → high fever >102F, severe pain, abnormal vitals
  medium    → moderate symptoms, needs monitoring
  low       → mild symptoms, routine"""


def generate_clinical_record(transcript: str, patient_id: str) -> ClinicalRecord:
    prompt = f"""Extract all medical data from this consultation transcript.

Return ONLY this JSON:
{{
  "patient_id": "{patient_id}",
  "symptoms": ["symptom 1", "symptom 2"],
  "diagnosis": "primary diagnosis",
  "prescriptions": ["Medicine dose frequency"],
  "lab_tests": ["Test 1"],
  "severity": "low|medium|high|emergency",
  "route_to": ["lab","pharmacy"],
  "followup": "follow up instruction",
  "clinical_notes": "additional observations"
}}

TRANSCRIPT:
{transcript}

JSON only:"""

    raw = ""
    # 1. Try Gemini (Cloud - Primary)
    if os.getenv('GOOGLE_API_KEY') and 'AIza' in os.getenv('GOOGLE_API_KEY'):
        try:
            print("🚀 Using Gemini backend...")
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content(f"{SYSTEM_PROMPT}\n\n{prompt}")
            raw = response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini Error: {e}")

    # 2. Try Ollama (Local Fallback)
    if not raw and check_ollama_running():
        try:
            print("🚀 Falling back to Ollama...")
            response = ollama.chat(
                model='llama3.2:3b',
                messages=[
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': prompt},
                ],
                options={'temperature': 0},
            )
            raw = response['message']['content'].strip()
        except Exception as e:
            print(f"⚠️ Ollama Error: {e}")

    # 3. Try Claude (Cloud Fallback)
    if not raw and os.getenv('ANTHROPIC_API_KEY'):
        try:
            print("🚀 Using Claude backend...")
            client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = message.content[0].text.strip()
        except Exception as e:
            print(f"⚠️ Claude Error: {e}")

    if not raw:
        raise Exception("No LLM provider available (Ollama failed and no API keys provided)")

    raw = raw.replace('```json', '').replace('```', '').strip()
    data = json.loads(raw)
    if not data.get('route_to'):
        route = []
        if data.get('lab_tests'): route.append('lab')
        if data.get('prescriptions'): route.append('pharmacy')
        data['route_to'] = route
    return ClinicalRecord(**data)


def check_ollama_running() -> bool:
    """Returns True if Ollama is running and has required models."""
    try:
        models = ollama.list()
        names = [m['name'] for m in models.get('models', [])]
        return any('llama3.2' in n or 'qwen2.5' in n for n in names)
    except Exception:
        return False


def check_llm_ready() -> bool:
    """Returns True if Gemini is configured or Ollama is running."""
    # Check Gemini
    key = os.getenv('GOOGLE_API_KEY')
    if key and 'AIza' in key:
        return True
    return check_ollama_running()


if __name__ == '__main__':
    test = "Patient has chest pain for 2 days and left arm pain. Doctor orders ECG, CBC, Troponin. Prescribes Aspirin 325mg and Atorvastatin 40mg. Follow up 3 days."
    try:
        r = generate_clinical_record(test, 'VK-TEST-001')
        print(r.model_dump_json(indent=2))
    except Exception as e:
        print(f"❌ Error: {e}")
