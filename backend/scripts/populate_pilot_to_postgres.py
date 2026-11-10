"""Synchronize real pilot database from SQLite into PostgreSQL container."""
import os
import sys
import json
import sqlite3
from pathlib import Path
from sqlalchemy import create_engine, text

ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql+psycopg2://crossquest_admin:crossquest_secret_password@postgres:5432/crossquest_db"
)

SRC_DB = "/exports/crossquest_pilot.db"
if not os.path.exists(SRC_DB):
    SRC_DB = "crossquest_pilot.db"

print(f"Source SQLite: {SRC_DB}")
print(f"Target Postgres: {ADMIN_DATABASE_URL}")

pg_engine = create_engine(ADMIN_DATABASE_URL)
sqlite_conn = sqlite3.connect(SRC_DB)
sqlite_conn.row_factory = sqlite3.Row

TABLES_ORDERED = [
    "abe_attributes",
    "client_companies",
    "certification_types",
    "courses",
    "users",
    "user_abe_keys",
    "user_key_attributes",
    "user_sessions",
    "account_manager_assignments",
    "training_sessions",
    "trainer_assignments",
    "trainees",
    "trainee_affiliations",
    "teams",
    "team_members",
    "import_batches",
    "import_staging_rows",
    "import_discrepancies",
    "training_records",
    "training_record_versions",
    "certificates",
    "quizzes",
    "quiz_questions",
    "quiz_answer_keys",
    "quiz_attempts",
    "gamification_progress",
    "anomaly_rules",
    "anomaly_alerts",
    "access_logs",
    "notifications",
    "password_reset_tokens",
    "reencryption_jobs"
]

with pg_engine.begin() as conn:
    print("Disabling foreign keys and clearing target tables...")
    conn.execute(text("SET session_replication_role = 'replica';"))
    for tbl in reversed(TABLES_ORDERED):
        try:
            conn.execute(text(f'TRUNCATE TABLE "{tbl}" CASCADE;'))
        except Exception as e:
            print(f"Note on truncate {tbl}: {e}")

    sqlite_cur = sqlite_conn.cursor()
    
    for tbl in TABLES_ORDERED:
        sqlite_cur.execute(f"SELECT * FROM {tbl}")
        rows = sqlite_cur.fetchall()
        if not rows:
            continue
        
        col_names = [d[0] for d in sqlite_cur.description]
        
        # Check target columns and data types in postgres
        res = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tbl}'"))
        pg_col_types = {r[0]: r[1] for r in res.fetchall()}
        
        valid_cols = [c for c in col_names if c in pg_col_types]
        cols_str = ", ".join(f'"{c}"' for c in valid_cols)
        placeholders = ", ".join(f":{c}" for c in valid_cols)
        insert_sql = text(f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders})')
        
        records_to_insert = []
        for r in rows:
            row_dict = {}
            for c in valid_cols:
                val = r[c]
                col_type = pg_col_types.get(c, "")
                if col_type == "boolean":
                    if val is None:
                        row_dict[c] = None
                    elif isinstance(val, (int, str)):
                        row_dict[c] = True if val in (1, "1", "true", "True") else False
                    else:
                        row_dict[c] = bool(val)
                elif col_type in ("json", "jsonb"):
                    if val is None:
                        row_dict[c] = None
                    elif isinstance(val, str):
                        # Ensure it is valid json string
                        try:
                            json.loads(val)
                            row_dict[c] = val
                        except Exception:
                            row_dict[c] = json.dumps(val)
                    else:
                        row_dict[c] = json.dumps(val)
                else:
                    row_dict[c] = val
            records_to_insert.append(row_dict)
            
        conn.execute(insert_sql, records_to_insert)
        print(f"  -> Inserted {len(records_to_insert)} rows into {tbl}")
        
    conn.execute(text("SET session_replication_role = 'origin';"))

print("SUCCESS: Real pilot database synchronized into PostgreSQL!")
