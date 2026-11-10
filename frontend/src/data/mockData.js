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
    role: "account_manager",
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
    role: "finance",
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
    id: "rec-pilot-001",
    traineeName: "Andrea Aguilar",
    traineeEmail: "andrea.aguilar@vertiv.com",
    companyCode: "VHL_2",
    companyName: "Vertiv (Singapore) Holdings PTE LTD-ROHQ",
    courseName: "Supervisory Upskilling Program for Excellent",
    status: "completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTVHL_2V1) or (ROLETRAINER and TRAININGSESS2026SUP02V1) or TRAINEETRN8000",
    score: 85.0,
    payload: {
      traineeId: "TRN-8000",
      assessmentScore: "85.0%",
      practicalLab: "High Distinction (Leadership & People Operations)",
      assessorNotes: "Demonstrated exemplary leadership and team coordination capabilities.",
      certificateHash: "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-pilot-002",
    traineeName: "Ricardo Ocampo",
    traineeEmail: "ricardo.ocampo@iproyal.com",
    companyCode: "IPROY_SERVI_2",
    companyName: "IPRoyal Services FZE LLC",
    courseName: "Supervisory Upskilling Program for Excellent",
    status: "completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTIPROY_SERVI_2V1) or (ROLETRAINER and TRAININGSESS2026SUP02V1) or TRAINEETRN8001",
    score: 88.7,
    payload: {
      traineeId: "TRN-8001",
      assessmentScore: "88.7%",
      practicalLab: "Pass with Merit (Operational Execution & Escalation)",
      assessorNotes: "Completed comprehensive supervisory simulation with high fidelity.",
      certificateHash: "SHA256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-pilot-003",
    traineeName: "Bea Macaraeg",
    traineeEmail: "bea.macaraeg@iproyal.com",
    companyCode: "IPROY_SERVI_2",
    companyName: "IPRoyal Services FZE LLC",
    courseName: "Supervisory Upskilling Program for Excellent",
    status: "completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTIPROY_SERVI_2V1) or (ROLETRAINER and TRAININGSESS2026SUP02V1) or TRAINEETRN8002",
    score: 92.4,
    payload: {
      traineeId: "TRN-8002",
      assessmentScore: "92.4%",
      practicalLab: "High Distinction (Continuous Process Improvement)",
      assessorNotes: "Exemplary evaluation in performance tracking and milestone reporting.",
      certificateHash: "SHA256:d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
      isOfficialCredential: true
    }
  },
  {
    id: "rec-pilot-010",
    traineeName: "Jerome Enriquez",
    traineeEmail: "jenriquez@redoakproperties.com.ph",
    companyCode: "ROP_3",
    companyName: "Red Oak Properties Inc.",
    courseName: "Supervisory Upskilling Program for Excellent",
    status: "completed",
    completionDate: "2026-08-15",
    encryptionPolicy: "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTROP_3V1) or (ROLETRAINER and TRAININGSESS2026SUP02V1) or TRAINEETRN8009",
    score: 88.3,
    payload: {
      traineeId: "TRN-8009",
      assessmentScore: "88.3%",
      practicalLab: "Pass with Merit (Operational Resource Management)",
      assessorNotes: "Consistently delivered milestones and met all operational metrics.",
      certificateHash: "SHA256:4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123",
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

