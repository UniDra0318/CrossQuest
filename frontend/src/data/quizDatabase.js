// CrossQuest Enterprise Learning Quiz Database
// Contains real, industry-aligned course quizzes with diverse question types:
// 1. multiple_choice (Kahoot 4-tile)
// 2. identification (Direct term input)
// 3. sequence_order (Interactive step reordering)
// 4. diagram_analysis (Visual architectural diagram hotspot analysis)

export const QUIZ_DATABASE = {
  'act-1': {
    id: 'act-1',
    title: 'Agile PME & Project Management Challenge',
    instructor: 'Lead Trainer Joey Ramos',
    category: 'Project Management',
    headerColor: '#1368ce',
    timePerQuestion: 45, // seconds
    passingScore: 80,
    badgeAwarded: 'sec_champ',
    description: 'Master Agile Project Management and PME methodologies. Evaluate project critical paths, agile sprint governance, and earned value metrics under the Crossworks curriculum.',
    learningObjectives: [
      'Master Agile frameworks, sprint planning, and daily standup workflows',
      'Analyze Critical Path Method (CPM) and Earned Value Management (EVM)',
      'Inspect retrospective adaptation pipelines and continuous improvement'
    ],
    questions: [
      {
        id: 'q1-1',
        type: 'multiple_choice',
        question: 'In modern attribute-based access control, how is data protected to guarantee zero-trust confidentiality?',
        options: [
          'In the central database user table',
          'Directly within the encrypted data payload and access policy',
          'Inside the client session cookie',
          'In an external OAuth token provider'
        ],
        correctAnswer: 1,
        explanation: 'Attribute-based access policies are embedded directly with the encrypted records so that only authorized users with matching attributes can decrypt the ciphertext.'
      },
      {
        id: 'q1-2',
        type: 'identification',
        question: 'Identify the security model that requires all users and services inside or outside the network to be continuously authenticated and authorized before gaining access. (Hint: 2 words)',
        acceptedAnswers: ['zero trust', 'zero-trust', 'zero trust architecture', 'zta'],
        placeholder: 'Type the security model name...',
        explanation: 'Zero Trust operates on the principle of "never trust, always verify", requiring continuous cryptographic validation regardless of network location.'
      },
      {
        id: 'q1-3',
        type: 'sequence_order',
        question: 'Arrange the 4 steps of the Cryptographic Audit & Decryption Pipeline in the correct operational sequence:',
        correctOrder: [
          'Ingest encrypted payload and policy descriptor from repository',
          'Verify user cryptographic attribute credentials and active role',
          'Evaluate boolean attribute policy satisfaction tree',
          'Decrypt plaintext payload and log access event to audit trail'
        ],
        initialOrder: [
          'Evaluate boolean attribute policy satisfaction tree',
          'Ingest encrypted payload and policy descriptor from repository',
          'Decrypt plaintext payload and log access event to audit trail',
          'Verify user cryptographic attribute credentials and active role'
        ],
        explanation: 'The pipeline must first ingest the encrypted record, verify the user attributes, test policy satisfaction, and finally decrypt while recording an immutable audit log.'
      },
      {
        id: 'q1-4',
        type: 'diagram_analysis',
        question: 'Analyze the CrossQuest Architecture Diagram below. If an unauthorized actor bypasses the API Gateway, which layer prevents them from decrypting other client data?',
        diagramType: 'security_pipeline',
        options: [
          'Multi-Tenant Row-Level Security',
          'CP-ABE Payload Encryption with Cryptographic Isolation',
          'Browser Local Storage',
          'DNS Edge Resolver'
        ],
        correctAnswer: 1,
        explanation: 'Even if network perimeter defenses are compromised, CP-ABE ciphertext encryption prevents unauthorized deciphering without the exact matching corporate secret keys.'
      },
      {
        id: 'q1-5',
        type: 'multiple_choice',
        question: 'What access anomaly is automatically logged when an account manager assigned to CORP_ALPHA attempts to access records belonging to FINTECH_BETA?',
        options: [
          'OFF_HOURS',
          'OUT_OF_SCOPE',
          'ABNORMAL_VOLUME',
          'KEY_REVOCATION'
        ],
        correctAnswer: 1,
        explanation: 'An OUT_OF_SCOPE event is logged when a user attempts access to records belonging to a corporate tenant outside their assigned client account portfolio.'
      },
      {
        id: 'q1-6',
        type: 'matching',
        question: 'Match each Security Architecture Component in Column A with its exact Enterprise Function in Column B:',
        pairs: [
          { id: 'm1-1', left: 'CP-ABE Ciphertext Encryption', right: 'Cryptographic policy tree bound directly to payload' },
          { id: 'm1-2', left: 'API Perimeter Gateway', right: 'OAuth JWT bearer verification at network edge' },
          { id: 'm1-3', left: 'Row-Level Security (RLS)', right: 'Direct database-layer tenant record filtering' },
          { id: 'm1-4', left: 'Anomaly Daemon Monitor', right: 'Automated detection of off-hours & query bursts' }
        ],
        explanation: 'CP-ABE binds policies to data, API Gateways guard perimeter ingress, RLS isolates SQL rows by tenant, and Anomaly Daemons detect behavioral spikes.'
      },
      {
        id: 'q1-7',
        type: 'identification',
        question: 'What cryptographic primitive produces an immutable, fixed-size mathematical digest used to audit-proof security event records? (Hint: 2 words or standard acronym)',
        acceptedAnswers: ['cryptographic hash', 'hash function', 'sha-256', 'sha256', 'hash', 'hashing'],
        placeholder: 'Type the cryptographic term...',
        explanation: 'SHA-256 cryptographic hashes produce unique fixed-length digests ensuring tamper-evident verification of audit logs.'
      },
      {
        id: 'q1-8',
        type: 'multiple_choice',
        question: 'Under the Principle of Least Privilege, how should personnel roles be structured across enterprise systems?',
        options: [
          'Users are granted access exclusively to the specific resources and actions required for their role',
          'Every authenticated staff member receives administrative query access by default',
          'Access permissions are determined entirely by network IP addresses without authentication',
          'All staff share a single master decryption key for operational efficiency'
        ],
        correctAnswer: 0,
        explanation: 'Least Privilege dictates that users and services are granted only the minimum permissions necessary to perform their assigned business duties.'
      }
    ]
  },

  'act-2': {
    id: 'act-2',
    title: 'Executive Communication & CONNECT Simulation',
    instructor: 'Lead Trainer Billy Fernandez',
    category: 'Executive Leadership',
    headerColor: '#059669',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'crypto_knight',
    description: 'Simulate executive-level communication and high-impact stakeholder negotiations under the Crossworks CONNECT framework. Master the Pyramid Principle and strategic dialogues.',
    learningObjectives: [
      'Master the CONNECT framework for high-stakes executive negotiations',
      'Structure executive briefings using the Pyramid Principle',
      'Deploy active listening and reflective paraphrasing across multi-tenant cohorts'
    ],
    questions: [
      {
        id: 'q2-1',
        type: 'multiple_choice',
        question: 'What clearance level is strictly required to modify staff attribute assignments in the Master Attribute Authority?',
        options: [
          'Level 1 (Standard Trainee)',
          'Level 2 (Account Manager)',
          'Level 3 (Security Administrator)',
          'Any authenticated staff member'
        ],
        correctAnswer: 2,
        explanation: 'Level 3 Administrator privileges are required to issue, modify, or revoke cryptographic attributes and company account assignments.'
      },
      {
        id: 'q2-2',
        type: 'identification',
        question: 'What 4-letter acronym represents the access control paradigm where decisions are evaluated against user roles, clearance levels, and tenant attributes? (Hint: ABAC)',
        acceptedAnswers: ['abac', 'attribute-based access control', 'attribute based access control'],
        placeholder: 'Enter 4-letter acronym...',
        explanation: 'ABAC (Attribute-Based Access Control) grants permissions based on attributes assigned to users, resources, and environmental conditions.'
      },
      {
        id: 'q2-3',
        type: 'sequence_order',
        question: 'Order the 4 stages of the Staff Cryptographic Key Provisioning Lifecycle:',
        correctOrder: [
          'Administrator verifies staff identity, role, and clearance level',
          'Assign authorized corporate client accounts to user profile',
          'Master Authority computes attribute-based private key',
          'Staff securely receives private key to decrypt assigned records'
        ],
        initialOrder: [
          'Master Authority computes attribute-based private key',
          'Staff securely receives private key to decrypt assigned records',
          'Administrator verifies staff identity, role, and clearance level',
          'Assign authorized corporate client accounts to user profile'
        ],
        explanation: 'Credentials must be verified and company accounts assigned before the Master Authority can compute and dispatch the private key.'
      },
      {
        id: 'q2-4',
        type: 'diagram_analysis',
        question: 'Examine the Role Clearance Hierarchy below. Which role has authority to view records across ALL assigned client accounts simultaneously?',
        diagramType: 'clearance_hierarchy',
        options: [
          'Trainee Analyst (Level 1)',
          'Client Account Manager (Level 2)',
          'Lead Training Instructor (Level 1)',
          'System Administrator (Level 3)'
        ],
        correctAnswer: 3,
        explanation: 'System Administrators holding Clearance Level 3 possess root authority to audit and monitor records across all registered corporate accounts.'
      },
      {
        id: 'q2-5',
        type: 'multiple_choice',
        question: 'When a trainee transitions between companies, how does CrossQuest ensure their historical training records remain isolated to their prior employer?',
        options: [
          'By deleting older training records',
          'By binding the company attribute in effect at completion time to the ciphertext',
          'By converting all past records to public unencrypted access',
          'By re-encrypting the entire company database'
        ],
        correctAnswer: 1,
        explanation: 'Each record retains the company attribute active at completion time, ensuring historical isolation without requiring complex database-wide re-encryption.'
      },
      {
        id: 'q2-6',
        type: 'matching',
        question: 'Match each Personnel Role in Column A with its exact Clearance Level & Access Scope in Column B:',
        pairs: [
          { id: 'm2-1', left: 'System Administrator', right: 'Level 3 (Root authority across all corporate tenants)' },
          { id: 'm2-2', left: 'Client Account Manager', right: 'Level 2 (Restricted exclusively to assigned client accounts)' },
          { id: 'm2-3', left: 'Lead Course Instructor', right: 'Level 1 (Cohort grading and curriculum authoring)' },
          { id: 'm2-4', left: 'Trainee Analyst', right: 'Level 1 (Personal learning quest & self-progress viewing)' }
        ],
        explanation: 'System Administrators hold root Level 3 privileges across all accounts, Account Managers are isolated to Level 2 client portfolios, and Trainers/Trainees hold Level 1 educational access.'
      },
      {
        id: 'q2-7',
        type: 'multiple_choice',
        question: 'What must occur immediately in an attribute-based system when an employee transfers from Department A to Department B?',
        options: [
          'Their cryptographic attributes are revoked and re-issued to reflect their new organizational scope',
          'All historical encrypted databases must be deleted and restored',
          'The employee retains both department privileges permanently',
          'No changes are needed since all company departments share identical clearance'
        ],
        correctAnswer: 0,
        explanation: 'Attribute lifecycle management requires immediate revocation of outdated attributes and issuance of updated credentials matching the new role.'
      },
      {
        id: 'q2-8',
        type: 'identification',
        question: 'Name the security vulnerability that occurs when a user gains elevated access permissions beyond their authorized clearance level. (Hint: 2 words)',
        acceptedAnswers: ['privilege escalation', 'privilege creep', 'escalation of privilege'],
        placeholder: 'Type the security vulnerability...',
        explanation: 'Privilege escalation occurs when an attacker or misconfigured user acquires higher-level rights than intended by organizational policy.'
      }
    ]
  },

  'act-3': {
    id: 'act-3',
    title: 'Supervisory Mastery & High-Impact Coaching',
    instructor: 'Lead Trainer Jobert Cruz',
    category: 'Supervisory Mastery',
    headerColor: '#dc2626',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'first_step',
    description: 'Accelerate supervisory upskilling and situational leadership. Implement the GROW coaching model, performance delegation, and constructive feedback loops.',
    learningObjectives: [
      'Apply the GROW coaching methodology across developmental team dialogues',
      'Navigate situational leadership models to delegate with high autonomy',
      'Cultivate psychological safety and proactive mistake recovery within supervisory cohorts'
    ],
    questions: [
      {
        id: 'q3-1',
        type: 'multiple_choice',
        question: 'Under data privacy standards, which core principle dictates that personal data must only be collected for specified, explicit, and legitimate purposes?',
        options: [
          'Purpose Specification & Limitation',
          'Data Maximization',
          'Indefinite Retention',
          'Unrestricted Third-Party Sharing'
        ],
        correctAnswer: 0,
        explanation: 'Purpose Specification ensures personal data is collected only for declared, specific, and legitimate business purposes and not further processed in a manner incompatible with those purposes.'
      },
      {
        id: 'q3-2',
        type: 'identification',
        question: 'Name the statutory regulatory commission in the Philippines mandated to enforce the Data Privacy Act of 2012 (R.A. 10173). (Hint: 3 words or acronym NPC)',
        acceptedAnswers: ['national privacy commission', 'npc', 'the national privacy commission'],
        placeholder: 'Enter regulatory agency name...',
        explanation: 'The National Privacy Commission (NPC) is the independent body mandated to administer and implement the Data Privacy Act of 2012.'
      },
      {
        id: 'q3-3',
        type: 'sequence_order',
        question: 'Arrange the 4 phases of a Privacy Impact Assessment (PIA) in standard chronological order:',
        correctOrder: [
          'Map data flows, storage locations, and third-party processors',
          'Identify privacy risks, vulnerabilities, and threat vectors',
          'Implement cryptographic controls and policy access filters',
          'Publish compliance audit report and schedule annual renewal'
        ],
        initialOrder: [
          'Publish compliance audit report and schedule annual renewal',
          'Implement cryptographic controls and policy access filters',
          'Map data flows, storage locations, and third-party processors',
          'Identify privacy risks, vulnerabilities, and threat vectors'
        ],
        explanation: 'A PIA begins with mapping data flows, evaluating privacy risks, deploying mitigating cryptographic controls, and finalizing with compliance certification.'
      },
      {
        id: 'q3-4',
        type: 'diagram_analysis',
        question: 'Review the Data Flow Diagram. In the relationship between the Corporate Client, Crossworks, and Trainees, what is Crossworks classification?',
        diagramType: 'data_flow',
        options: [
          'Data Subject',
          'Personal Information Controller (PIC)',
          'Personal Information Processor (PIP)',
          'Public Registrar'
        ],
        correctAnswer: 2,
        explanation: 'Crossworks acts as a Personal Information Processor (PIP) delivering training services under the authority and contractual instructions of the corporate client (PIC).'
      },
      {
        id: 'q3-5',
        type: 'multiple_choice',
        question: 'What anomaly trigger automatically alerts administrators when high-volume record queries occur on weekends or late night hours?',
        options: [
          'OFF_HOURS and ABNORMAL_VOLUME detection rules',
          'Standard page refresh log',
          'CPU memory warning',
          'DNS cache expiration'
        ],
        correctAnswer: 0,
        explanation: 'Access outside normal operating hours (e.g. 23:00 - 06:00 or weekends) triggers an OFF_HOURS anomaly flag for immediate compliance review.'
      },
      {
        id: 'q3-6',
        type: 'matching',
        question: 'Match each Privacy Entity in Column A with its statutory classification under R.A. 10173 in Column B:',
        pairs: [
          { id: 'm3-1', left: 'Trainee Learner', right: 'Data Subject (Owner of personal records & evaluation metrics)' },
          { id: 'm3-2', left: 'Corporate Client (Employer)', right: 'Personal Information Controller (PIC directing training)' },
          { id: 'm3-3', left: 'Crossworks Training Service', right: 'Personal Information Processor (PIP executing training under DPA)' },
          { id: 'm3-4', left: 'National Privacy Commission', right: 'Statutory regulatory authority enforcing compliance' }
        ],
        explanation: 'The individual is the Data Subject, their sponsoring employer acts as PIC, Crossworks acts as the contracted PIP, and the NPC is the regulatory oversight commission.'
      },
      {
        id: 'q3-7',
        type: 'multiple_choice',
        question: "Which of the following data types is classified as 'Sensitive Personal Information' under the Data Privacy Act of 2012 (R.A. 10173)?",
        options: [
          'Individual health conditions, government-issued IDs, and religious affiliations',
          'Publicly published office business telephone numbers',
          'Company registered domain name',
          'Standard corporate email domain suffix'
        ],
        correctAnswer: 0,
        explanation: 'Under R.A. 10173, information about an individual health, race, religion, sexual life, and government-issued numbers constitutes Sensitive Personal Information requiring heightened security safeguards.'
      },
      {
        id: 'q3-8',
        type: 'identification',
        question: 'What corporate officer is mandated by the National Privacy Commission to oversee data protection compliance within an enterprise? (Hint: 3 words or 3-letter acronym)',
        acceptedAnswers: ['data protection officer', 'dpo', 'compliance officer for privacy', 'data privacy officer'],
        placeholder: 'Type the official title or acronym...',
        explanation: 'The Data Protection Officer (DPO) is the designated individual accountable for ensuring organizational adherence to privacy legislation and NPC mandates.'
      }
    ]
  },

  'act-4': {
    id: 'act-4',
    title: 'Business Continuity & ISO 31000 Risk Management',
    instructor: 'Lead Trainer Owen Castillo',
    category: 'Risk & Governance',
    headerColor: '#7c3aed',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'streak_master',
    description: 'Analyze business impact, recovery time objectives (RTO), and risk evaluation matrices under the ISO 31000 framework and Crossworks BCM standards.',
    learningObjectives: [
      'Master ISO 31000 principles for uncertainty and enterprise risk management',
      'Differentiate Recovery Time Objective (RTO) vs. Recovery Point Objective (RPO)',
      'Conduct Business Impact Analysis (BIA) to safeguard mission-critical activities'
    ],
    questions: [
      {
        id: 'q4-1',
        type: 'multiple_choice',
        question: 'What architectural mechanism guarantees that San Miguel Conglomerate cannot decipher records belonging to Maya FinTech?',
        options: [
          'CSS display:none hiding rules in the browser',
          'Cryptographic CP-ABE ciphertext policy that excludes CORP_ALPHA attributes',
          'Shared session cookies across corporate domains',
          'Voluntary corporate trust agreement'
        ],
        correctAnswer: 1,
        explanation: 'Ciphertext Policy Attribute-Based Encryption mathematically prevents decryption unless the user private key possesses matching cryptographic attributes.'
      },
      {
        id: 'q4-2',
        type: 'identification',
        question: 'Name the database security feature where SQL queries automatically restrict visible rows based on the executing tenant session context. (Hint: Row-Level ...)',
        acceptedAnswers: ['row-level security', 'row level security', 'rls'],
        placeholder: 'Enter database security feature...',
        explanation: 'Row-Level Security (RLS) ensures the database engine enforces tenant boundaries directly at the query execution layer as defense-in-depth.'
      },
      {
        id: 'q4-3',
        type: 'sequence_order',
        question: 'Arrange the defense-in-depth layers an authenticated request must pass to read a trainee record:',
        correctOrder: [
          'API Gateway validates OAuth JWT token and active user status',
          'Database layer filters records using multi-tenant company code',
          'CP-ABE engine evaluates user attributes against ciphertext policy',
          'Decrypted record and verification certificate returned to user'
        ],
        initialOrder: [
          'Decrypted record and verification certificate returned to user',
          'CP-ABE engine evaluates user attributes against ciphertext policy',
          'API Gateway validates OAuth JWT token and active user status',
          'Database layer filters records using multi-tenant company code'
        ],
        explanation: 'A secure request passes through API authentication, database tenant isolation, and cryptographic policy verification before plaintext is returned.'
      },
      {
        id: 'q4-4',
        type: 'diagram_analysis',
        question: 'Examine the Multi-Tenant Architecture Diagram below. If an Account Manager attempts to decrypt records belonging to a different client partition, what immediate action occurs?',
        diagramType: 'tenant_partition',
        options: [
          'Immediate 403 Forbidden rejection and OUT_OF_SCOPE anomaly incident logged',
          'Cross-tenant plaintext is automatically decrypted and displayed',
          'The entire server process restarts',
          'The database table drops all foreign keys'
        ],
        correctAnswer: 0,
        explanation: 'The request is blocked with a 403 Forbidden status, and an OUT_OF_SCOPE anomaly alert is immediately stored in the database for admin review.'
      },
      {
        id: 'q4-5',
        type: 'multiple_choice',
        question: 'How does CrossQuest handle high-burst decryption attempts exceeding threshold limits (e.g. 25 requests in 15 minutes)?',
        options: [
          'Logs an ABNORMAL_VOLUME anomaly alert and flags user credentials for audit',
          'Deletes user account permanently without warning',
          'Exports all database tables to CSV',
          'Disables the server network interface'
        ],
        correctAnswer: 0,
        explanation: 'Volume bursts beyond configured thresholds trigger ABNORMAL_VOLUME alerts to prevent bulk credential scraping or data exfiltration attempts.'
      },
      {
        id: 'q4-6',
        type: 'matching',
        question: 'Match each Multi-Tenant Anomaly Event in Column A with its Security Trigger Condition in Column B:',
        pairs: [
          { id: 'm4-1', left: 'OUT_OF_SCOPE Trigger', right: 'User queries records belonging to an unassigned company' },
          { id: 'm4-2', left: 'ABNORMAL_VOLUME Trigger', right: 'Decryption requests exceed 25 operations in a 15-minute window' },
          { id: 'm4-3', left: 'OFF_HOURS Trigger', right: 'Query activity initiated between 23:00 and 06:00 or weekends' },
          { id: 'm4-4', left: 'INVALID_TOKEN Trigger', right: 'Cryptographic signature failure or revoked personnel credentials' }
        ],
        explanation: 'OUT_OF_SCOPE enforces company boundaries, ABNORMAL_VOLUME mitigates scraping, OFF_HOURS alerts on suspicious schedules, and INVALID_TOKEN stops expired credentials.'
      },
      {
        id: 'q4-7',
        type: 'multiple_choice',
        question: 'What security risk arises in multi-tenant SaaS architectures if tenant IDs are concatenated directly into raw SQL queries without parameterized binding?',
        options: [
          'SQL Injection allowing cross-tenant data leakage',
          'Faster database query caching across all tenants',
          'Automatic data redundancy backup',
          'Decreased network bandwidth usage'
        ],
        correctAnswer: 0,
        explanation: 'Raw SQL concatenation enables SQL injection, which can bypass tenant boundaries and expose confidential data across customer organizations.'
      },
      {
        id: 'q4-8',
        type: 'identification',
        question: 'Identify the architectural principle where multiple clients share the same computing infrastructure while maintaining logical and cryptographic data segregation. (Hint: 2 words)',
        acceptedAnswers: ['multi tenancy', 'multi-tenancy', 'multitenancy', 'logical isolation'],
        placeholder: 'Type the architectural principle...',
        explanation: 'Multi-tenancy enables shared infrastructure efficiencies while enforcing strict logical, cryptographic, and row-level boundaries between different corporate clients.'
      }
    ]
  }
};

