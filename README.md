<div align="center">

# 🛡️ CrossQuest

### A Secure Multi-Client Training Record Management System
**with Ciphertext-Policy Attribute-Based Encryption and Access Anomaly Detection**

![React](https://img.shields.io/badge/React-PWA-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RLS-4169E1?logo=postgresql&logoColor=white)
![Charm-Crypto](https://img.shields.io/badge/Charm--Crypto-CP--ABE-6A1B9A)
![Security](https://img.shields.io/badge/ISO%2FIEC-27001%3A2022-blue)
![Quality](https://img.shields.io/badge/ISO%2FIEC-25010-orange)
![Status](https://img.shields.io/badge/status-capstone%20project-lightgrey)

*Capstone Project · College of Computing and Information Sciences · University of Makati*
*Developed for Crossworks Training and Consulting Corp.*

</div>

---

## 📖 Overview

Corporate training providers increasingly store sensitive learner data (assessment scores, certificates, and course completions) on shared platforms that serve many client organizations at once. Encrypted storage protects that data from outsiders, but it does not stop an authorized user from decrypting records beyond their intended scope, and it does not reveal unusual access patterns from a legitimate account.

**CrossQuest** closes that gap for Crossworks Training and Consulting Corp. It combines three complementary layers of protection with a trainee-focused progress platform:

| Layer | Technology | Purpose |
|---|---|---|
| **Ciphertext-level access control** | CP-ABE (Charm-Crypto) | Binds the decryption policy to each record, built from staff role, assigned client accounts, and clearance level |
| **Database-level access control** | PostgreSQL Row-Level Security | Defense-in-depth filtering of record visibility based on user attributes |
| **Monitoring** | Rule- and threshold-based anomaly detection | Flags suspicious access for administrator review |

---

## 🏗️ Architecture & Project Structure

```
CrossQuest/
├── docker-compose.yml              # Multi-container orchestration (PostgreSQL, FastAPI, React PWA)
├── .env.example                    # Sample environment configurations
├── .gitignore                      # Git ignore rules
│
├── backend/                        # FastAPI Server & Cryptographic Engine
│   ├── Dockerfile                  # Container build with PBC, GMP & Charm-Crypto
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # Root entrypoint
│   └── app/
│       ├── core/                   # Configuration, Database engine, Security/JWT
│       ├── models/                 # SQLAlchemy schemas (User, Trainee, TrainingRecord, etc.)
│       ├── schemas/                # Pydantic request/response models
│       ├── crypto/                 # CP-ABE engine (Waters11 / BSW07 scheme via Charm-Crypto)
│       ├── anomaly/                # Rule- & Threshold-based Anomaly Detection Engine
│       └── api/                    # RESTful endpoints (Auth, Trainees, Records, Gamification, Anomalies, Reports)
│
└── frontend/                       # React.js PWA Client
    ├── Dockerfile                  # Development container for frontend
    ├── package.json                # Dependencies & Vite scripts
    ├── vite.config.js              # Vite bundler configuration
    ├── index.html                  # Entry HTML with PWA tags
    └── src/                        # React components & UI logic
```

---

## 🔒 Core Security & Functional Modules

1. **Multi-Client Trainee Management**:
   - Company affiliation is an attribute of the attendee rather than separate siloed accounts.
   - Historical records retain the company attribute that was in effect at completion time to avoid mass re-encryption.

2. **Ciphertext-Policy Attribute-Based Encryption (CP-ABE)**:
   - Uses `Charm-Crypto` (BSW07 / Waters11 scheme) to embed policies directly into record ciphertexts.
   - Policy format: `(ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_ALPHA) OR ROLE:ADMIN`.
   - Built-in development fallback simulation for environments without C-pairing libraries.

3. **Access Anomaly Detection Engine**:
   - **Out-of-Scope Access**: Detects staff requesting records from non-assigned client accounts.
   - **Off-Hours Access**: Flags attempts outside business hours (08:00 - 19:00 UTC) or weekends.
   - **Repeated Failed Attempts**: Triggers alert when consecutive policy decryption failures exceed threshold.
   - **Abnormal Volume**: Flags burst access attempts within a sliding time window.

4. **Gamification & Progress Tracking**:
   - Tracks course status (`not_started`, `in_progress`, `completed`), assessment scores, quizzes, and renewal dates.
   - Awards XP points, levels, badges (`FIRST_STEP`, `QUIZ_MASTER`, `PERFECT_SCORE`), and leaderboards.

5. **Defense-in-Depth Row-Level Security (RLS)**:
   - Database-layer policies complementing ciphertext-level CP-ABE encryption.

---

## 🚀 Getting Started

### Option 1: Running with Docker (Recommended for Charm-Crypto)
Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running on your system, then run:

```bash
docker compose up --build
```

- **Frontend PWA**: `http://localhost:5173`
- **FastAPI Backend**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

---

### Option 2: Running Locally

#### 1. Backend:
```bash
# Activate your virtual environment
.\.venv\Scripts\Activate.ps1

# Start the FastAPI server
uvicorn app.main:app --app-dir backend --reload --port 8000
```

#### 2. Frontend:
```bash
cd frontend
npm run dev
```

---

## 🎯 Scope at a Glance

- **Pilot size:** 2 to 5 client companies (to be confirmed during requirements validation)
- **Users:** Internal Crossworks staff only; client companies receive reports and do not hold system accounts
- **Attribute authority:** Single authority managed by Crossworks
- **Anomaly detection:** Rule- and threshold-based, not machine learning
- **Test data:** Simulated or anonymized trainee data only

> **Out of scope:** blockchain-based multi-authority CP-ABE and machine-learning-based anomaly detection are identified as directions for future work.

---

## 📏 Evaluation Framework

CrossQuest is evaluated against:

- **ISO/IEC 25010:** functional suitability, performance efficiency, usability, reliability, and security
- **ISO/IEC 27001:2022:** selected controls for access control, cryptographic protection, logging and monitoring, and anomalous-access detection

---

## 👥 Proponents

| Name | Role |
|---|---|
| Jiyan Carl C. Polinio | Proponent |
| Kurt Luis E. Llanes | Proponent |
| Tracy Carmelo M. Del Villar | Proponent |

**Institution:** University of Makati, College of Computing and Information Sciences  
**Client / Setting:** Crossworks Training and Consulting Corp.

---

<div align="center">

*CrossQuest is an academic capstone project. All testing uses simulated or anonymized data.*

</div>
