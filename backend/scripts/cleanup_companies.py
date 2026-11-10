"""CrossQuest Client Companies Deduplication & Test Artifacts Purge.

1. Removes 42 test companies ('Acme Cyber Systems Inc.' and 'Maria Santos').
2. Merges duplicate companies (e.g. WCD_2 into WCD, XSDS_2 into XSDS, AOS_2/AOS_3 into AOS).
3. Safely re-points foreign keys in trainees, trainee_affiliations, training_records,
   account_manager_assignments, access_logs, reencryption_jobs, and user assigned_client_accounts.
4. Cleans invoice tags from canonical company display names.
5. Synchronizes SQLite pilot database (crossquest_pilot.db).
"""

import os
import sys
import re
import json
import sqlite3
from pathlib import Path
from sqlalchemy import create_engine, text

ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql+psycopg2://crossquest_admin:crossquest_secret_password@postgres:5432/crossquest_db"
)

def normalize_name(name: str) -> str:
    n = re.sub(r'\(SI\s*#?\s*\d+\)', '', name, flags=re.IGNORECASE)
    n = re.sub(r'\(.*?\)', '', n)
    n = re.sub(r'[^a-zA-Z0-9\s]', '', n)
    n = re.sub(r'\s+', ' ', n).strip().lower()
    return n

