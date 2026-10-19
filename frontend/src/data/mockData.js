/**
 * Mock Data for CrossQuest Front-End
 * Conforms to Chapter I & III specifications:
 * - 5 Roles: Administrator, Account Manager, Finance, Trainer, Trainee (No client accounts, FR-01)
 * - Zero Clearance Levels (SEC-11)
 * - Hybrid CP-ABE Alphanumeric Policies (DD-01, DD-04, VR-24)
 * - Anomaly Rules R1-R4 + S1 After-Hours Supporting Indicator (Table 20)
 * - 5 Reference Certifications with 36 Months Validity (FR-18)
 */

export const INITIAL_STAFF_PROFILES = [
  {
    id: "ecfe6082-316b-4eef-afc6-4a8b1e42b5cd",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    role: "admin",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    avatar: "🛡️"
  },
  {
    id: "0cfa35a8-71da-46fe-a29d-51dc263ddcf9",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    role: "account_manager",
    assigned_companies: ["CORP_ALPHA"],
    avatar: "💼"
  },
  {
    id: "5ee8dfe9-83a8-45bb-9ab7-8684cacbe7cd",
    email: "elena.santos@crossworks.ph",
    name: "Elena Santos",
    role: "finance",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    avatar: "📊"
  },
  {
    id: "482714e3-e9fe-4e02-8e29-2ada5cc9c17c",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    role: "trainer",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    avatar: "🎓"
  },
  {
    id: "06fe154c-604c-4529-946d-618f7cf6519c",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    role: "trainee",
    assigned_companies: ["CORP_ALPHA"],
    trainee_code: "TRN-9021",
    display_name: "CyberKnight9021",
    avatar: "🎒"
  }
];

export const CLIENT_COMPANIES = [
  {
    code: "CORP_ALPHA",
    name: "San Miguel Conglomerate Holdings",
    industry: "Conglomerate & Industrial",
    activeLearners: 142
  },
  {
    code: "FINTECH_BETA",
    name: "Maya FinTech Digital Innovations",
    industry: "Financial Services & Banking",
    activeLearners: 98
  },
  {
    code: "RETAIL_GAMMA",
    name: "Ayala Retail Omnichannel Corp",
    industry: "Retail & Supply Chain",
    activeLearners: 64
  }
];

export const INITIAL_TRAINING_RECORDS = [
  {
    id: "rec-101",
    traineeName: "Juan Dela Cruz",
    traineeCode: "TRN-9021",
    traineeEmail: "juan.delacruz@alpha-corp.ph",
    companyCode: "CORP_ALPHA",
    companyName: "San Miguel Conglomerate Holdings",
    courseName: "Information Security Management & Governance",
    status: "Completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or (ROLETRAINER and TRAININGSESS202608AV1) or TRAINEETRN9021",
    score: 94.5,
    payload: {
      traineeId: "TRN-9021",
      assessmentScore: "94.5%",
      practicalLab: "High Distinction (Vulnerability Remediation)",
      assessorNotes: "Demonstrated advanced understanding of ISO 27001 controls and internal audit protocols.",
      certificateHash: "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-102",
    traineeName: "Maria Clara",
    traineeCode: "TRN-9088",
    traineeEmail: "maria.clara@maya-fintech.ph",
    companyCode: "FINTECH_BETA",
    companyName: "Maya FinTech Digital Innovations",
    courseName: "PMP Exam Review & Agile Project Delivery",
    status: "Completed",
    completionDate: "2026-09-02",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTFINTECHBETAV1) or TRAINEETRN9088",
    score: 88.0,
    payload: {
      traineeId: "TRN-9088",
      assessmentScore: "88.0%",
      practicalLab: "Pass with Merit (Sprint Governance & Risk Register)",
      assessorNotes: "Completed comprehensive Agile project management simulation for high-risk payment APIs.",
      certificateHash: "SHA256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-103",
    traineeName: "Gabriel Ramos",
    traineeCode: "TRN-9114",
    traineeEmail: "g.ramos@ayala-retail.ph",
    companyCode: "RETAIL_GAMMA",
    companyName: "Ayala Retail Omnichannel Corp",
    courseName: "Corporate Threat Modeling & Incident Handling",
    status: "In progress",
    completionDate: null,
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTRETAILGAMMAV1) or TRAINEETRN9114",
    score: 72.0,
    payload: {
      traineeId: "TRN-9114",
      assessmentScore: "72.0% (Interim)",
      practicalLab: "In Progress (Module 4 of 6)",
      assessorNotes: "Midterm evaluation passed. Final capstone defense scheduled for Q4.",
      certificateHash: "PENDING_COURSE_COMPLETION",
      isOfficialCredential: false
    }
  },
  {
    id: "rec-104",
    traineeName: "Beatrice Tan",
    traineeCode: "TRN-9045",
    traineeEmail: "beatrice.tan@alpha-corp.ph",
    companyCode: "CORP_ALPHA",
    companyName: "San Miguel Conglomerate Holdings",
    courseName: "DevSecOps Pipeline Security & CI/CD Guardrails",
    status: "Completed",
    completionDate: "2026-09-28",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9045",
    score: 98.0,
    payload: {
      traineeId: "TRN-9045",
      assessmentScore: "98.0%",
      practicalLab: "Perfect Score (Automated SAST/DAST Gate Setup)",
      assessorNotes: "Exemplary capstone project on software supply chain security.",
      certificateHash: "SHA256:d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
      isOfficialCredential: true
    }
  }
];

