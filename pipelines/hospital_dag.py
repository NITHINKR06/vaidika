# pipelines/hospital_dag.py — Airflow DAG
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import sqlite3, json, uuid, os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'vaidika.db')

def notify_lab(**ctx):
    conf = ctx['dag_run'].conf or {}
    patient_id, lab_tests = conf.get('patient_id'), conf.get('lab_tests', [])
    conn = sqlite3.connect(DB_PATH)
    if not conn.execute('SELECT 1 FROM lab_orders WHERE patient_id=?', (patient_id,)).fetchone():
        now = datetime.now().isoformat()
        conn.execute('INSERT INTO lab_orders VALUES (?,?,?,?,?,?,?)',
            (str(uuid.uuid4()), patient_id, json.dumps(lab_tests), 'pending', '{}', now, now))
        conn.commit()
    conn.close()
    print(f'✅ Lab notified: {patient_id} → {lab_tests}')

def notify_pharmacy(**ctx):
    conf = ctx['dag_run'].conf or {}
    patient_id, prescriptions = conf.get('patient_id'), conf.get('prescriptions', [])
    conn = sqlite3.connect(DB_PATH)
    if not conn.execute('SELECT 1 FROM prescriptions WHERE patient_id=?', (patient_id,)).fetchone():
        now = datetime.now().isoformat()
        conn.execute('INSERT INTO prescriptions VALUES (?,?,?,?,?,?)',
            (str(uuid.uuid4()), patient_id, json.dumps(prescriptions), 'pending', now, now))
        conn.commit()
    conn.close()
    print(f'✅ Pharmacy notified: {patient_id} → {prescriptions}')

def alert_emergency(**ctx):
    conf = ctx['dag_run'].conf or {}
    patient_id, severity = conf.get('patient_id'), conf.get('severity', 'low')
    if severity in ('emergency', 'high'):
        print(f'🚨 EMERGENCY: {patient_id} — {severity.upper()} — immediate attention required')

def notify_patient(**ctx):
    conf = ctx['dag_run'].conf or {}
    print(f'📱 Patient {conf.get("patient_id")} notified — workflow complete')

with DAG(
    dag_id='hospital_workflow',
    start_date=datetime(2025, 1, 1),
    schedule_interval=None,
    catchup=False,
    default_args={'owner': 'vaidika', 'retries': 2, 'retry_delay': timedelta(minutes=1)},
    tags=['hospital'],
) as dag:
    lab_task       = PythonOperator(task_id='notify_lab',       python_callable=notify_lab)
    pharmacy_task  = PythonOperator(task_id='notify_pharmacy',  python_callable=notify_pharmacy)
    emergency_task = PythonOperator(task_id='alert_emergency',  python_callable=alert_emergency)
    notify_task    = PythonOperator(task_id='notify_patient',   python_callable=notify_patient)
    [lab_task, pharmacy_task, emergency_task] >> notify_task