def clean_display_name(name: str) -> str:
    n = re.sub(r'\(SI\s*#?\s*\d+\)', '', name, flags=re.IGNORECASE)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def run_cleanup():
    print("=" * 70)
    print("🧹 CROSSQUEST COMPANY DEDUPLICATION & PURGE")
    print(f"Postgres Admin DB: {ADMIN_DATABASE_URL}")
    print("=" * 70)

    pg_engine = create_engine(ADMIN_DATABASE_URL)

    with pg_engine.begin() as conn:
        rows = conn.execute(text("SELECT id, code, name, industry, client_type FROM client_companies ORDER BY name, code")).fetchall()
        print(f"Total initial company records: {len(rows)}")

        groups = {}
        test_company_ids = []

        for r in rows:
            c_id, code, name, ind, ctype = r
            norm = normalize_name(name)
            if 'acme cyber' in norm or 'maria santos' in norm:
                test_company_ids.append(c_id)
            else:
                groups.setdefault(norm, []).append(r)

        print(f"Identified {len(test_company_ids)} test company records to delete.")
        print(f"Identified {len(groups)} real unique company groups.")

        # 1. Purge test companies
        if test_company_ids:
            placeholders = ", ".join(f":id_{i}" for i in range(len(test_company_ids)))
            params = {f"id_{i}": cid for i, cid in enumerate(test_company_ids)}
            conn.execute(text(f"DELETE FROM client_companies WHERE id IN ({placeholders})"), params)
            print("Purged test companies successfully.")

        # 2. Plan Merges
        merges = []
        for norm, cos in sorted(groups.items()):
            if len(cos) == 1:
                canonical = cos[0]
                duplicates = []
            else:
                has_corp_alpha = [c for c in cos if c[1] == 'CORP_ALPHA']
                if has_corp_alpha:
                    canonical = has_corp_alpha[0]
                    duplicates = [c for c in cos if c[0] != canonical[0]]
                else:
                    def rank_co(c):
                        is_suffixed = bool(re.search(r'_\d+$', c[1]))
                        has_si = bool(re.search(r'\(SI', c[2], flags=re.IGNORECASE))
                        return (is_suffixed, has_si, len(c[1]), c[1])
                    sorted_cos = sorted(cos, key=rank_co)
                    canonical = sorted_cos[0]
                    duplicates = sorted_cos[1:]
            
            clean_name = clean_display_name(canonical[2])
            merges.append({
                'canonical': canonical,
                'duplicates': duplicates,
                'clean_name': clean_name
            })

        print(f"\nProcessing {len(merges)} canonical companies (merging duplicate variants)...")

        for m in merges:
            can_id = m['canonical'][0]
            can_code = m['canonical'][1]
            clean_name = m['clean_name']

            # Update canonical company name if it had invoice tags
            conn.execute(
                text("UPDATE client_companies SET name = :name WHERE id = :id"),
                {"name": clean_name, "id": can_id}
            )

            for dup in m['duplicates']:
                dup_id = dup[0]
                dup_code = dup[1]

                # a. Re-point trainees
                conn.execute(
                    text("UPDATE trainees SET current_company_id = :can_id WHERE current_company_id = :dup_id"),
                    {"can_id": can_id, "dup_id": dup_id}
                )

                # b. Re-point trainee_affiliations
                # Remove any existing duplicate affiliation first
                conn.execute(
                    text("""
                        DELETE FROM trainee_affiliations 
                        WHERE company_id = :dup_id 
                        AND trainee_id IN (
                            SELECT trainee_id FROM trainee_affiliations WHERE company_id = :can_id
                        )
                    """),
                    {"can_id": can_id, "dup_id": dup_id}
                )
                conn.execute(
                    text("UPDATE trainee_affiliations SET company_id = :can_id WHERE company_id = :dup_id"),
                    {"can_id": can_id, "dup_id": dup_id}
                )

                # c. Re-point training_records
                conn.execute(
                    text("UPDATE training_records SET company_at_completion_id = :can_id WHERE company_at_completion_id = :dup_id"),
                    {"can_id": can_id, "dup_id": dup_id}
                )

                # d. Re-point account_manager_assignments
                # Delete any assignment for (user_id, can_id) if both AMs were assigned
                conn.execute(
                    text("""
                        DELETE FROM account_manager_assignments 
                        WHERE company_id = :dup_id 
                        AND user_id IN (
                            SELECT user_id FROM account_manager_assignments WHERE company_id = :can_id
                        )
                    """),
                    {"can_id": can_id, "dup_id": dup_id}
                )
                conn.execute(
                    text("UPDATE account_manager_assignments SET company_id = :can_id WHERE company_id = :dup_id"),
                    {"can_id": can_id, "dup_id": dup_id}
                )

                # e. Re-point access_logs
                conn.execute(
                    text("UPDATE access_logs SET company_id = :can_id WHERE company_id = :dup_id"),
                    {"can_id": can_id, "dup_id": dup_id}
                )

                # f. Re-point reencryption_jobs
                conn.execute(
                    text("UPDATE reencryption_jobs SET company_code = :can_code WHERE company_code = :dup_code"),
                    {"can_code": can_code, "dup_code": dup_code}
                )

                # g. Update users.assigned_client_accounts
                users = conn.execute(text("SELECT id, assigned_client_accounts FROM users WHERE assigned_client_accounts IS NOT NULL")).fetchall()
                for u in users:
                    u_id, accts = u
                    # accts may be parsed list or string
                    if isinstance(accts, str):
                        try:
                            accts = json.loads(accts)
                        except Exception:
                            accts = []
                    if accts and dup_code in accts:
                        updated_accts = [can_code if a == dup_code else a for a in accts]
                        # Deduplicate while preserving order
                        seen = set()
                        deduped = [x for x in updated_accts if not (x in seen or seen.add(x))]
                        conn.execute(
                            text("UPDATE users SET assigned_client_accounts = CAST(:accts AS json) WHERE id = :id"),
                            {"accts": json.dumps(deduped), "id": u_id}
                        )

                # h. Delete duplicate company
                conn.execute(
                    text("DELETE FROM client_companies WHERE id = :dup_id"),
                    {"dup_id": dup_id}
                )
                print(f"  Merged {dup_code} -> {can_code} ({clean_name})")

        final_count = conn.execute(text("SELECT count(*) FROM client_companies")).scalar()
        print(f"\nFinal client_companies count in PostgreSQL: {final_count}")

    # 3. Synchronize crossquest_pilot.db (SQLite)
    sqlite_path = "backend/crossquest_pilot.db"
    if not os.path.exists(sqlite_path):
        sqlite_path = "/app/crossquest_pilot.db"
    if os.path.exists(sqlite_path):
        print(f"\nSynchronizing cleaned database to {sqlite_path}...")
        s_conn = sqlite3.connect(sqlite_path)
        s_cur = s_conn.cursor()
        
        with pg_engine.connect() as pg_conn:
            pg_cos = pg_conn.execute(text("SELECT id, code, name, industry, client_type FROM client_companies ORDER BY name")).fetchall()
            
            s_cur.execute("DELETE FROM client_companies")
            for c in pg_cos:
                s_cur.execute(
                    "INSERT INTO client_companies (id, code, name, industry, client_type) VALUES (?, ?, ?, ?, ?)",
                    (c[0], c[1], c[2], c[3], c[4])
                )
            
            # Sync foreign keys in trainees & records
            pg_trainees = pg_conn.execute(text("SELECT id, current_company_id FROM trainees")).fetchall()
            for t in pg_trainees:
                s_cur.execute("UPDATE trainees SET current_company_id = ? WHERE id = ?", (t[1], t[0]))
            
            pg_recs = pg_conn.execute(text("SELECT id, company_at_completion_id FROM training_records")).fetchall()
            for r in pg_recs:
                s_cur.execute("UPDATE training_records SET company_at_completion_id = ? WHERE id = ?", (r[1], r[0]))
                
            pg_am = pg_conn.execute(text("SELECT id, assigned_client_accounts FROM users WHERE role = 'account_manager'")).fetchall()
            for u in pg_am:
                accts_json = u[1] if isinstance(u[1], str) else json.dumps(u[1] or [])
                s_cur.execute("UPDATE users SET assigned_client_accounts = ? WHERE id = ?", (accts_json, u[0]))

            s_conn.commit()
            print(f"SQLite client_companies count: {s_cur.execute('SELECT count(*) FROM client_companies').fetchone()[0]}")
        s_conn.close()

    print("\nCleanup completed successfully!")

if __name__ == "__main__":
    run_cleanup()