export const INITIAL_ANOMALIES = [
  {
    id: "alert-001",
    timestamp: "2026-10-18 14:18:22",
    ruleCode: "R1_OUT_OF_SCOPE",
    severity: "LOW",
    userEmail: "marcus.reyes@crossworks.ph",
    userName: "Marcus Reyes",
    description: "Account Manager attempted to access training records belonging to 'FINTECH_BETA'.",
    targetRecord: "rec-102 (Maria Clara)",
    status: "NEW",
    eventCount: 1,
    tags: []
  },
  {
    id: "alert-002",
    timestamp: "2026-10-18 23:44:11",
    ruleCode: "R4_RECORD_DELETION",
    severity: "CRITICAL", // Elevated from HIGH due to after-hours tag S1
    userEmail: "david.lim@crossworks.ph",
    userName: "David Lim",
    description: "Training record deletion attempt outside standard operating hours (23:44 PHT).",
    targetRecord: "rec-103 (Gabriel Ramos)",
    status: "UNDER_REVIEW",
    eventCount: 1,
    tags: ["after_hours"]
  },
  {
    id: "alert-003",
    timestamp: "2026-10-17 19:12:05",
    ruleCode: "R1_REPEATED_OUT_OF_SCOPE",
    severity: "MEDIUM",
    userEmail: "marcus.reyes@crossworks.ph",
    userName: "Marcus Reyes",
    description: "3 consecutive out-of-scope access attempts detected within 15 minutes.",
    targetRecord: "rec-102, rec-103",
    status: "CLOSED",
    disposition: "CLOSED_EXPECTED_ACTIVITY",
    reviewNote: "Verified with client: Marcus was consulting during client transition period.",
    eventCount: 3,
    tags: []
  }
];

export const INITIAL_CERTIFICATIONS = [
  {
    id: "cert-001",
    traineeId: "TRN-9021",
    traineeName: "Juan Dela Cruz",
    certTypeCode: "ISO_31000",
    title: "ISO 31000 Certified Risk Manager",
    companyCode: "CORP_ALPHA",
    issueDate: "2026-08-15",
    expiryDate: "2029-08-15",
    validityMonths: 36,
    status: "Valid",
    isNearingRenewal: false
  },
  {
    id: "cert-002",
    traineeId: "TRN-9088",
    traineeName: "Maria Clara",
    certTypeCode: "PMP",
    title: "Project Management Professional (PMP)",
    companyCode: "FINTECH_BETA",
    issueDate: "2023-11-20",
    expiryDate: "2026-11-20",
    validityMonths: 36,
    status: "Expiring soon",
    isNearingRenewal: true,
    daysRemaining: 32
  }
];

export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "In modern Ciphertext-Policy Attribute-Based Encryption (CP-ABE), how is data access cryptographically enforced?",
    options: [
      "Through user table row queries in an external relational database",
      "Directly within the ciphertext payload and access policy tree",
      "Inside the client's session cookie and local storage",
      "Via third-party API gateway tokens"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "CP-ABE embeds the mathematical access policy directly into the ciphertext so only private keys matching the attribute policy can decrypt it."
  },
  {
    id: 2,
    question: "When a trainee transitions between client companies, how does CrossQuest avoid mass record re-encryption?",
    options: [
      "By deleting older records",
      "By maintaining the client company affiliation in effect at the time of each training",
      "By converting past records to unencrypted public storage",
      "By reissuing a single master key to all staff"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Each training record retains the company affiliation in effect when the training occurred, allowing trainees to see their full cross-company history while isolating clients."
  },
  {
    id: 3,
    question: "According to the security architecture, which of the following is true about access outside normal working hours (Rule S1)?",
    options: [
      "It triggers an immediate High alert and locks the user account",
      "It is a supporting indicator only and NEVER creates an alert on its own",
      "It automatically revokes the staff member's CP-ABE private key",
      "It blocks database connection pooling"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Because Crossworks personnel commonly work off-hours and weekends, access outside regular hours alone is not suspicious and acts only as a supporting indicator (SEC-16)."
  },
  {
    id: 4,
    question: "What permissions do Account Managers have over training records in CrossQuest?",
    options: [
      "Full add, edit, and deletion rights across all client companies",
      "Add records for assigned clients only; cannot edit or delete records",
      "Read-only access with no add or report generation capability",
      "Administer CP-ABE master authority keys"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Under the least-privilege role matrix (Table 16), Account Managers may view and add records for their assigned clients, but deletion is reserved for Administrators and editing is limited to Admin/Finance."
  }
];
