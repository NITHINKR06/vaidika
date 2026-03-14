# api/alerts.py
# Emergency alert system — sends SMS via Twilio for high/emergency cases

import os
from dotenv import load_dotenv

load_dotenv()

TWILIO_SID    = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_TOKEN  = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM   = os.getenv('TWILIO_FROM_NUMBER', '')
ALERT_TO      = os.getenv('EMERGENCY_ALERT_NUMBER', '')


def send_emergency_sms(patient_name: str, patient_id: str, severity: str,
                        diagnosis: str, room_number: int) -> dict:
    """
    Send SMS alert for high/emergency severity patients.
    Requires Twilio credentials in .env.
    Returns dict with status and message_sid.
    """
    if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, ALERT_TO]):
        print('⚠️  Twilio not configured — SMS alert skipped')
        return {'status': 'skipped', 'reason': 'Twilio credentials not set'}

    try:
        from twilio.rest import Client
        client = Client(TWILIO_SID, TWILIO_TOKEN)

        body = (
            f"🚨 VaidikaAI ALERT\n"
            f"Patient: {patient_name} ({patient_id})\n"
            f"Severity: {severity.upper()}\n"
            f"Diagnosis: {diagnosis}\n"
            f"Room: {room_number}\n"
            f"Immediate attention required."
        )

        message = client.messages.create(
            body=body,
            from_=TWILIO_FROM,
            to=ALERT_TO,
        )

        print(f'✅ Emergency SMS sent: {message.sid}')
        return {'status': 'sent', 'message_sid': message.sid}

    except ImportError:
        return {'status': 'skipped', 'reason': 'twilio package not installed'}
    except Exception as e:
        print(f'❌ SMS failed: {e}')
        return {'status': 'failed', 'reason': str(e)}


def should_alert(severity: str) -> bool:
    """Returns True if this severity warrants an SMS alert."""
    return severity in ('emergency', 'high')
