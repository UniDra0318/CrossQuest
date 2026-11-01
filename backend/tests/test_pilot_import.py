"""Tests for Pilot CSV Import & Discrepancy Reconciliation Pipeline (TC-DAT-01..12).

Meets requirements:
- DAT-01: Anonymized pilot data ingestion from Crossworks legacy CSV archives.
- DAT-02: SHA-256 duplicate file rejection.
- DAT-03: Staging row validation & discrepancy detection.
- DAT-04: Discrepancy resolution (ACCEPT, CORRECT, OVERRIDE_FLAG).
- DAT-05: Automatic CP-ABE hybrid encryption upon batch commit.
- DAT-06: Append-only audit logging of import operations.
- Measure M6: Ingestion throughput and processing latency recording.
- Chapter III Section 3.5.2, 3.5.4, Table 28.
"""

import pytest
import io
import hashlib
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, create_access_token
from app.models.entities import (
    User, ClientCompany, Trainee, TrainingRecord, ImportBatch,
    ImportStagingRow, ImportDiscrepancy, AccessLog
)


@pytest.fixture
def import_admin_and_staff(db_session: Session):
    """Sets up an admin user and non-admin user for import tests."""
    db = db_session
    admin = db.query(User).filter_by(email="import_admin@test.ph").first()
    if not admin:
        admin = User(
            email="import_admin@test.ph",
            username="import_admin",
            full_name="Import Administrator",
            hashed_password=get_password_hash("AdminPass123!"),
            role="admin",
            is_superuser=True,
            is_active=True
        )
        db.add(admin)

    trainer = db.query(User).filter_by(email="import_trainer@test.ph").first()
    if not trainer:
        trainer = User(
            email="import_trainer@test.ph",
            username="import_trainer",
            full_name="Import Trainer",
            hashed_password=get_password_hash("TrainerPass123!"),
            role="trainer",
            is_active=True
        )
        db.add(trainer)

    db.commit()
    db.refresh(admin)
    db.refresh(trainer)
    return {"admin": admin, "trainer": trainer}


