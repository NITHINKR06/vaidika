import sqlite3, json, uuid, datetime

db_path = 'vaidika.db'

def fix_hospitals():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    # 1. Update applications with 'approve' to 'approved'
    conn.execute("UPDATE applications SET status='approved' WHERE status='approve'")
    
    # 2. Find all approved applications that don't have a hospital entry
    apps = conn.execute("SELECT * FROM applications WHERE status='approved'").fetchall()
    
    for app in apps:
        app_id = app['app_id']
        data = json.loads(app['data'])
        email = data['email']
        
        # Check if hospital already exists
        exists = conn.execute("SELECT 1 FROM hospitals WHERE email=?", (email,)).fetchone()
        if not exists:
            print(f"Creating hospital for app {app_id} ({data['name']})...")
            h_id = f"HOSP-{uuid.uuid4().hex[:6].upper()}"
            conn.execute('INSERT INTO hospitals VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                (h_id, data['name'], data['license_number'], data['phone'], data['email'],
                 data['pincode'], data['address'], data['city'], data['state'],
                 data['admin_email'], data['password'], datetime.datetime.now().isoformat()))
        else:
            print(f"Hospital for {email} already exists.")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    fix_hospitals()