// =========================================================================
// TRAINER QUIZ AUTHORING & PERSISTENCE HELPERS
// =========================================================================

export function getActiveQuizDatabase() {
  try {
    const raw = localStorage.getItem('crossquest_quiz_database');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...QUIZ_DATABASE, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Could not load custom quizzes from localStorage:", e);
  }
  return { ...QUIZ_DATABASE };
}

export function saveQuizToStorage(quizObj) {
  try {
    const current = getActiveQuizDatabase();
    current[quizObj.id] = quizObj;
    localStorage.setItem('crossquest_quiz_database', JSON.stringify(current));
    return current;
  } catch (e) {
    console.error("Failed to save quiz:", e);
    return null;
  }
}

export function addQuestionToQuizStorage(quizId, questionObj) {
  try {
    const current = getActiveQuizDatabase();
    if (current[quizId]) {
      const updatedQuestions = [...(current[quizId].questions || []), questionObj];
      current[quizId] = {
        ...current[quizId],
        questions: updatedQuestions
      };
      localStorage.setItem('crossquest_quiz_database', JSON.stringify(current));
      return current[quizId];
    }
  } catch (e) {
    console.error("Failed to add question:", e);
  }
  return null;
}

export function updateQuestionInQuizStorage(quizId, questionId, updatedQuestionObj) {
  try {
    const current = getActiveQuizDatabase();
    if (current[quizId] && Array.isArray(current[quizId].questions)) {
      const idx = current[quizId].questions.findIndex(q => q.id === questionId);
      if (idx !== -1) {
        current[quizId].questions[idx] = {
          ...current[quizId].questions[idx],
          ...updatedQuestionObj
        };
        localStorage.setItem('crossquest_quiz_database', JSON.stringify(current));
        return current[quizId];
      }
    }
  } catch (e) {
    console.error("Failed to update question:", e);
  }
  return null;
}

export function updateQuizMetadataStorage(quizId, metadataUpdates) {
  try {
    const current = getActiveQuizDatabase();
    if (current[quizId]) {
      current[quizId] = {
        ...current[quizId],
        ...metadataUpdates
      };
      localStorage.setItem('crossquest_quiz_database', JSON.stringify(current));
      return current[quizId];
    }
  } catch (e) {
    console.error("Failed to update quiz metadata:", e);
  }
  return null;
}


export function deleteQuestionFromQuizStorage(quizId, questionId) {
  try {
    const current = getActiveQuizDatabase();
    if (current[quizId]) {
      const filtered = (current[quizId].questions || []).filter(q => q.id !== questionId);
      current[quizId] = {
        ...current[quizId],
        questions: filtered
      };
      localStorage.setItem('crossquest_quiz_database', JSON.stringify(current));
      return current[quizId];
    }
  } catch (e) {
    console.error("Failed to delete question:", e);
  }
  return null;
}

export function resetQuizDatabaseToDefaults() {
  try {
    localStorage.removeItem('crossquest_quiz_database');
  } catch (e) {}
  return { ...QUIZ_DATABASE };
}

