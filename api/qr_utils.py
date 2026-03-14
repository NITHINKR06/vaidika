# api/qr_utils.py
# Generate QR codes for patient token slips

import qrcode
import io
import base64
import json


def generate_patient_qr(patient_id: str, name: str, token_number: int, room_number: int) -> str:
    """
    Generate a QR code containing patient info.
    Returns base64-encoded PNG string suitable for embedding in HTML.

    QR payload is JSON: { patient_id, name, token, room }
    """
    payload = json.dumps({
        'patient_id': patient_id,
        'name': name,
        'token': token_number,
        'room': room_number,
    })

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color='black', back_color='white')

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)

    b64 = base64.b64encode(buf.read()).decode('utf-8')
    return f'data:image/png;base64,{b64}'


def decode_qr_payload(payload_str: str) -> dict:
    """
    Decode JSON payload scanned from QR code.
    Returns dict with patient_id, name, token, room.
    """
    try:
        return json.loads(payload_str)
    except json.JSONDecodeError:
        # Fallback: treat as raw patient_id string
        return {'patient_id': payload_str}
