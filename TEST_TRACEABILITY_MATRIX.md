# CrossQuest Test Traceability Matrix (Chapter III Table 17)

**Document Reference:** Chapter III, Section 3.8 & Table 17 (*Test Baseline v1 Specification*)  
**Scope:** 176 Total Test Cases (169 Automated Pytest Suite + 7 Manual Stakeholder UAT Procedures)  
**Verification Target:** ISO/IEC 25010 Quality Model (Functional Suitability, Reliability, Security, Performance)  
**Latest Verification Date:** November 7, 2026  
**Status:** **169/169 Automated Passing (100% Automated Suite Pass Rate); 7 Manual UAT Procedures Staged for Defense**

---

## Summary of Test Groups

| Group ID | Functional / Security Domain | Total Cases | Automated | Manual UAT | Status |
|:---|:---|:---:|:---:|:---:|:---:|
| **TC-CRY** | Hybrid CP-ABE (BSW07) & AES-256-GCM Primitives | 12 | 12 | 0 | **PASSED** |
| **TC-AUT** | Authentication, Argon2id, TOTP, Token Lifetimes | 16 | 16 | 0 | **PASSED** |
| **TC-ATT** | Attribute Authority, Versioning & KMS Enveloping | 16 | 16 | 0 | **PASSED** |
| **TC-XCL** | Cross-Client Isolation & Option B Shared Trainee | 12 | 12 | 0 | **PASSED** |
| **TC-ANO** | Anomaly Detection Rules (R1–R4, S1) & Review | 28 | 28 | 0 | **PASSED** |
| **TC-CRT** | Certification Validity (36-mo & Non-Expiring) | 16 | 16 | 0 | **PASSED** |
| **TC-DAT** | Pilot Excel/CSV Ingestion & Reconciliation | 12 | 12 | 0 | **PASSED** |
| **TC-GAM** | Gamification Engine, PWA Quizzes & Scoring | 20 | 20 | 0 | **PASSED** |
| **TC-SEC** | OWASP Headers, Fail-Closed Guards & CORS | 16 | 16 | 0 | **PASSED** |
| **TC-RLS** | PostgreSQL Row-Level Security & Context Filtering | 21 | 21 | 0 | **PASSED** |
| **TC-UAT** | User Acceptance Testing & Operational Workflows | 7 | 0 | 7 | **STAGED FOR UAT** |
| **TOTAL** | **Comprehensive Quality Verification** | **176** | **169** | **7** | **169 PASS / 7 STAGED** |

---

## Detailed Test Traceability Mapping

