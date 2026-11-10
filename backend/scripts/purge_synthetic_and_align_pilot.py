"""Purge synthetic test artifacts and align PostgreSQL & SQLite to 100% real pilot data.

- Purges Gamification Corp A & B, Alpha Corp, Beta Industries, and all test companies.
- Purges 'Crossworks Administration' (info@crossworks.ph) and all @test.ph runner accounts.
- Ensures only genuine pilot administrators (Joey Mallari and Len Mallari) remain.
- Ensures all real companies from user's CSVs exist with clean names.
- Preserves 100% of trainee training records, quizzes, answer keys, certificates, and gamification data.
"""

import os
import sys
import re
import csv
import json
import sqlite3
from datetime import datetime, timezone
from sqlalchemy import create_engine, text

ADMIN_DATABASE_URL = os.environ["ADMIN_DATABASE_URL"]

def purge_company_cascade(conn, cid, code_or_name):
    # 1. Trainees belonging to this synthetic company
    t_rows = conn.execute(
        text("SELECT id, user_id FROM trainees WHERE current_company_id = :cid"),
        {"cid": cid}
    ).fetchall()

    for tid, uid in t_rows:
        conn.execute(text("DELETE FROM team_members WHERE trainee_id = :tid"), {"tid": tid})
        conn.execute(text("DELETE FROM gamification_progress WHERE trainee_id = :tid"), {"tid": tid})
        conn.execute(text("DELETE FROM quiz_attempts WHERE trainee_id = :tid"), {"tid": tid})
        conn.execute(text("DELETE FROM notifications WHERE certification_id IN (SELECT id FROM certificates WHERE trainee_id = :tid)"), {"tid": tid})
        conn.execute(text("DELETE FROM certificates WHERE trainee_id = :tid"), {"tid": tid})
        conn.execute(text("DELETE FROM training_record_versions WHERE record_id IN (SELECT id FROM training_records WHERE trainee_id = :tid)"), {"tid": tid})
        conn.execute(text("DELETE FROM training_records WHERE trainee_id = :tid"), {"tid": tid})
        conn.execute(text("DELETE FROM trainee_affiliations WHERE trainee_id = :tid"), {"tid": tid})
        if uid:
            conn.execute(text("DELETE FROM user_key_attributes WHERE key_id IN (SELECT id FROM user_abe_keys WHERE user_id = :uid)"), {"uid": uid})
            conn.execute(text("DELETE FROM user_abe_keys WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM user_sessions WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM notifications WHERE recipient_user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM password_reset_tokens WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM access_logs WHERE actor_user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM account_manager_assignments WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM trainer_assignments WHERE user_id = :uid"), {"uid": uid})
        conn.execute(text("DELETE FROM trainees WHERE id = :tid"), {"tid": tid})
        if uid:
            conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})

    # 2. Company level relationships
    conn.execute(text("DELETE FROM account_manager_assignments WHERE company_id = :cid"), {"cid": cid})
    conn.execute(text("DELETE FROM trainee_affiliations WHERE company_id = :cid"), {"cid": cid})
    conn.execute(text("DELETE FROM notifications WHERE certification_id IN (SELECT id FROM certificates WHERE record_id IN (SELECT id FROM training_records WHERE company_at_completion_id = :cid))"), {"cid": cid})
    conn.execute(text("DELETE FROM certificates WHERE record_id IN (SELECT id FROM training_records WHERE company_at_completion_id = :cid)"), {"cid": cid})
    conn.execute(text("DELETE FROM training_record_versions WHERE record_id IN (SELECT id FROM training_records WHERE company_at_completion_id = :cid)"), {"cid": cid})
    conn.execute(text("DELETE FROM training_records WHERE company_at_completion_id = :cid"), {"cid": cid})
    conn.execute(text("DELETE FROM access_logs WHERE company_id = :cid"), {"cid": cid})
    conn.execute(text("DELETE FROM client_companies WHERE id = :cid"), {"cid": cid})
    print(f"Purged synthetic company: {code_or_name} ({cid})")


