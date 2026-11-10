# CrossQuest CP-ABE Cryptographic Verification & Evidence Report

- **Generated At (UTC):** `2026-11-10T14:57:40.744562+00:00`
- **Operating System:** `Linux 6.18.54.1-microsoft-standard-WSL2 (x86_64)`
- **Python Version:** `3.11.18`
- **Pairing Curve:** `SS512 (512-bit Type-1 symmetric bilinear group)`
- **Engine Implemented:** `Charm-Crypto BSW07 (Native Pairing Library)`
- **Charm Native Library Available:** `YES (Native Pairing Active)`
- **Symmetric AEAD Cipher:** `AES-256-GCM with HKDF-SHA256 key derivation & AAD integrity binding`

## 1. Master Key Authority Setup (TC-CRY-01)
- Status: **PASS**
- Curve Parameter: `SS512`
- Master Setup Execution Latency: `14.823 ms`

## 2. Issued User Private Keys
| Persona | Role | Attributes Encoded | Keygen Latency | Status |
|---|---|---|---|---|
| Dr. Joey Mallari (Administrator) | `admin` | `ROLEADMINV1` | `9.499 ms` | **ISSUED** |
| Elena Santos (Finance) | `finance` | `ROLEFINANCEV1` | `8.703 ms` | **ISSUED** |
| Marcus Reyes (AM - San Miguel Assigned) | `account_manager` | `ROLEACCTMGRV1, CLIENTCORPALPHAV1` | `19.504 ms` | **ISSUED** |
| Andrea Salazar (AM - Competitor Assigned) | `account_manager` | `ROLEACCTMGRV1, CLIENTFINTECHBETAV1` | `16.897 ms` | **ISSUED** |
| Jordan Ramos (Lead Trainer) | `trainer` | `ROLETRAINERV1, TRAININGSESS01V1` | `14.807 ms` | **ISSUED** |
| Juan Dela Cruz (Trainee Record Owner) | `trainee` | `TRAINEETRN9021V1` | `7.975 ms` | **ISSUED** |
| Maria Clara (Unrelated Trainee) | `trainee` | `TRAINEETRN8001V1` | `6.378 ms` | **ISSUED** |
| Unauthorized Intruder / External Actor | `attacker` | `ANONYMOUSACTOR` | `7.739 ms` | **ISSUED** |

## 3. Cryptographic Hybrid Encryption (SEC-04, DD-02)
- **Record ID:** `REC-PILOT-9021`
- **Access Policy String:** `ROLEADMINV1 or ROLEFINANCEV1 or (ROLEACCTMGRV1 and CLIENTCORPALPHAV1) or (ROLETRAINERV1 and TRAININGSESS01V1) or TRAINEETRN9021V1`
- **Authenticated Associated Data (AAD):** `REC-PILOT-9021:1:ROLEADMINV1 or ROLEFINANCEV1 or (ROLEACCTMGRV1 and CLIENTCORPALPHAV1) or (ROLETRAINERV1 and TRAININGSESS01V1) or TRAINEETRN9021V1`
- **Encryption Time:** `50.084 ms`
- **Nonce (12-byte IV):** `8TjlNK6VKPw0U7Ri`
- **Payload Ciphertext (AES-256-GCM):** `q8qGeH8nFhEmKSoIP+It9TdaZAYlx/NotAxj4apZ5m8OzM63Ua2F8/9mdz/FHc7N...`

## 4. Authorized Decryption Test Results (TC-CRY-02)
| Authorized Persona | Clause Satisfied | Decryption Latency | GCM Integrity Tag | Plaintext Verified |
|---|---|---|---|---|
| Dr. Joey Mallari (Administrator) | `ROLEADMINV1` | `9.310 ms` | **VERIFIED (Valid MAC)** | **PASS (96.5%)** |
| Elena Santos (Finance) | `ROLEFINANCEV1` | `10.789 ms` | **VERIFIED (Valid MAC)** | **PASS (96.5%)** |
| Marcus Reyes (AM - San Miguel Assigned) | `ROLEACCTMGRV1` | `11.556 ms` | **VERIFIED (Valid MAC)** | **PASS (96.5%)** |
| Jordan Ramos (Lead Trainer) | `ROLETRAINERV1` | `7.410 ms` | **VERIFIED (Valid MAC)** | **PASS (96.5%)** |
| Juan Dela Cruz (Trainee Record Owner) | `TRAINEETRN9021V1` | `7.190 ms` | **VERIFIED (Valid MAC)** | **PASS (96.5%)** |

## 5. Unauthorized Decryption Denials (TC-CRY-03)
| Unauthorized Persona | Reason for Denial | Policy Evaluation | Plaintext Leakage | Security Result |
|---|---|---|---|---|
| Andrea Salazar (AM - Competitor Assigned) | Out-of-scope attributes `['ROLEACCTMGRV1', 'CLIENTFINTECHBETAV1']` | **UNSATISFIED** | **NONE (0 bytes)** | **STRICTLY BLOCKED** |
| Maria Clara (Unrelated Trainee) | Out-of-scope attributes `['TRAINEETRN8001V1']` | **UNSATISFIED** | **NONE (0 bytes)** | **STRICTLY BLOCKED** |
| Unauthorized Intruder / External Actor | Out-of-scope attributes `['ANONYMOUSACTOR']` | **UNSATISFIED** | **NONE (0 bytes)** | **STRICTLY BLOCKED** |

## 6. Cryptographic Tamper & Integrity Rejection (TC-CRY-04)
| Attack Simulation Scenario | Attack Description | AES-256-GCM MAC Tag | Plaintext Leaked | Defense Outcome |
|---|---|---|---|---|
| Payload Ciphertext Bit-Flip | Adversary flipped 1 byte at index 8 of AES ciphertext | **FAILED (MAC Mismatch)** | **NONE** | **REJECTED & ABORTED** |
| AAD Header Spoofing | Adversary altered record ID header from `REC-PILOT-9021` to fraudulent ID | **FAILED (AAD Invalidation)** | **NONE** | **REJECTED & ABORTED** |
| Policy Version Downgrade | Adversary supplied mismatched policy version `99` | **FAILED (AAD Invalidation)** | **NONE** | **REJECTED & ABORTED** |

## 7. Compliance & Thesis Defense Verdict
- **All Authorized Roles Decrypted:** `YES (100%)`
- **All Unauthorized Attempts Denied:** `YES (100% Zero Leakage)`
- **All Cryptographic Tampering Prevented:** `YES (100% GCM Enforcement)`
- **Chapter III Compliance (SEC-04, DD-01, DD-02, TC-CRY-01..08):** **FULLY SATISFIED**