from api.pdf_utils import generate_clinical_pdf
import os

patient = {
    'patient_id': 'VK-TEST-PDF',
    'name': 'John Doe',
    'age': 35,
    'gender': 'Male',
    'language': 'English'
}

clinical = {
    'diagnosis': 'Acute Gastritis',
    'symptoms': ['Abdominal pain', 'Nausea', 'Vomiting'],
    'prescriptions': ['Antacids 10ml TID', 'Pantoprazole 40mg OD'],
    'lab_tests': ['Abdominal Ultrasound', 'CBC'],
    'severity': 'medium',
    'followup': '1 week',
    'clinical_notes': 'Patient reported onset after spicy meal. No signs of dehydration.'
}

try:
    pdf_bytes = generate_clinical_pdf(patient, clinical)
    with open('test_record.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print("✅ PDF generated successfully: test_record.pdf")
    os.remove('test_record.pdf') # Clean up
except Exception as e:
    print(f"❌ PDF Generation failed: {e}")