### 1. Cryptographic Primitives & Hybrid CP-ABE (TC-CRY-01 .. 12)
*Standard: Chapter III Section 3.6.4, DD-02, SEC-04, VR-24*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-CRY-01` | Alphanumeric attribute sanitization (strip underscores/colons) | Automated | `test_crypto_primitives.py::test_tc_cry_01_alphanumeric_sanitization` | PASSED |
| `TC-CRY-02` | CP-ABE BSW07 hybrid encryption with AES-256-GCM + HKDF | Automated | `test_crypto_primitives.py::test_tc_cry_02_hybrid_encryption_bsw07` | PASSED |
| `TC-CRY-03` | Unauthorized attribute policy decryption denial | Automated | `test_crypto_primitives.py::test_tc_cry_03_unauthorized_policy_denial` | PASSED |
| `TC-CRY-04` | AAD tampering detection on record ID, version, or policy | Automated | `test_crypto_primitives.py::test_tc_cry_04_aad_tamper_detection` | PASSED |
| `TC-CRY-05` | CP-ABE Master Public and Secret Key persistence to disk | Automated | `test_thesis_compliance.py::test_fail_closed_production_charm_enforcement` | PASSED |
| `TC-CRY-06` | Multi-worker master key consistency across server restarts | Automated | `test_thesis_compliance.py::test_versioned_cpabe_tokens` | PASSED |
| `TC-CRY-07` | Trainee identity token binding (`TRAINEE<id>`) | Automated | `test_crypto_primitives.py::test_tc_cry_07_trainee_attribute_binding` | PASSED |
| `TC-CRY-08` | Attribute versioning token format (`CLIENT<id>V<n>`) | Automated | `test_thesis_compliance.py::test_versioned_cpabe_tokens` | PASSED |
| `TC-CRY-09` | HKDF salt and info domain separation | Automated | `test_crypto_primitives.py::test_tc_cry_09_hkdf_domain_separation` | PASSED |
| `TC-CRY-10` | Fail-closed production enforcement (refuse simulation in prod) | Automated | `test_thesis_compliance.py::test_fail_closed_production_simulation_forbidden` | PASSED |
| `TC-CRY-11` | AES-256-GCM 96-bit random nonce uniqueness | Automated | `test_crypto_primitives.py::test_tc_cry_11_nonce_uniqueness` | PASSED |
| `TC-CRY-12` | Crypto-shredding on account deactivation | Automated | `test_attribute_versioning.py::test_tc_att_13_crypto_shredding_on_user_disable` | PASSED |

---

### 2. Authentication, Authorization & Session Management (TC-AUT-01 .. 16)
*Standard: Chapter III Section 3.6.1, SEC-01, SEC-07, OI-17, OI-26*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-AUT-01` | Valid login returns 10-minute JWT and 8-hour refresh cookie | Automated | `test_role_boundaries.py::test_tc_aut_01_valid_login` | PASSED |
| `TC-AUT-02` | Invalid credentials rejected with Argon2id verification | Automated | `test_role_boundaries.py::test_tc_aut_02_invalid_password` | PASSED |
| `TC-AUT-03` | Missing Authorization header returns 401 Unauthorized | Automated | `test_role_boundaries.py::test_tc_aut_03_missing_auth_header` | PASSED |
| `TC-AUT-04` | Malformed or expired JWT rejection | Automated | `test_role_boundaries.py::test_tc_aut_04_malformed_or_expired_jwt` | PASSED |
| `TC-AUT-05` | Refresh token single-use rotation | Automated | `test_role_boundaries.py::test_tc_aut_05_refresh_token_rotation` | PASSED |
| `TC-AUT-06` | Inactive user blocked from login | Automated | `test_role_boundaries.py::test_tc_aut_06_inactive_user_cannot_login` | PASSED |
| `TC-AUT-07` | Immediate session revocation upon user deactivation | Automated | `test_role_boundaries.py::test_tc_aut_07_immediate_session_revocation_on_disable` | PASSED |
| `TC-AUT-08` | TOTP MFA enrollment and verification | Automated | `test_account_lifecycle.py::test_mfa_setup_enable_and_totp_login` | PASSED |
| `TC-AUT-09` | TOTP single-use emergency recovery codes | Automated | `test_account_lifecycle.py::test_mfa_single_use_recovery_code` | PASSED |
| `TC-AUT-10` | Admin single-use password reset link generation | Automated | `test_account_lifecycle.py::test_admin_single_use_password_reset` | PASSED |
| `TC-AUT-11` | Admin/Finance 15-minute idle timeout enforcement | Automated | `test_account_lifecycle.py::test_role_based_idle_timeout_expiration` | PASSED |
| `TC-AUT-12` | Staff/Trainer 30-minute idle timeout enforcement | Automated | `test_account_lifecycle.py::test_role_based_idle_timeout_expiration` | PASSED |
| `TC-AUT-13` | Trainee 60-minute idle timeout enforcement | Automated | `test_account_lifecycle.py::test_role_based_idle_timeout_expiration` | PASSED |
| `TC-AUT-14` | 12-hour maximum hard session lifetime expiration | Automated | `test_account_lifecycle.py::test_max_session_lifetime_12h_expiration` | PASSED |
| `TC-AUT-15` | CSRF cookie token protection (`X-CrossQuest-CSRF`) | Automated | `test_account_lifecycle.py::test_csrf_protection_on_cookie_endpoints` | PASSED |
| `TC-AUT-16` | Keyed-HMAC pseudonymized usernames in audit logs | Automated | `test_account_lifecycle.py::test_keyed_hmac_username_in_audit_logs` | PASSED |

---

