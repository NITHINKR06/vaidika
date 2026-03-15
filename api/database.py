# api/database.py
import sqlite3
import os

DB_PATH = os.getenv('DB_PATH', 'vaidika.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS patients (
            patient_id    TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            age           INTEGER,
            gender        TEXT,
            language      TEXT,
            aadhaar_last4 TEXT,
            token_number  INTEGER,
            room_number   INTEGER DEFAULT 1,
            qr_code       TEXT,
            checked_in    INTEGER DEFAULT 0,
            hospital_id   TEXT,
            created_at    TEXT
        );

        CREATE TABLE IF NOT EXISTS consultations (
            consultation_id TEXT PRIMARY KEY,
            patient_id      TEXT,
            transcript      TEXT,
            symptoms        TEXT,
            diagnosis       TEXT,
            prescriptions   TEXT,
            lab_tests       TEXT,
            severity        TEXT,
            route_to        TEXT,
            followup        TEXT,
            clinical_notes  TEXT,
            created_at      TEXT
        );

        CREATE TABLE IF NOT EXISTS dept_updates (
            update_id  TEXT PRIMARY KEY,
            patient_id TEXT,
            dept       TEXT,
            action     TEXT,
            data       TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS lab_orders (
            order_id   TEXT PRIMARY KEY,
            patient_id TEXT,
            tests      TEXT,
            status     TEXT DEFAULT 'pending',
            results    TEXT DEFAULT '{}',
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            rx_id      TEXT PRIMARY KEY,
            patient_id TEXT,
            medicines  TEXT,
            status     TEXT DEFAULT 'pending',
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS emergency_alerts (
            alert_id   TEXT PRIMARY KEY,
            patient_id TEXT,
            severity   TEXT,
            diagnosis  TEXT,
            sms_sent   INTEGER DEFAULT 0,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS hospitals (
            hospital_id   TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            license_number TEXT,
            phone         TEXT,
            email         TEXT UNIQUE,
            pincode       TEXT,
            address       TEXT,
            city          TEXT,
            state         TEXT,
            admin_email   TEXT,
            password      TEXT, -- Hashed in production, plain for hackathon
            created_at    TEXT
        );

        CREATE TABLE IF NOT EXISTS staff (
            staff_id    TEXT PRIMARY KEY,
            hospital_id TEXT,
            name        TEXT,
            username    TEXT UNIQUE,
            password    TEXT,
            role        TEXT, -- doctor | receptionist | lab_tech | pharmacist
            created_at  TEXT,
            FOREIGN KEY(hospital_id) REFERENCES hospitals(hospital_id)
        );

        CREATE TABLE IF NOT EXISTS applications (
            app_id      TEXT PRIMARY KEY,
            data        TEXT, -- JSON of HospitalApply
            status      TEXT DEFAULT 'pending', -- pending | approved | rejected
            comments    TEXT,
            created_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            key         TEXT PRIMARY KEY,
            owner_id    TEXT, -- system | hospital_id | staff_id
            role        TEXT, -- system_admin | hospital_admin | staff
            created_at  TEXT,
            expires_at  TEXT
        );
    ''')
    conn.commit()
    
    # Simple migration for existing DB
    try:
        conn.execute('ALTER TABLE patients ADD COLUMN hospital_id TEXT')
        conn.commit()
    except sqlite3.OperationalError:
        pass # already exists
        
    conn.close()
