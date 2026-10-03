export const INITIAL_STAFF_PROFILES = [
  {
    id: "ecfe6082-316b-4eef-afc6-4a8b1e42b5cd",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    role: "admin",
    clearance_level: 3,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    avatar: "🛡️"
  },
  {
    id: "0cfa35a8-71da-46fe-a29d-51dc263ddcf9",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    role: "crossworks_staff",
    clearance_level: 2,
    assigned_companies: ["CORP_ALPHA"],
    avatar: "💼"
  },
  {
    id: "482714e3-e9fe-4e02-8e29-2ada5cc9c17c",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    role: "trainer",
    clearance_level: 1,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    avatar: "🎓"
  },
  {
    id: "eefe3f5f-0d0b-4232-9e0f-5284726c5115",
    email: "patricia.hr@alpha-corp.ph",
    name: "Patricia Santos",
    role: "company_staff",
    clearance_level: 1,
    assigned_companies: ["CORP_ALPHA"],
    avatar: "🏢"
  },
  {
    id: "06fe154c-604c-4529-946d-618f7cf6519c",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    role: "trainee",
    clearance_level: 1,
    assigned_companies: ["CORP_ALPHA"],
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
    traineeEmail: "juan.delacruz@alpha-corp.ph",
    companyCode: "CORP_ALPHA",
    companyName: "San Miguel Conglomerate Holdings",
    courseName: "Information Security Management & Governance",
    status: "completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_ALPHA)",
    score: 94.5,
    payload: {
      traineeId: "TRN-9021",
      assessmentScore: "94.5%",
      practicalLab: "High Distinction (Vulnerability Remediation)",
      assessorNotes: "Demonstrated advanced understanding of security controls and internal audit protocols.",
      certificateHash: "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-102",
    traineeName: "Maria Clara",
    traineeEmail: "maria.clara@maya-fintech.ph",
    companyCode: "FINTECH_BETA",
    companyName: "Maya FinTech Digital Innovations",
    courseName: "Privacy Information Management & GDPR",
    status: "completed",
    completionDate: "2026-09-02",
    encryptionPolicy: "(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:FINTECH_BETA)",
    score: 88.0,
    payload: {
      traineeId: "TRN-9088",
      assessmentScore: "88.0%",
      practicalLab: "Pass with Merit (Data Mapping & Consent Flow)",
      assessorNotes: "Completed comprehensive privacy impact assessment simulation for high-risk payment APIs.",
      certificateHash: "SHA256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-103",
    traineeName: "Gabriel Ramos",
    traineeEmail: "g.ramos@ayala-retail.ph",
    companyCode: "RETAIL_GAMMA",
    companyName: "Ayala Retail Omnichannel Corp",
    courseName: "Corporate Threat Modeling & Incident Handling",
    status: "in_progress",
    completionDate: null,
    encryptionPolicy: "(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:RETAIL_GAMMA)",
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
    traineeEmail: "beatrice.tan@alpha-corp.ph",
    companyCode: "CORP_ALPHA",
    companyName: "San Miguel Conglomerate Holdings",
    courseName: "DevSecOps Pipeline Security & CI/CD Guardrails",
    status: "completed",
    completionDate: "2026-09-28",
    encryptionPolicy: "(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_ALPHA)",
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
    timestamp: "2026-10-03 14:18:22",
    type: "OUT_OF_SCOPE",
    severity: "HIGH",
    userEmail: "marcus.am@crossworks.ph",
    userName: "Marcus Reyes",
    description: "Account Manager (Alpha) attempted to decrypt training records belonging to 'FINTECH_BETA'.",
    targetRecord: "rec-102 (Maria Clara)",
    status: "UNREVIEWED"
  },
  {
    id: "alert-002",
    timestamp: "2026-10-02 23:44:11",
    type: "OFF_HOURS",
    severity: "MEDIUM",
    userEmail: "david.trainer@crossworks.ph",
    userName: "David Lim",
    description: "Decryption request dispatched outside authorized operating window (23:44 UTC).",
    targetRecord: "rec-101 (Juan Dela Cruz)",
    status: "UNREVIEWED"
  },
  {
    id: "alert-003",
    timestamp: "2026-10-01 19:12:05",
    type: "REPEATED_FAILED_ATTEMPTS",
    severity: "HIGH",
    userEmail: "elena.am@crossworks.ph",
    userName: "Elena Santos",
    description: "3 consecutive access authorization rejections detected within 4 minutes.",
    targetRecord: "rec-104 (Beatrice Tan)",
    status: "RESOLVED"
  }
];

export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "In modern attribute-based access control, how is data protected to ensure zero-trust security?",
    options: [
      "In the central database user table",
      "Directly within the encrypted data payload and access policy",
      "Inside the client's session cookie",
      "In an external OAuth token provider"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Attribute-based policies are embedded directly with the encrypted records so that only users with matching authorized organization credentials can view the payload."
  },
  {
    id: 2,
    question: "When a trainee transitions between client companies, how does CrossQuest avoid mass re-encryption?",
    options: [
      "By deleting older records",
      "By maintaining the company attribute in effect at the time the training was completed",
      "By converting all past records to public access",
      "By reissuing a single master key to all staff"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Each training record retains the company attribute active at completion time, preserving historical data isolation without requiring bulk re-encryption."
  },
  {
    id: 3,
    question: "Which of the following describes the role of Multi-Tenant Isolation in CrossQuest?",
    options: [
      "It replaces the need for encryption entirely",
      "It acts as a defense-in-depth database filter preventing cross-client data leaks",
      "It generates gamification badges",
      "It handles client-side caching in the service worker"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Multi-tenant isolation operates at the database and application layers to filter visible records, guaranteeing complete privacy between corporate clients."
  },
  {
    id: 4,
    question: "What anomaly condition is triggered when a staff member attempts to decrypt records outside their assigned client portfolio?",
    options: [
      "OFF_HOURS",
      "OUT_OF_SCOPE",
      "ABNORMAL_VOLUME",
      "BUFFER_OVERFLOW"
    ],
    answer: 1,
    correctAnswer: 1,
    explanation: "Attempting to access client records outside of an assigned portfolio triggers an OUT_OF_SCOPE alert for immediate compliance review."
  }
];

