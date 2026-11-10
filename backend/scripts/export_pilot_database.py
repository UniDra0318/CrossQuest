"""Export utility for CrossQuest pilot database.

Exports:
1. Complete SQLite binary (.db)
2. Complete SQL schema and data dump (.sql)
3. Table-by-table structured JSON files (/json)
4. Table-by-table spreadsheet CSV files (/csv)
5. Comprehensive export manifest / summary report
"""
import os
import shutil
import sqlite3
import json
import csv
from datetime import datetime, timezone

def export_pilot_database():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    src_db = os.path.join(base_dir, 'crossquest_pilot.db')
    if not os.path.exists(src_db):
        src_db = '/exports/crossquest_pilot.db'
    if not os.path.exists(src_db):
        src_db = os.path.join(base_dir, 'backend', 'crossquest_pilot.db')
    if not os.path.exists(src_db):
        raise FileNotFoundError(f"Source database not found at {src_db}")
    
    export_dir = os.path.join(base_dir, 'exports')
    if not os.path.exists(export_dir):
        export_dir = '/exports'
    json_dir = os.path.join(export_dir, 'json')
    csv_dir = os.path.join(export_dir, 'csv')
    os.makedirs(export_dir, exist_ok=True)
    os.makedirs(json_dir, exist_ok=True)
    os.makedirs(csv_dir, exist_ok=True)
    
    # 1. Copy SQLite .db
    dest_db = os.path.join(export_dir, 'crossquest_pilot.db')
    if os.path.abspath(src_db) != os.path.abspath(dest_db):
        shutil.copy2(src_db, dest_db)
    db_size = os.path.getsize(dest_db)
    
    # 2. SQL Schema + Data Dump (.sql)
    con = sqlite3.connect(src_db)
    con.row_factory = sqlite3.Row
    sql_dump_path = os.path.join(export_dir, 'crossquest_pilot_dump.sql')
    with open(sql_dump_path, 'w', encoding='utf-8') as f:
        f.write(f"-- CrossQuest Pilot Database Dump\n")
        f.write(f"-- Exported: {datetime.now(timezone.utc).isoformat()}\n")
        f.write(f"-- Source: crossquest_pilot.db\n\n")
        for line in con.iterdump():
            f.write(line + '\n')
    sql_size = os.path.getsize(sql_dump_path)
    
    # 3. Export all tables to JSON and CSV
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cur.fetchall()]
    
    summary_rows = []
    total_records = 0
    for t in sorted(tables):
        cur.execute(f"SELECT * FROM {t}")
        rows = cur.fetchall()
        col_names = [desc[0] for desc in cur.description] if cur.description else []
        
        # JSON
        dict_rows = [dict(r) for r in rows]
        with open(os.path.join(json_dir, f"{t}.json"), 'w', encoding='utf-8') as f:
            json.dump(dict_rows, f, indent=2, default=str)
            
        # CSV
        with open(os.path.join(csv_dir, f"{t}.csv"), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if col_names:
                writer.writerow(col_names)
            for r in rows:
                writer.writerow(list(r))
                
        count = len(rows)
        total_records += count
        summary_rows.append((t, count))
        
    con.close()
    
    # 4. Export Summary Manifest
    summary_path = os.path.join(export_dir, 'EXPORT_SUMMARY.md')
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("# CrossQuest Pilot Database Export Package\n\n")
        f.write(f"**Export Timestamp (UTC):** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
        f.write(f"**Source Database:** `crossquest_pilot.db` ({db_size:,} bytes / ~{db_size / (1024*1024):.2f} MB)\n\n")
        f.write(f"**SQL Dump:** `crossquest_pilot_dump.sql` ({sql_size:,} bytes / ~{sql_size / 1024:.1f} KB)\n\n")
        f.write(f"**Total Tables:** {len(summary_rows)}\n\n")
        f.write(f"**Total Records:** {total_records:,}\n\n")
        f.write("## Formats Provided\n\n")
        f.write("1. **SQLite Database File (`crossquest_pilot.db`):** Ready-to-run binary database for CrossQuest or SQLite viewers (DB Browser for SQLite, DBeaver, VS Code SQLite Viewer).\n")
        f.write("2. **Standard SQL Dump (`crossquest_pilot_dump.sql`):** Complete DDL table schemas and INSERT statements for PostgreSQL / MySQL / SQLite imports.\n")
        f.write("3. **JSON Exports (`/json/*.json`):** Individual JSON files for every table, ideal for APIs, web seeding, or programmatic ingestion.\n")
        f.write("4. **CSV Exports (`/csv/*.csv`):** Excel-compatible CSV files for spreadsheets, audits, and business reviews.\n\n")
        f.write("## Table Breakdown\n\n")
        f.write("| Table Name | Record Count | Description / Role in CrossQuest |\n")
        f.write("|---|---|---|\n")
        
        descriptions = {
            "users": "System accounts across 5 roles (Admin, AM, Finance, Trainer, Trainee) with MFA & security states",
            "client_companies": "Registered enterprise client organizations",
            "courses": "Zero-trust cybersecurity & professional development courses",
            "trainees": "Enrolled employee trainees with streaks & gamification state",
            "training_sessions": "Live training cohorts & schedule deliveries",
            "training_records": "Trainee completion & attendance records with encrypted payloads",
            "training_record_versions": "Cryptographic audit trail with CP-ABE policy ciphertexts & version history",
            "anomaly_rules": "Crossworks-approved anomaly detection rules (R1-R4, S1)",
            "anomaly_alerts": "Security incident alerts with audit dispositions",
            "access_logs": "Immutable append-only access audit log ledger",
            "certificates": "Issued verifiable certificates with serial IDs",
            "certification_types": "Certification types and validity period policies",
            "quizzes": "Assessment quizzes with status & approval tracking",
            "quiz_questions": "Interactive quiz questions & assessment rubrics",
            "quiz_answer_keys": "Answer verification keys & scoring criteria",
            "quiz_attempts": "Trainee quiz submission attempts & recorded scores",
            "teams": "Session teams for collaborative cohort challenges",
            "user_sessions": "Active authenticated sessions & sliding idle timeouts",
            "abe_attributes": "CP-ABE attribute universe definitions",
            "user_abe_keys": "Issued user CP-ABE private cryptographic keys",
            "user_key_attributes": "Cryptographic attribute token mapping per user key",
            "import_batches": "Data import history & reconciliation batches",
            "import_staging_rows": "Pre-import staging records for verification",
            "import_discrepancies": "Audit discrepancy tracking & resolution logs",
            "reencryption_jobs": "Key rotation & policy re-encryption batch records",
            "trainee_affiliations": "Multi-tenant company affiliation mappings",
            "trainer_assignments": "Lead instructor course & session assignments",
            "account_manager_assignments": "Account manager portfolio scope assignments",
            "gamification_progress": "XP, badges, points, and milestone achievements",
            "notifications": "In-app notifications and alerts",
            "password_reset_tokens": "Secure single-use password reset tokens",
            "team_members": "Trainee-to-team assignments",
            "alert_events": "Supporting granular alert trigger events"
        }
        
        for t, count in summary_rows:
            desc = descriptions.get(t, "Database entity table")
            f.write(f"| `{t}` | {count:,} | {desc} |\n")

    print(f"Export completed successfully into: {export_dir}")
    print(f"  - Database: {dest_db} ({db_size:,} bytes)")
    print(f"  - SQL Dump: {sql_dump_path} ({sql_size:,} bytes)")
    print(f"  - JSON Files: {len(summary_rows)} tables in {json_dir}")
    print(f"  - CSV Files: {len(summary_rows)} tables in {csv_dir}")
    print(f"  - Summary: {summary_path}")

if __name__ == '__main__':
    export_pilot_database()