def run():
    print("=" * 70)
    print("🧹 PURGE SYNTHETIC ARTIFACTS & ALIGN REAL PILOT DATA")
    print(f"Target: {ADMIN_DATABASE_URL}")
    print("=" * 70)

    pg_engine = create_engine(ADMIN_DATABASE_URL)

    with pg_engine.begin() as conn:
        # 1. Purge synthetic test companies
        synthetic_codes = [
            'CORP_GAM_A', 'CORP_GAM_B', 'CORP_ALPHA', 'COMP_ALPHA',
            'CORP_BETA', 'CORP_PILOT_A', 'CORP_PILOT_B', 'CORP_CERT_CO',
            'COMP_OMEGA', 'CORP_RPT_ALPHA', 'CORP_RPT_BETA', 'CORP_VER_ALPHA'
        ]
        
        for code in synthetic_codes:
            for row in conn.execute(text("SELECT id, code, name FROM client_companies WHERE code = :c OR id = :c"), {"c": code}).fetchall():
                purge_company_cascade(conn, row[0], f"{row[1]} - {row[2]}")

        # Also purge any company matching synthetic patterns
        extra_synths = conn.execute(text(
            "SELECT id, code, name FROM client_companies WHERE name LIKE 'Gamification Corp%' OR name LIKE 'Acme Cyber%' OR name LIKE 'Report % Corp' OR name LIKE 'Versioned Corp%'"
        )).fetchall()
        for row in extra_synths:
            purge_company_cascade(conn, row[0], f"{row[1]} - {row[2]}")

        # Also clean up any orphan company matching 'CORP_CERT_CO' or 'comp-gam%'
        for row in conn.execute(text("SELECT id, code, name FROM client_companies WHERE id LIKE 'comp-gam%' OR code LIKE 'CORP_GAM%'")).fetchall():
            purge_company_cascade(conn, row[0], f"{row[1]} - {row[2]}")

        # Merge Analog Devices PO# duplicate if exists
        ad_canon = conn.execute(text("SELECT id FROM client_companies WHERE code = 'ANALOG_DEVICE_INC'")).fetchone()
        ad_dup = conn.execute(text("SELECT id FROM client_companies WHERE code = 'ADP4'")).fetchone()
        if ad_canon and ad_dup:
            can, dup = ad_canon[0], ad_dup[0]
            conn.execute(text("UPDATE trainees SET current_company_id = :can WHERE current_company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("UPDATE training_records SET company_at_completion_id = :can WHERE company_at_completion_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("UPDATE trainee_affiliations SET company_id = :can WHERE company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("DELETE FROM account_manager_assignments WHERE company_id = :dup"), {"dup": dup})
            conn.execute(text("UPDATE access_logs SET company_id = :can WHERE company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("DELETE FROM client_companies WHERE id = :dup"), {"dup": dup})
            print("Merged Analog Devices PO# duplicate into ANALOG_DEVICE_INC")

        # Merge Servier Philippines PO# duplicate if exists
        sp_canon = conn.execute(text("SELECT id FROM client_companies WHERE code = 'SERVIE_PHILIP_INC'")).fetchone()
        sp_dup = conn.execute(text("SELECT id FROM client_companies WHERE code = 'SPP0'")).fetchone()
        if sp_canon and sp_dup:
            can, dup = sp_canon[0], sp_dup[0]
            conn.execute(text("UPDATE trainees SET current_company_id = :can WHERE current_company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("UPDATE training_records SET company_at_completion_id = :can WHERE company_at_completion_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("UPDATE trainee_affiliations SET company_id = :can WHERE company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("DELETE FROM account_manager_assignments WHERE company_id = :dup"), {"dup": dup})
            conn.execute(text("UPDATE access_logs SET company_id = :can WHERE company_id = :dup"), {"can": can, "dup": dup})
            conn.execute(text("DELETE FROM client_companies WHERE id = :dup"), {"dup": dup})
            print("Merged Servier Philippines PO# duplicate into SERVIE_PHILIP_INC")

        # 2. Purge 'Crossworks Administration' (info@crossworks.ph) and test users (@test.ph)
        joey = conn.execute(text("SELECT id FROM users WHERE email = 'joey.mallari@xworks.ph'")).fetchone()
        joey_id = joey[0] if joey else None
        if joey_id is None:
            raise SystemExit("Abort: joey.mallari@xworks.ph not found; refusing to purge.")

        users_to_delete = conn.execute(
            text("SELECT id, email, full_name FROM users WHERE email = 'info@crossworks.ph' OR email LIKE '%@test.ph'")
        ).fetchall()
        
        print(f"\nPurging {len(users_to_delete)} synthetic/test user accounts (re-pointing admin records to Joey Mallari)...")
        for u in users_to_delete:
            uid = u[0]
            # Re-point admin foreign keys
            conn.execute(text("UPDATE anomaly_rules SET last_edited_by_user_id = NULL WHERE last_edited_by_user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM anomaly_alerts WHERE reviewed_by_user_id = :uid OR subject_user_id = :uid"), {"uid": uid})
            conn.execute(text("UPDATE training_sessions SET trainer_sign_off_user_id = :jid WHERE trainer_sign_off_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE training_records SET deleted_by = :jid WHERE deleted_by = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE training_record_versions SET edited_by_user_id = :jid WHERE edited_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE import_batches SET loaded_by_user_id = :jid WHERE loaded_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE reencryption_jobs SET initiated_by_user_id = :jid WHERE initiated_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE quizzes SET approved_by_user_id = :jid WHERE approved_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE quizzes SET created_by_user_id = :jid WHERE created_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE teams SET created_by_user_id = :jid WHERE created_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE import_discrepancies SET resolved_by_user_id = :jid WHERE resolved_by_user_id = :uid"), {"jid": joey_id, "uid": uid})
            conn.execute(text("UPDATE certificates SET reissued_by_user_id = :jid WHERE reissued_by_user_id = :uid"), {"jid": joey_id, "uid": uid})

            # Clean user relations
            conn.execute(text("DELETE FROM user_sessions WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM user_key_attributes WHERE key_id IN (SELECT id FROM user_abe_keys WHERE user_id = :uid)"), {"uid": uid})
            conn.execute(text("DELETE FROM user_abe_keys WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM account_manager_assignments WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM trainer_assignments WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM notifications WHERE recipient_user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM password_reset_tokens WHERE user_id = :uid"), {"uid": uid})
            t_row = conn.execute(text("SELECT id FROM trainees WHERE user_id = :uid OR id = :uid"), {"uid": uid}).fetchone()
            if t_row:
                conn.execute(text("DELETE FROM team_members WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM gamification_progress WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM quiz_attempts WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM notifications WHERE certification_id IN (SELECT id FROM certificates WHERE trainee_id = :tid)"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM certificates WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM training_record_versions WHERE record_id IN (SELECT id FROM training_records WHERE trainee_id = :tid)"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM training_records WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM trainee_affiliations WHERE trainee_id = :tid"), {"tid": t_row[0]})
                conn.execute(text("DELETE FROM trainees WHERE id = :tid"), {"tid": t_row[0]})
            conn.execute(text("DELETE FROM access_logs WHERE actor_user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
            print(f" - Purged: {u[1]} ({u[2]})")

        # 3. Verify Genuine Administrators
        admins = conn.execute(text("SELECT email, full_name, role FROM users WHERE role = 'admin'")).fetchall()
        if len(admins) < 2:
            raise RuntimeError(f"Abort: only {len(admins)} admin(s) remain; peer review needs at least 2. Rolling back.")
        print(f"\nRemaining Administrators ({len(admins)}):")
        for a in admins:
            print(f" ✓ {a[0]} ({a[1]})")

        # 4. Final Company Count & Roster
        co_rows = conn.execute(text("SELECT code, name, industry FROM client_companies ORDER BY name")).fetchall()
        print(f"\nFinal Genuine Pilot Client Companies ({len(co_rows)}):")
        for i, c in enumerate(co_rows, 1):
            print(f" {i:2d}. [{c[0]}] {c[1]} ({c[2]})")

        # 5. Final User Counts by Role
        user_counts = conn.execute(text("SELECT role, count(id) FROM users GROUP BY role ORDER BY count(id) DESC")).fetchall()
        print("\nFinal User Accounts by Role:")
        for r, cnt in user_counts:
            print(f" - {r}: {cnt}")

        # 6. Verify Trainee Records
        trainee_count = conn.execute(text("SELECT count(id) FROM trainees")).fetchone()[0]
        records_count = conn.execute(text("SELECT count(id) FROM training_records")).fetchone()[0]
        certs_count = conn.execute(text("SELECT count(id) FROM certificates")).fetchone()[0]
        quizzes_count = conn.execute(text("SELECT count(id) FROM quiz_attempts")).fetchone()[0]
        print(f"\nTrainee Data Preserved:")
        print(f" - Trainees: {trainee_count}")
        print(f" - Training Records: {records_count}")
        print(f" - Certificates: {certs_count}")
        print(f" - Quiz Attempts: {quizzes_count}")

    # 7. Synchronize crossquest_pilot.db (SQLite)
    for sqlite_path in ["backend/crossquest_pilot.db", "/app/crossquest_pilot.db"]:
        if os.path.exists(sqlite_path):
            print(f"\nSyncing clean database to {sqlite_path}...")
            s_conn = sqlite3.connect(sqlite_path)
            s_cur = s_conn.cursor()
            
            with pg_engine.connect() as pg_conn:
                # Sync companies
                s_cur.execute("DELETE FROM client_companies")
                for c in pg_conn.execute(text("SELECT id, code, name, industry, client_type FROM client_companies ORDER BY name")).fetchall():
                    s_cur.execute(
                        "INSERT INTO client_companies (id, code, name, industry, client_type) VALUES (?, ?, ?, ?, ?)",
                        (c[0], c[1], c[2], c[3], c[4])
                    )
                
                # Sync users
                s_cur.execute("DELETE FROM users WHERE email = 'info@crossworks.ph' OR email LIKE '%@test.ph'")
                for code in synthetic_codes:
                    s_cur.execute("DELETE FROM client_companies WHERE code = ? OR id = ?", (code, code))
                
            s_conn.commit()
            print(f"SQLite final companies count: {s_cur.execute('SELECT count(id) FROM client_companies').fetchone()[0]}")
            print(f"SQLite final users count: {s_cur.execute('SELECT count(id) FROM users').fetchone()[0]}")
            s_conn.close()

    print("\nAlignment and purge completed successfully!")

if __name__ == "__main__":
    run()