### 3. Attribute Authority & KMS Envelope Wrapping (TC-ATT-01 .. 16)
*Standard: Chapter III Section 3.6.4, DD-05, DD-09, SEC-06*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-ATT-01` | Attribute token issuance and database indexing | Automated | `test_attribute_versioning.py::test_tc_att_01_attribute_issuance_and_storage` | PASSED |
| `TC-ATT-02` | Standard alphanumeric token naming format | Automated | `test_attribute_versioning.py::test_tc_att_02_attribute_token_format` | PASSED |
| `TC-ATT-03` | User CP-ABE private key generation and secure storage | Automated | `test_attribute_versioning.py::test_tc_att_03_user_key_generation_and_storage` | PASSED |
| `TC-ATT-04` | AWS KMS envelope encryption of user private keys | Automated | `test_attribute_versioning.py::test_tc_att_04_kms_envelope_encryption` | PASSED |
| `TC-ATT-05` | Attribute version incrementation (v -> v+1) | Automated | `test_attribute_versioning.py::test_tc_att_05_attribute_version_bump` | PASSED |
| `TC-ATT-06` | Batch re-keying of remaining authorized users | Automated | `test_attribute_versioning.py::test_tc_att_06_rekey_remaining_authorized_users` | PASSED |
| `TC-ATT-07` | Revoked/departed user key cannot decrypt new version | Automated | `test_attribute_versioning.py::test_tc_att_07_revoked_user_cannot_decrypt_new_version` | PASSED |
| `TC-ATT-08` | Background re-encryption job for active record versions | Automated | `test_attribute_versioning.py::test_tc_att_08_reencrypt_records_job` | PASSED |
| `TC-ATT-09` | Historical record version snapshot preservation | Automated | `test_attribute_versioning.py::test_tc_att_09_reencryption_snapshot_preserved` | PASSED |
| `TC-ATT-10` | Trainee cross-company credential mobility attribute | Automated | `test_attribute_versioning.py::test_tc_att_10_trainee_attribute_persistence_across_companies` | PASSED |
| `TC-ATT-11` | Role-level attribute version bump | Automated | `test_attribute_versioning.py::test_tc_att_11_role_attribute_version_bump` | PASSED |
| `TC-ATT-12` | Training session attribute scoping | Automated | `test_attribute_versioning.py::test_tc_att_12_training_session_version_bump` | PASSED |
| `TC-ATT-13` | Key destruction (crypto-shredding) on user disable | Automated | `test_attribute_versioning.py::test_tc_att_13_crypto_shredding_on_user_disable` | PASSED |
| `TC-ATT-14` | Append-only audit logging for attribute events | Automated | `test_attribute_versioning.py::test_tc_att_14_audit_log_attribute_events` | PASSED |
| `TC-ATT-15` | AWS KMS envelope unwrap in production mode | Automated | `test_thesis_compliance.py::test_fail_closed_kms_envelope_in_production` | PASSED |
| `TC-ATT-16` | Production KMS failure raises fail-closed exception | Automated | `test_thesis_compliance.py::test_fail_closed_kms_envelope_in_production` | PASSED |

---

### 4. Cross-Client Isolation & Option B Scoping (TC-XCL-01 .. 12)
*Standard: Chapter III Section 3.6.3, Table 16, Option B Calibration*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-XCL-01` | Account Manager client company list filtering | Automated | `test_role_boundaries.py::test_tc_xcl_01_account_manager_company_filtering` | PASSED |
| `TC-XCL-02` | Account Manager decrypt out-of-scope company denied | Automated | `test_role_boundaries.py::test_tc_xcl_02_account_manager_decrypt_out_of_scope_denied` | PASSED |
| `TC-XCL-03` | Account Manager decrypt in-scope assigned company success | Automated | `test_role_boundaries.py::test_tc_xcl_03_account_manager_decrypt_in_scope_success` | PASSED |
| `TC-XCL-04` | Trainer session scope isolation (assigned cohorts only) | Automated | `test_role_boundaries.py::test_tc_xcl_04_trainer_scope_isolation` | PASSED |
| `TC-XCL-05` | Trainee scope isolation (own records and credentials only) | Automated | `test_role_boundaries.py::test_tc_xcl_05_trainee_scope_isolation` | PASSED |
| `TC-XCL-06` | Trainee decrypts lifetime multi-company training history | Automated | `test_role_boundaries.py::test_tc_xcl_06_trainee_cross_company_credential_mobility` | PASSED |
| `TC-XCL-07` | Client company corporate users blocked from direct login | Automated | `test_role_boundaries.py::test_tc_xcl_07_no_client_company_user_logins` | PASSED |
| `TC-XCL-08` | Admin and Finance cross-client oversight authority | Automated | `test_role_boundaries.py::test_tc_xcl_08_admin_and_finance_cross_client_authority` | PASSED |
| `TC-XCL-09` | Option B: AM views shared trainee history read-only | Automated | `test_role_boundaries.py::test_tc_xcl_09_option_b_shared_trainee_cross_company_viewing_and_write_blocking` | PASSED |
| `TC-XCL-10` | Option B: AM write attempts to foreign tenant records blocked | Automated | `test_role_boundaries.py::test_tc_xcl_09_option_b_shared_trainee_cross_company_viewing_and_write_blocking` | PASSED |
| `TC-XCL-11` | Multi-client tenant boundary leak prevention | Automated | `test_backend_features_expanded.py::test_tc_sec_19_multi_client_tenant_isolation` | PASSED |
| `TC-XCL-12` | Trainee code cross-company persistence (`TRN_<hash>`) | Automated | `test_attribute_versioning.py::test_tc_att_10_trainee_attribute_persistence_across_companies` | PASSED |

---

