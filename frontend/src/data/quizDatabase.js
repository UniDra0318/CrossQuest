// CrossQuest Enterprise Learning Quiz Database
// Contains real, industry-aligned course quizzes with diverse question types:
// 1. multiple_choice (Kahoot 4-tile)
// 2. identification (Direct term input)
// 3. sequence_order (Interactive step reordering)
// 4. diagram_analysis (Visual architectural diagram hotspot analysis)

export const QUIZ_DATABASE = {
  'act-1': {
    id: 'act-1',
    title: 'Enterprise Security Audit Challenge',
    instructor: 'Lead Trainer David Lim',
    category: 'Information Security',
    headerColor: '#1368ce',
    timePerQuestion: 45, // seconds
    passingScore: 80,
    badgeAwarded: 'sec_champ',
    description: 'Conduct a comprehensive zero-trust security audit across Crossworks multi-tenant infrastructure. Evaluate policy verification, identify out-of-scope access attempts, and audit cryptographic isolation boundaries.',
    learningObjectives: [
      'Understand zero-trust architecture and cryptographic policy bindings',
      'Identify access anomalies and out-of-scope credential misuse',
      'Analyze defense-in-depth database and encryption isolation pipelines'
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
      }
    ]
  },

  'act-2': {
    id: 'act-2',
    title: 'Role-Based Access & Policy Verification',
    instructor: 'Dr. Sarah Jenkins',
    category: 'Access Control',
    headerColor: '#06d6a0',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'crypto_knight',
    description: 'Verify staff clearance levels, attribute issuing authority, and cryptographic key distribution mechanisms to prevent privilege escalation and unauthorized disclosures.',
    learningObjectives: [
      'Master clearance level hierarchies (Level 1, Level 2, Level 3)',
      'Inspect Attribute Authority key generation and revocation procedures',
      'Preserve multi-tenant segregation across personnel transitions'
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
      }
    ]
  },

  'act-3': {
    id: 'act-3',
    title: 'Privacy Impact Assessment (PIA) Simulation',
    instructor: 'Lead Trainer David Lim',
    category: 'Privacy Management',
    headerColor: '#e21b3c',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'first_step',
    description: 'Simulate a corporate Privacy Impact Assessment under statutory compliance frameworks. Audit data flow paths, evaluate risk thresholds, and implement cryptographic safeguards.',
    learningObjectives: [
      'Understand the principles of personal data processing under privacy laws',
      'Distinguish the roles of Personal Information Controller and Processor',
      'Apply threshold-based anomaly detection to protect data subjects'
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
      }
    ]
  },

  'act-4': {
    id: 'act-4',
    title: 'Multi-Tenant Data Isolation & Security',
    instructor: 'Prof. Roel Traballo',
    category: 'Database Security',
    headerColor: '#772ce8',
    timePerQuestion: 45,
    passingScore: 80,
    badgeAwarded: 'streak_master',
    description: 'Deep dive into defense-in-depth multi-tenant security architecture. Analyze PostgreSQL database partitioning, CP-ABE ciphertext binding, and automated anomaly isolation.',
    learningObjectives: [
      'Master defense-in-depth isolation techniques for multi-tenant SaaS',
      'Analyze row-level filtering and cryptographic policy boundaries',
      'Prevent cross-tenant data leakage under strict enterprise audit SLAs'
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
      }
    ]
  }
};