@pytest.fixture(scope="module", autouse=True)
def clean_import_tables():
    """Ensure import tables are clean before running pilot import tests."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        db.query(ImportDiscrepancy).delete()
        db.query(ImportStagingRow).delete()
        db.query(ImportBatch).delete()
        db.commit()
    finally:
        db.close()


SAMPLE_CSV_VALID = """trainee_code,first_name,last_name,course_name,company_code,score,status
TRN_PILOT_01,Juan,Dela Cruz,Cybersecurity Fundamentals,CORP_PILOT_A,92.5,Completed
TRN_PILOT_02,Maria,Santos,Project Management Professional,CORP_PILOT_A,88.0,Completed
TRN_PILOT_03,Pedro,Reyes,Risk Management ISO 31000,CORP_PILOT_B,95.0,Completed
"""

SAMPLE_CSV_DISCREPANCY = """trainee_code,first_name,last_name,course_name,company_code,score,status
,Ghost,User,Cybersecurity Fundamentals,CORP_PILOT_A,90.0,Completed
TRN_PILOT_04,Ana,Lim,,CORP_PILOT_A,85.0,Completed
TRN_PILOT_05,Carlos,Tan,Data Governance,CORP_PILOT_A,NotAScore,Completed
"""


def test_tc_dat_01_and_02_upload_and_deduplication(client: TestClient, import_admin_and_staff):
    """TC-DAT-01 & TC-DAT-02: CSV staging and duplicate rejection by SHA-256 hash."""
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    # 1. First upload succeeds (TC-DAT-02)
    files = {"file": ("pilot_batch_1.csv", io.BytesIO(SAMPLE_CSV_VALID.encode("utf-8")), "text/csv")}
    resp = client.post("/api/v1/imports/upload", files=files, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 3
    assert data["valid_rows"] == 3
    assert data["discrepancy_rows"] == 0
    assert "batch_id" in data

    # 2. Duplicate upload of identical file is rejected with HTTP 409 (TC-DAT-01)
    files_dup = {"file": ("pilot_batch_duplicate.csv", io.BytesIO(SAMPLE_CSV_VALID.encode("utf-8")), "text/csv")}
    resp_dup = client.post("/api/v1/imports/upload", files=files_dup, headers={"Authorization": f"Bearer {token}"})
    assert resp_dup.status_code == 409
    assert "Duplicate file detected" in resp_dup.json()["detail"]


def test_tc_dat_03_and_04_discrepancy_flagging(client: TestClient, import_admin_and_staff):
    """TC-DAT-03 & TC-DAT-04: Missing fields and invalid formats flagged as discrepancies."""
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    files = {"file": ("pilot_discrepant.csv", io.BytesIO(SAMPLE_CSV_DISCREPANCY.encode("utf-8")), "text/csv")}
    resp = client.post("/api/v1/imports/upload", files=files, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    batch_data = resp.json()
    assert batch_data["discrepancy_rows"] >= 3

    batch_id = batch_data["batch_id"]
    # Retrieve discrepancies
    disc_resp = client.get(f"/api/v1/imports/batches/{batch_id}/discrepancies", headers={"Authorization": f"Bearer {token}"})
    assert disc_resp.status_code == 200
    discrepancies = disc_resp.json()
    assert len(discrepancies) >= 3

    issue_types = [d["issue_type"] for d in discrepancies]
    assert "MISSING_TRAINEE_CODE" in issue_types
    assert "MISSING_COURSE_NAME" in issue_types
    assert "INVALID_SCORE_FORMAT" in issue_types


def test_tc_dat_05_discrepancy_resolution(client: TestClient, import_admin_and_staff, db_session: Session):
    """TC-DAT-05: Discrepancy resolution workflow (CORRECT / ACCEPT / OVERRIDE_FLAG)."""
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    # Find a discrepancy from the previous test
    disc = db_session.query(ImportDiscrepancy).first()
    assert disc is not None

    resolve_resp = client.put(
        f"/api/v1/imports/discrepancies/{disc.id}/resolve",
        json={
            "resolution": "CORRECT",
            "reason": "Administrative data correction on pilot record.",
            "corrected_data": {"trainee_code": "TRN_RESOLVED_01", "score": "91.0"}
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"


def test_tc_dat_06_and_07_batch_commit_encryption_and_audit(client: TestClient, import_admin_and_staff, db_session: Session):
    """TC-DAT-06 & TC-DAT-07: Batch commit into training_records with hybrid CP-ABE encryption and audit log."""
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    # Find the valid batch
    batch = db_session.query(ImportBatch).filter(ImportBatch.source_file_name == "pilot_batch_1.csv").first()
    assert batch is not None

    commit_resp = client.post(
        f"/api/v1/imports/batches/{batch.id}/commit",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert commit_resp.status_code == 200
    commit_data = commit_resp.json()
    assert commit_data["records_committed"] >= 3

    # Verify committed records have CP-ABE encryption enabled
    records = db_session.query(TrainingRecord).filter(TrainingRecord.encryption_policy.contains("CORPPILOTA")).all()
    assert len(records) >= 1
    for r in records:
        assert r.is_encrypted is True
        assert r.payload_ciphertext is not None
        assert "ROLEADMIN" in r.encryption_policy

    # Verify audit log recorded (TC-DAT-07)
    logs = db_session.query(AccessLog).filter_by(event_type="IMPORT_COMMIT").all()
    assert len(logs) >= 1


def test_tc_dat_08_measure_m6_ingestion_throughput(monotonic_timer, client: TestClient, import_admin_and_staff):
    """TC-DAT-08: Measure M6 ingestion throughput and processing latency in nanoseconds."""
    timer = monotonic_timer()
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    # 10 synthetic rows
    rows = ["trainee_code,first_name,last_name,course_name,company_code,score,status"]
    for i in range(10):
        rows.append(f"TRN_M6_{i},Trainee{i},User{i},Course_{i},CORP_M6,{80.0 + i},Completed")
    csv_content = "\n".join(rows)

    timer.start()
    files = {"file": ("m6_benchmark.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/v1/imports/upload", files=files, headers={"Authorization": f"Bearer {token}"})
    upload_ns = timer.stop()
    upload_ms = upload_ns / 1_000_000.0

    assert resp.status_code == 200
    assert upload_ns > 0
    print(f"\n[Measure M6 Benchmark] 10-Row CSV Ingestion Latency: {upload_ms:.3f}ms ({upload_ns}ns)")


def test_tc_dat_09_malformed_csv_resilience(client: TestClient, import_admin_and_staff):
    """TC-DAT-09: Malformed CSV content is parsed resiliently without crashing server."""
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    malformed = "not,a,standard,header\nfoo,bar\n1,2,3,4,5,6,7,8,9\n\n\n"
    files = {"file": ("malformed.csv", io.BytesIO(malformed.encode("utf-8")), "text/csv")}
    resp = client.post("/api/v1/imports/upload", files=files, headers={"Authorization": f"Bearer {token}"})
    # Should stage rows with discrepancies rather than crashing with 500
    assert resp.status_code in (200, 400)


def test_tc_dat_10_role_gating_admin_only(client: TestClient, import_admin_and_staff):
    """TC-DAT-10: Non-admin roles (Trainer) are denied from importing batches."""
    trainer = import_admin_and_staff["trainer"]
    token = create_access_token(subject=trainer.id)

    files = {"file": ("unauthorized.csv", io.BytesIO(SAMPLE_CSV_VALID.encode("utf-8")), "text/csv")}
    resp = client.post("/api/v1/imports/upload", files=files, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_tc_dat_11_company_code_resolution(db_session: Session):
    """TC-DAT-11: Company codes in imported rows are properly resolved against client_companies."""
    comp = db_session.query(ClientCompany).filter_by(code="CORP_PILOT_A").first()
    assert comp is not None
    assert comp.code == "CORP_PILOT_A"


def test_tc_dat_12_pilot_synthetic_dataset_integrity(db_session: Session):
    """TC-DAT-12: Integrity check on committed pilot synthetic dataset."""
    trainees = db_session.query(Trainee).filter(Trainee.trainee_code.startswith("TRN_PILOT_")).all()
    assert len(trainees) >= 1
    for t in trainees:
        assert t.trainee_code.startswith("TRN_PILOT_")
        assert t.current_company_id is not None


def test_phase3_excel_workbook_pilot_ingestion_and_100_percent_reconciliation(client: TestClient, import_admin_and_staff, db_session: Session):
    """Phase 3 Target: 100% reconciliation of 149 in-scope rows across 39 customers (Figure 12, Chapter III)."""
    import os
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    excel_path = r"d:\Downloads\Training_Participants_dda05079-5c52-4e44-909e-a5adbf4567e0.xlsx"
    if not os.path.exists(excel_path):
        pytest.skip(f"Pilot Excel file not found at {excel_path}")

    with open(excel_path, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("Training_Participants.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    resp = client.post("/api/v1/imports/upload-workbook", files=files, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()

    batch_id = data["batch_id"]
    assert data["total_rows"] == 150
    assert data["pre_cutoff_rows"] == 1 # June 6, 2026 Ron Robert Despi
    assert data["in_scope_rows"] == 149 # Strict August 1, 2026 cutoff
    assert data["distinct_customers"] == 39 # Red Oak consolidated
    assert data["quarantined_rows"] == 2 # Angelito & Jocelyn duplicates

    # 1. Fetch reconciliation report before quarantine resolution
    rec_resp = client.get(f"/api/v1/imports/batches/{batch_id}/reconciliation", headers={"Authorization": f"Bearer {token}"})
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    assert rec_data["in_scope_rows"] == 149
    assert rec_data["distinct_customers"] == 39
    assert rec_data["quarantined_rows"] == 2
    assert rec_data["reconciled"] is False

    # 2. Admin resolves quarantined discrepancies with mandatory logged reason
    disc_resp = client.get(f"/api/v1/imports/batches/{batch_id}/discrepancies", headers={"Authorization": f"Bearer {token}"})
    assert disc_resp.status_code == 200
    discrepancies = disc_resp.json()
    assert len(discrepancies) == 2

    # Attempt resolution without reason -> 400 Bad Request
    fail_res = client.put(
        f"/api/v1/imports/discrepancies/{discrepancies[0]['id']}/resolve",
        json={"resolution": "ACCEPT", "reason": ""},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert fail_res.status_code == 400

    # Resolve both with logged reason
    for d in discrepancies:
        ok_res = client.put(
            f"/api/v1/imports/discrepancies/{d['id']}/resolve",
            json={
                "resolution": "MERGE_DUPLICATE",
                "reason": "Verified duplicate cohort registration with HR sponsor; merged into single participant profile."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert ok_res.status_code == 200

    # 3. Fetch reconciliation report after resolution -> 100% RECONCILIATION ACHIEVED!
    rec_resp2 = client.get(f"/api/v1/imports/batches/{batch_id}/reconciliation", headers={"Authorization": f"Bearer {token}"})
    assert rec_resp2.status_code == 200
    rec_data2 = rec_resp2.json()
    assert rec_data2["reconciliation_rate"] == "100.0%"
    assert rec_data2["reconciled"] is True
    assert rec_data2["resolved_rows"] == 2

    # 4. Download Finance Reconciliation Report PDF (ReportLab, OI-10)
    pdf_resp = client.get(f"/api/v1/imports/batches/{batch_id}/reconciliation/pdf", headers={"Authorization": f"Bearer {token}"})
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF")


def test_phase3_sample_data_drops_sales_and_billing_fields(client: TestClient, import_admin_and_staff, db_session: Session):
    """Phase 3: Verify billing and sales columns are strictly dropped from Sample-Data workbooks."""
    import os
    admin = import_admin_and_staff["admin"]
    token = create_access_token(subject=admin.id)

    excel_path = r"d:\Downloads\Sample-Data_84bce693-2ae3-4172-a698-6b791b0977c0.xlsx"
    if not os.path.exists(excel_path):
        pytest.skip(f"Sample-Data Excel file not found at {excel_path}")

    with open(excel_path, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("Sample-Data.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    resp = client.post("/api/v1/imports/upload-workbook", files=files, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    batch_id = resp.json()["batch_id"]

    # Verify staging rows do NOT contain sales/billing columns
    staging_rows = db_session.query(ImportStagingRow).filter(ImportStagingRow.batch_id == batch_id).limit(10).all()
    assert len(staging_rows) > 0
    for r in staging_rows:
        raw = r.raw_data or {}
        assert "sales" not in raw
        assert "sales_by" not in raw
        assert "payment_status" not in raw
        assert "payment_method" not in raw
        assert "2307" not in raw