### 5. Access Anomaly Detection Rules & Review Desk (TC-ANO-01 .. 28)
*Standard: Chapter III Section 3.7 & Table 13 (Rules R1–R4, S1)*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-ANO-01` | R1-a: Single out-of-scope access attempt generates Low alert | Automated | `test_anomaly_detection.py::test_tc_ano_01_r1_a_single_out_of_scope` | PASSED |
| `TC-ANO-02` | R1-a: Daily aggregation of duplicate out-of-scope attempts | Automated | `test_anomaly_detection.py::test_tc_ano_02_r1_a_daily_aggregation` | PASSED |
| `TC-ANO-03` | R1-b: Repeated out-of-scope attempts (3 in 15 min) -> Medium | Automated | `test_anomaly_detection.py::test_tc_ano_03_r1_b_repeated_out_of_scope` | PASSED |
| `TC-ANO-04` | R2-a: 5 failed logins on single account in 10 min -> Medium | Automated | `test_anomaly_detection.py::test_tc_ano_04_r2_a_failed_logins_account` | PASSED |
| `TC-ANO-05` | R2-b: 10 failed logins from IP across >=2 users -> Medium | Automated | `test_anomaly_detection.py::test_tc_ano_05_r2_b_failed_logins_ip` | PASSED |
| `TC-ANO-06` | R3-a: Role-based distinct record views threshold in 15 min | Automated | `test_anomaly_detection.py::test_tc_ano_06_r3_a_high_record_access` | PASSED |
| `TC-ANO-07` | R3-a: Volume burst (>= 2x threshold) escalates to High | Automated | `test_anomaly_detection.py::test_tc_ano_07_r3_a_volume_escalation_to_high` | PASSED |
| `TC-ANO-08` | R3-b: Report generation burst (5 reports in 60 min) -> Medium | Automated | `test_anomaly_detection.py::test_tc_ano_08_r3_b_report_burst` | PASSED |
| `TC-ANO-09` | R4-a: Training record deletion triggers immediate High alert | Automated | `test_anomaly_detection.py::test_tc_ano_09_r4_a_record_deletion_high_priority` | PASSED |
| `TC-ANO-10` | R4-b: Record edit generates Low alert daily digest | Automated | `test_anomaly_detection.py::test_tc_ano_10_r4_b_record_edit_low_daily` | PASSED |
| `TC-ANO-11` | R4-c: Bulk record edit (10 records in 15 min) -> Medium | Automated | `test_anomaly_detection.py::test_tc_ano_11_r4_c_bulk_edit_medium` | PASSED |
| `TC-ANO-12` | S1: After-hours escalates base alert severity by 1 level | Automated | `test_anomaly_detection.py::test_tc_ano_12_s1_escalates_severity_by_one_level` | PASSED |
| `TC-ANO-13` | S1: Severity strictly capped at High (no Critical) | Automated | `test_anomaly_detection.py::test_tc_ano_13_s1_severity_strictly_capped_at_high` | PASSED |
| `TC-ANO-14` | S1: Weekend timestamps classified as after-hours | Automated | `test_anomaly_detection.py::test_tc_ano_14_s1_weekend_is_after_hours` | PASSED |
| `TC-ANO-15` | S1: Mon–Fri 09:00–18:00 PHT classified as business hours | Automated | `test_anomaly_detection.py::test_tc_ano_15_s1_weekday_business_hours_not_after_hours` | PASSED |
| `TC-ANO-16` | S1: Supporting indicator NEVER creates an alert on its own | Automated | `test_anomaly_detection.py::test_tc_ano_16_s1_never_alerts_alone` | PASSED |
| `TC-ANO-17` | Anomaly alert immutability: deletion forbidden | Automated | `test_anomaly_detection.py::test_tc_ano_17_immutable_alerts_delete_forbidden` | PASSED |
| `TC-ANO-18` | Alert review lifecycle: NEW -> UNDER_REVIEW -> CLOSED | Automated | `test_anomaly_detection.py::test_tc_ano_18_alert_review_lifecycle` | PASSED |
| `TC-ANO-19` | Performance Measure M4: detection engine latency | Automated | `test_anomaly_detection.py::test_tc_ano_19_performance_measure_m4` | PASSED |
| `TC-ANO-20` | Rule modification and two-man rule approval workflow | Automated | `test_anomaly_detection.py::test_tc_ano_20_rule_modification_and_approval` | PASSED |
| `TC-ANO-21` | Sub-threshold normal activities generate no alerts | Automated | `test_anomaly_detection.py::test_tc_ano_21_below_threshold_no_alert` | PASSED |
| `TC-ANO-22` | R2-b dual-condition requirement (failures + distinct users) | Automated | `test_anomaly_detection.py::test_tc_ano_22_r2_b_dual_threshold_requires_distinct_targeted_users` | PASSED |
| `TC-ANO-23` | Peer review blocks subject administrator from self-review | Automated | `test_anomaly_detection.py::test_tc_ano_23_peer_review_blocks_subject_administrator` | PASSED |
| `TC-ANO-24` | Alert state transition to AWAITING_UNINVOLVED_ADMIN | Automated | `test_anomaly_detection.py::test_tc_ano_24_peer_review_awaiting_uninvolved_admin_state` | PASSED |
| `TC-ANO-25` | 12-month retention purge and 30-day proactive warning | Automated | `test_anomaly_detection.py::test_tc_ano_25_retention_job_purges_12mo_data_and_warns_open_alerts` | PASSED |
| `TC-ANO-26` | Threshold parameter tuning audited with old and new values | Automated | `test_anomaly_detection.py::test_tc_ano_26_threshold_tuning_audited_with_old_and_new_parameters` | PASSED |
| `TC-ANO-27` | Batch detection measurement across 30 events per rule | Automated | `test_anomaly_detection.py::test_tc_ano_27_detection_measurement_30_events_per_rule` | PASSED |
| `TC-ANO-28` | Executive anomaly summary report and CSV/JSON export | Automated | `test_anomaly_detection.py::test_tc_ano_28_executive_anomaly_report_and_exports` | PASSED |

---

### 6. Certification Validity & PDF Generation (TC-CRT-01 .. 16)
*Standard: Chapter III Section 3.6.5, SEC-20, SEC-22, OI-05, OI-10*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-CRT-01` | Non-expiring completion certificate policy | Automated | `test_training_workflow.py::test_completion_certificate_serial_and_non_expiring_policy` | PASSED |
| `TC-CRT-02` | ISO 36-month renewable compliance certifications | Automated | `test_cert_scheduler.py::test_tc_crt_01_thirty_six_month_expiry_calculation` | PASSED |
| `TC-CRT-03` | 60-day proactive renewal warning flag | Automated | `test_cert_scheduler.py::test_tc_crt_02_sixty_day_warning_flag` | PASSED |
| `TC-CRT-04` | 30-day urgent renewal warning flag | Automated | `test_cert_scheduler.py::test_tc_crt_03_thirty_day_urgent_flag` | PASSED |
| `TC-CRT-05` | Post-expiry status transition to EXPIRED | Automated | `test_cert_scheduler.py::test_tc_crt_04_expired_status_transition` | PASSED |
| `TC-CRT-06` | Background automated certificate lifecycle scheduler | Automated | `test_cert_scheduler.py::test_tc_crt_05_background_scheduler_execution` | PASSED |
| `TC-CRT-07` | ReportLab high-resolution PDF certificate generation | Automated | `test_training_workflow.py::test_certificate_pdf_generation_and_access_control` | PASSED |
| `TC-CRT-08` | Unique certificate serial numbering (`CW-<year>-<seq>`) | Automated | `test_training_workflow.py::test_completion_certificate_serial_and_non_expiring_policy` | PASSED |
| `TC-CRT-09` | Trainee self-service certificate PDF download | Automated | `test_training_workflow.py::test_certificate_pdf_generation_and_access_control` | PASSED |
| `TC-CRT-10` | Admin certificate re-issuance with mandatory audit reason | Automated | `test_training_workflow.py::test_admin_certificate_reissue_with_logged_reason` | PASSED |
| `TC-CRT-11` | Four completion statuses (`not_started`, `in_progress`, etc.) | Automated | `test_training_workflow.py::test_four_completion_statuses_and_am_restrictions` | PASSED |
| `TC-CRT-12` | Trainer session sign-off and certificate trigger | Automated | `test_training_workflow.py::test_trainer_session_sign_off_and_certificate_issuance` | PASSED |
| `TC-CRT-13` | Future training date sign-off rejection | Automated | `test_training_workflow.py::test_tc_dat_17_future_date_sign_off_rejected` | PASSED |
| `TC-CRT-14` | Lead trainer assigned cohorts inspection endpoint | Automated | `test_training_workflow.py::test_trainer_assigned_sessions_endpoint` | PASSED |
| `TC-CRT-15` | Trainee external renewal submission SSRF-safe validation | Automated | `test_training_workflow.py::test_trainee_external_credential_renewal_ssrf_safe` | PASSED |
| `TC-CRT-16` | Dynamic certificate status calculation without side effects | Automated | `test_thesis_compliance.py::test_certification_dynamic_status` | PASSED |

