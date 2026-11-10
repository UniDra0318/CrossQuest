# CrossQuest Pilot Database Export Package

**Export Timestamp (UTC):** 2026-11-10 00:58:32 UTC

**Source Database:** `crossquest_pilot.db` (4,124,672 bytes / ~3.93 MB)

**SQL Dump:** `crossquest_pilot_dump.sql` (1,124,426 bytes / ~1098.1 KB)

**Total Tables:** 33

**Total Records:** 3,166

## Formats Provided

1. **SQLite Database File (`crossquest_pilot.db`):** Ready-to-run binary database for CrossQuest or SQLite viewers (DB Browser for SQLite, DBeaver, VS Code SQLite Viewer).
2. **Standard SQL Dump (`crossquest_pilot_dump.sql`):** Complete DDL table schemas and INSERT statements for PostgreSQL / MySQL / SQLite imports.
3. **JSON Exports (`/json/*.json`):** Individual JSON files for every table, ideal for APIs, web seeding, or programmatic ingestion.
4. **CSV Exports (`/csv/*.csv`):** Excel-compatible CSV files for spreadsheets, audits, and business reviews.

## Table Breakdown

| Table Name | Record Count | Description / Role in CrossQuest |
|---|---|---|
| `abe_attributes` | 80 | CP-ABE attribute universe definitions |
| `access_logs` | 68 | Immutable append-only access audit log ledger |
| `account_manager_assignments` | 34 | Account manager portfolio scope assignments |
| `alert_events` | 0 | Supporting granular alert trigger events |
| `anomaly_alerts` | 6 | Security incident alerts with audit dispositions |
| `anomaly_rules` | 10 | Crossworks-approved anomaly detection rules (R1-R4, S1) |
| `certificates` | 7 | Issued verifiable certificates with serial IDs |
| `certification_types` | 1 | Certification types and validity period policies |
| `client_companies` | 143 | Registered enterprise client organizations |
| `courses` | 62 | Zero-trust cybersecurity & professional development courses |
| `gamification_progress` | 4 | XP, badges, points, and milestone achievements |
| `import_batches` | 6 | Data import history & reconciliation batches |
| `import_discrepancies` | 11 | Audit discrepancy tracking & resolution logs |
| `import_staging_rows` | 178 | Pre-import staging records for verification |
| `notifications` | 10 | In-app notifications and alerts |
| `password_reset_tokens` | 4 | Secure single-use password reset tokens |
| `quiz_answer_keys` | 3 | Answer verification keys & scoring criteria |
| `quiz_attempts` | 3 | Trainee quiz submission attempts & recorded scores |
| `quiz_questions` | 3 | Interactive quiz questions & assessment rubrics |
| `quizzes` | 2 | Assessment quizzes with status & approval tracking |
| `reencryption_jobs` | 76 | Key rotation & policy re-encryption batch records |
| `team_members` | 0 | Trainee-to-team assignments |
| `teams` | 21 | Session teams for collaborative cohort challenges |
| `trainee_affiliations` | 42 | Multi-tenant company affiliation mappings |
| `trainees` | 181 | Enrolled employee trainees with streaks & gamification state |
| `trainer_assignments` | 79 | Lead instructor course & session assignments |
| `training_record_versions` | 574 | Cryptographic audit trail with CP-ABE policy ciphertexts & version history |
| `training_records` | 554 | Trainee completion & attendance records with encrypted payloads |
| `training_sessions` | 190 | Live training cohorts & schedule deliveries |
| `user_abe_keys` | 9 | Issued user CP-ABE private cryptographic keys |
| `user_key_attributes` | 534 | Cryptographic attribute token mapping per user key |
| `user_sessions` | 42 | Active authenticated sessions & sliding idle timeouts |
| `users` | 229 | System accounts across 5 roles (Admin, AM, Finance, Trainer, Trainee) with MFA & security states |
