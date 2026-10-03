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

## ✨ Key Features

### 🔐 Security
- **Fine-grained CP-ABE encryption.** Only staff whose attributes satisfy a record's policy can decrypt it, wherever the ciphertext is stored or copied.
- **Attribute and access-policy management.** Administrators issue, modify, and revoke staff attributes as roles and client assignments change.
- **Access anomaly detection.** Rules cover:
  - Out-of-scope decryption attempts
  - Off-hours access
  - Repeated failed attempts
  - Abnormally high record-access volume
- **Row-Level Security (RLS).** A second enforcement layer at the database.
- **Time-aware company attribution.** Each record keeps the company attribute in effect when the training was completed, so historical records never need re-encryption when an attendee changes client companies.

### 📊 Training Management
- **Multi-client trainee and training-record management.** Company affiliation is an attribute of the attendee, not a separate client login.
- **Per-trainee progress tracking.** Shows courses in progress, completed, or not started, plus score history across attempts.
- **Certification lifecycle tracking.** Covers issue and expiry dates, with flags for certifications nearing renewal.
- **Company-specific reporting.** Crossworks generates reports for each client company, with no direct client access to the system.

### 🎮 Engagement
- **Gamification.** Quizzes, points, badges, and leaderboards layered on the core progress-tracking system.
- **Installable, offline-capable PWA.** Built with Service Workers and a Web App Manifest, so records and progress remain accessible under intermittent connectivity.

---

## 🏗️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | React.js, Service Workers, Web App Manifest (Progressive Web App) |
| **Backend** | Python, FastAPI (RESTful API) |
| **Database** | PostgreSQL with Row-Level Security |
| **Cryptography** | Charm-Crypto (Ciphertext-Policy Attribute-Based Encryption) |
| **Transport Security** | HTTPS / TLS |
| **Cloud Deployment** | AWS / Azure / GCP: VPC isolation, security groups, encrypted storage, managed database, and compute instances for FastAPI and CP-ABE operations |

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