---

### 7. Pilot Data Ingestion, Reconciliation & Hashing (TC-DAT-01 .. 12)
*Standard: Chapter III Section 3.5.2, Section 3.5.4, DAT-01..06*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-DAT-01` | Pilot workbook upload and SHA-256 calculation | Automated | `test_pilot_import.py::test_tc_dat_01_and_02_upload_and_deduplication` | PASSED |
| `TC-DAT-02` | SHA-256 duplicate file rejection (409 Conflict) | Automated | `test_pilot_import.py::test_tc_dat_01_and_02_upload_and_deduplication` | PASSED |
| `TC-DAT-03` | Staging row schema validation & discrepancy detection | Automated | `test_pilot_import.py::test_tc_dat_03_and_04_discrepancy_flagging` | PASSED |
| `TC-DAT-04` | Duplicate cohort registration quarantine | Automated | `test_pilot_import.py::test_tc_dat_03_and_04_discrepancy_flagging` | PASSED |
| `TC-DAT-05` | Admin discrepancy resolution with mandatory logged reason | Automated | `test_pilot_import.py::test_tc_dat_05_discrepancy_resolution` | PASSED |
| `TC-DAT-06` | Batch commit triggers automatic CP-ABE hybrid encryption | Automated | `test_pilot_import.py::test_tc_dat_06_and_07_batch_commit_encryption_and_audit` | PASSED |
| `TC-DAT-07` | Append-only audit logging of import operations | Automated | `test_pilot_import.py::test_tc_dat_06_and_07_batch_commit_encryption_and_audit` | PASSED |
| `TC-DAT-08` | Measure M6: Ingestion throughput and processing latency | Automated | `test_pilot_import.py::test_tc_dat_08_measure_m6_ingestion_throughput` | PASSED |
| `TC-DAT-09` | Malformed Excel/CSV file upload resilience | Automated | `test_pilot_import.py::test_tc_dat_09_malformed_csv_resilience` | PASSED |
| `TC-DAT-10` | Role-gating: only Finance and Admin may upload | Automated | `test_pilot_import.py::test_tc_dat_10_role_gating_admin_only` | PASSED |
| `TC-DAT-11` | Company acronym normalization (e.g. Red Oak consolidation) | Automated | `test_pilot_import.py::test_tc_dat_11_company_code_resolution` | PASSED |
| `TC-DAT-12` | 100% reconciliation verification of pilot workbook | Automated | `test_pilot_import.py::test_phase3_excel_workbook_pilot_ingestion_and_100_percent_reconciliation` | PASSED |

---

### 8. Gamification Engine & PWA Security (TC-GAM-01 .. 20)
*Standard: Chapter III Section 3.6.6, SEC-26, Phase 6*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-GAM-01` | Server-side quiz scoring calculation | Automated | `test_gamification_pwa.py::test_tc_gam_01_server_side_scoring` | PASSED |
| `TC-GAM-02` | Client-submitted score tampering ignored | Automated | `test_gamification_pwa.py::test_tc_gam_02_client_score_tampering_ignored` | PASSED |
| `TC-GAM-03` | Idempotent attempt replay protection (anti-replay nonces) | Automated | `test_gamification_pwa.py::test_tc_gam_03_idempotent_attempt_replay` | PASSED |
| `TC-GAM-04` | Leaderboard pseudonymization (trainee nicknames only) | Automated | `test_gamification_pwa.py::test_tc_gam_04_leaderboard_nickname_pseudonymization` | PASSED |
| `TC-GAM-05` | XP calculation and level thresholds (100 XP per level) | Automated | `test_gamification_pwa.py::test_tc_gam_05_xp_and_level_progression` | PASSED |
| `TC-GAM-06` | Milestone badge awards (`FIRST_STEP`, `PERFECT_SCORE`) | Automated | `test_gamification_pwa.py::test_tc_gam_06_badge_unlock_evaluation` | PASSED |
| `TC-GAM-07` | Daily learning streak incrementation and reset | Automated | `test_gamification_pwa.py::test_tc_gam_07_learning_streak_calculation` | PASSED |
| `TC-GAM-08` | Real-time live quiz broadcast and answer collection | Automated | `test_gamification_pwa.py::test_tc_live_quiz_broadcast` | PASSED |
| `TC-GAM-09` | Answer correctness withheld until quiz closed (anti-cheat) | Automated | `test_gamification_pwa.py::test_tc_sec_26_withhold_correctness_until_closed` | PASSED |
| `TC-GAM-10` | Offline quiz submission sync upon reconnection | Automated | `test_backend_features_expanded.py::test_tc_gam_10_offline_quiz_sync` | PASSED |
| `TC-GAM-11` | Architectural diagram hotspot interactive verification | Automated | `test_backend_features_expanded.py::test_tc_gam_11_diagram_hotspot_eval` | PASSED |
| `TC-GAM-12` | Leaderboard scope filtering (cohort vs organization) | Automated | `test_backend_features_expanded.py::test_tc_gam_12_leaderboard_scope_filtering` | PASSED |
| `TC-GAM-13` | Multiple attempt score reconciliation (keep highest score) | Automated | `test_backend_features_expanded.py::test_tc_gam_13_highest_score_retention` | PASSED |
| `TC-GAM-14` | Quiz answer expiration window enforcement | Automated | `test_backend_features_expanded.py::test_tc_gam_14_quiz_time_limit_enforcement` | PASSED |
| `TC-GAM-15` | Trainee profile badge showcase privacy | Automated | `test_backend_features_expanded.py::test_tc_gam_15_badge_showcase_privacy` | PASSED |
| `TC-GAM-16` | Streak protection freeze consumable mechanic | Automated | `test_backend_features_expanded.py::test_tc_gam_16_streak_freeze_mechanic` | PASSED |
| `TC-GAM-17` | Cohort average performance aggregation | Automated | `test_backend_features_expanded.py::test_tc_gam_17_cohort_average_metrics` | PASSED |
| `TC-GAM-18` | Trainer live podium score push via SSE/WebSocket | Automated | `test_backend_features_expanded.py::test_tc_gam_18_live_podium_broadcast` | PASSED |
| `TC-GAM-19` | Quiz question randomization and option shuffling | Automated | `test_backend_features_expanded.py::test_tc_gam_19_question_randomization` | PASSED |
| `TC-GAM-20` | PWA manifest and service worker asset caching header check | Automated | `test_backend_features_expanded.py::test_tc_gam_20_service_worker_asset_headers` | PASSED |

---

### 9. Platform Security Controls, OWASP & Startup Guards (TC-SEC-01 .. 16)
*Standard: Chapter III Section 3.6.7, SEC-01..07, SEC-24, SEC-28*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-SEC-01` | OWASP `X-Content-Type-Options: nosniff` header | Automated | `test_security_headers_zap.py::test_tc_sec_01_to_05_owasp_security_headers` | PASSED |
| `TC-SEC-02` | OWASP `X-Frame-Options: DENY` header | Automated | `test_security_headers_zap.py::test_tc_sec_01_to_05_owasp_security_headers` | PASSED |
| `TC-SEC-03` | OWASP `X-XSS-Protection: 1; mode=block` header | Automated | `test_security_headers_zap.py::test_tc_sec_01_to_05_owasp_security_headers` | PASSED |
| `TC-SEC-04` | OWASP `Strict-Transport-Security: max-age=31536000` header | Automated | `test_security_headers_zap.py::test_tc_sec_01_to_05_owasp_security_headers` | PASSED |
| `TC-SEC-05` | OWASP `Referrer-Policy: strict-origin-when-cross-origin` | Automated | `test_security_headers_zap.py::test_tc_sec_01_to_05_owasp_security_headers` | PASSED |
| `TC-SEC-06` | Fail-closed Charm library startup guard in production | Automated | `test_thesis_compliance.py::test_fail_closed_production_charm_enforcement` | PASSED |
| `TC-SEC-07` | Production startup check refuses default `SECRET_KEY` | Automated | `test_thesis_compliance.py::test_fail_closed_production_insecure_secrets` | PASSED |
| `TC-SEC-08` | Production startup check refuses default signing secret | Automated | `test_thesis_compliance.py::test_fail_closed_production_insecure_secrets` | PASSED |
| `TC-SEC-09` | CORS middleware restricted strictly to PWA origins | Automated | `test_thesis_compliance.py::test_cors_middleware_restricted_origins` | PASSED |
| `TC-SEC-10` | Argon2id memory-hard password derivation parameters | Automated | `test_account_lifecycle.py::test_argon2_password_hashing` | PASSED |
| `TC-SEC-11` | Cross-site request forgery protection on state-changing paths | Automated | `test_account_lifecycle.py::test_csrf_protection_on_cookie_endpoints` | PASSED |
| `TC-SEC-12` | Signed application context tokens (HMAC-SHA256) | Automated | `test_rls_policies.py::test_signed_context_token_tampering` | PASSED |
| `TC-SEC-13` | Tampered context tokens rejected at API boundary | Automated | `test_rls_policies.py::test_signed_context_token_tampering` | PASSED |
| `TC-SEC-14` | Expired context tokens rejected at API boundary | Automated | `test_rls_policies.py::test_expired_context_rejected` | PASSED |
| `TC-SEC-15` | Billing and sales columns strictly stripped from imports | Automated | `test_pilot_import.py::test_phase3_sample_data_drops_sales_and_billing_fields` | PASSED |
| `TC-SEC-16` | Developer role switcher restricted to development builds | Automated | `test_backend_features_expanded.py::test_tc_sec_16_dev_switcher_restricted` | PASSED |

---

### 10. PostgreSQL Row-Level Security (RLS) Policies (TC-RLS-01 .. 21)
*Standard: Chapter III Section 3.6.2, Figure 8, Table 16*

| Test ID | Requirement | Verification Method | Automated Test / Procedure Reference | Result |
|:---|:---|:---:|:---|:---:|
| `TC-RLS-01` | Forced RLS (`FORCE ROW LEVEL SECURITY`) on `training_records` | Automated | `test_rls_policies.py::test_forced_rls_on_sensitive_tables` | PASSED |
| `TC-RLS-02` | Forced RLS on `user_abe_keys` | Automated | `test_rls_policies.py::test_forced_rls_on_sensitive_tables` | PASSED |
| `TC-RLS-03` | Forced RLS on `certificates` | Automated | `test_rls_policies.py::test_forced_rls_on_sensitive_tables` | PASSED |
| `TC-RLS-04` | Forced RLS on `access_logs` | Automated | `test_rls_policies.py::test_forced_rls_on_sensitive_tables` | PASSED |
| `TC-RLS-05` | Account Manager tenant isolation via `app.current_company_id` | Automated | `test_rls_policies.py::test_account_manager_rls_isolation` | PASSED |
| `TC-RLS-06` | Trainer assigned cohort isolation via session context | Automated | `test_rls_policies.py::test_trainer_rls_session_isolation` | PASSED |
| `TC-RLS-07` | Trainee own records filter via `app.current_trainee_id` | Automated | `test_rls_policies.py::test_trainee_rls_own_records_only` | PASSED |
| `TC-RLS-08` | Administrator and Finance cross-tenant RLS bypass | Automated | `test_rls_policies.py::test_admin_and_finance_cross_tenant_rls_access` | PASSED |
| `TC-RLS-09` | Unset session context defaults to zero rows returned | Automated | `test_rls_policies.py::test_empty_context_returns_empty_result` | PASSED |
| `TC-RLS-10` | Transaction-local context injection (`SET LOCAL`) | Automated | `test_rls_policies.py::test_transaction_local_context_injection` | PASSED |
| `TC-RLS-11` | Context leakage prevention across connection pooling | Automated | `test_rls_policies.py::test_transaction_local_context_injection` | PASSED |
| `TC-RLS-12` | User ABE keys RLS isolation (users read own key only) | Automated | `test_rls_policies.py::test_user_abe_keys_isolation_and_restricted_key_access` | PASSED |
| `TC-RLS-13` | Key decryption restricted to authorized owner context | Automated | `test_rls_policies.py::test_user_abe_keys_isolation_and_restricted_key_access` | PASSED |
| `TC-RLS-14` | Soft-deleted records hidden from standard queries | Automated | `test_backend_features_expanded.py::test_tc_rls_14_soft_deleted_records_hidden` | PASSED |
| `TC-RLS-15` | Audit logs write-only for standard application users | Automated | `test_backend_features_expanded.py::test_tc_rls_15_audit_logs_append_only` | PASSED |
| `TC-RLS-16` | Cross-client record insertion into foreign tenant blocked | Automated | `test_backend_features_expanded.py::test_tc_rls_16_foreign_tenant_insert_blocked` | PASSED |
| `TC-RLS-17` | Option B: AM permitted to view shared trainee record | Automated | `test_role_boundaries.py::test_tc_xcl_09_option_b_shared_trainee_cross_company_viewing_and_write_blocking` | PASSED |
| `TC-RLS-18` | Option B: AM blocked from modifying foreign tenant record | Automated | `test_role_boundaries.py::test_tc_xcl_09_option_b_shared_trainee_cross_company_viewing_and_write_blocking` | PASSED |
| `TC-RLS-19` | Client company users denied table access via RLS | Automated | `test_role_boundaries.py::test_tc_xcl_07_no_client_company_user_logins` | PASSED |
| `TC-RLS-20` | Database superuser vs non-superuser role boundary check | Automated | `test_rls_policies.py::test_forced_rls_on_sensitive_tables` | PASSED |
| `TC-RLS-21` | pgAudit statement logging configuration script integrity | Automated | `test_backend_features_expanded.py::test_tc_rls_21_pgaudit_script_syntax` | PASSED |

---

### 11. User Acceptance Testing & Stakeholder Procedures (TC-UAT-01 .. 07)
*Standard: Chapter III Section 3.8.3, Evaluation Procedure (Staged for Capstone Defense / UAT Execution)*

| Test ID | Stakeholder / Domain | Verification Method | Procedure / Operational Protocol | Status |
|:---|:---|:---:|:---|:---:|
| `TC-UAT-01` | Lead Trainer Cohort Evaluation | Manual UAT Task | End-to-end trainer sign-off, score entry, and certificate issuance | **STAGED (Instruments Ready)** |
| `TC-UAT-02` | Account Manager Roster Inspection | Manual UAT Task | Option B shared trainee multi-company credential viewing & write block | **STAGED (Instruments Ready)** |
| `TC-UAT-03` | Finance Reconciliation Workflow | Manual UAT Task | Pilot workbook upload, discrepancy quarantine & ReportLab PDF export | **STAGED (Instruments Ready)** |
| `TC-UAT-04` | Trainee Learning & Mobility | Manual UAT Task | PWA gamification quiz, XP progression, and cross-company history view | **STAGED (Instruments Ready)** |
| `TC-UAT-05` | Administrator Security Review | Manual UAT Task | Access Anomaly Review Desk, peer review two-man rule, and rule tuning | **STAGED (Instruments Ready)** |
| `TC-UAT-06` | Crossworks Operations Inspection | Manual UAT Task | Shared mailbox protocol (OI-29) and historical audit log export | **STAGED (Instruments Ready)** |
| `TC-UAT-07` | Capstone Panel Defense Demonstration | Formal Defense | Complete multi-client zero-trust workflow live walkthrough with panel | **PLANNED (For Defense Session)** |

---

## Traceability Verification Summary

- **Total Chapter III Table 17 Requirements:** 176
- **Automated Tests Implemented & Passing:** 169 (100% automated test execution pass rate)
- **Manual Operational Procedures Staged:** 7 (Structured UAT tasks defined in Appendix B; pending formal evaluation execution)
- **Automated Suite Execution Time:** ~18.2 seconds (Automated backend suite)

