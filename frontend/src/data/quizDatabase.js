// CrossQuest Enterprise Learning Quiz Database
// Aligned with all 11 real Crossworks pilot courses that have training sessions:
// act-1 .. act-11 (each containing multiple_choice, identification, sequence_order, and matching questions)

export const QUIZ_DATABASE = {
  "act-1": {
    "id": "act-1",
    "title": "Agile PME & Project Management Challenge",
    "instructor": "Instructor not assigned",
    "category": "Project Management",
    "headerColor": "#1368ce",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "sec_champ",
    "description": "Master Agile Project Management and PME methodologies. Evaluate project critical paths, agile sprint governance, and earned value metrics under the Crossworks curriculum.",
    "learningObjectives": [
      "Master Agile frameworks, sprint planning, and daily standup workflows",
      "Analyze Critical Path Method (CPM) and Earned Value Management (EVM)",
      "Inspect retrospective adaptation pipelines and continuous improvement"
    ],
    "questions": [
      {
        "id": "q1-1",
        "type": "multiple_choice",
        "question": "In Agile Project Management, what is the primary operational objective of the Daily Standup ceremony?",
        "options": [
          "Estimate annual resource budgets",
          "Synchronize team progress and identify blockers within 15 minutes",
          "Conduct individual formal performance appraisals",
          "Deliver finalized stakeholder status invoices"
        ],
        "correctAnswer": 1,
        "explanation": "Daily Standup ensures rapid team synchronization and early blocker identification within a strict 15-minute timebox."
      },
      {
        "id": "q1-2",
        "type": "identification",
        "question": "What project metric represents the ratio of Earned Value (EV) to Planned Value (PV)? (Hint: 3-letter acronym SPI)",
        "acceptedAnswers": [
          "spi",
          "schedule performance index"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "Schedule Performance Index (SPI = EV / PV) measures project schedule efficiency."
      },
      {
        "id": "q1-3",
        "type": "sequence_order",
        "question": "Arrange the 4 core phases of the Critical Path Method (CPM) and Project Scheduling in correct chronological sequence:",
        "correctOrder": [
          "Define distinct project activities and milestones",
          "Establish precedence dependencies and work breakdown structure (WBS)",
          "Estimate task durations and identify the critical path",
          "Calculate early/late start dates and monitor total float"
        ],
        "initialOrder": [
          "Estimate task durations and identify the critical path",
          "Define distinct project activities and milestones",
          "Calculate early/late start dates and monitor total float",
          "Establish precedence dependencies and work breakdown structure (WBS)"
        ],
        "explanation": "Critical path scheduling begins with defining deliverables, structuring dependencies, estimating durations, and analyzing float along the critical path."
      },
      {
        "id": "q1-4",
        "type": "multiple_choice",
        "question": "In the Scrum framework, who possesses sole authority to cancel a Sprint prior to its scheduled completion?",
        "options": [
          "Scrum Master",
          "Development Team Lead",
          "Product Owner",
          "Project Management Office (PMO) Director"
        ],
        "correctAnswer": 2,
        "explanation": "Only the Product Owner has the authority to cancel a Sprint, typically if the sprint goal becomes obsolete."
      },
      {
        "id": "q1-5",
        "type": "multiple_choice",
        "question": "What is the primary operational purpose of a Project Retrospective ceremony?",
        "options": [
          "Determine salary adjustments for the iteration",
          "Inspect team dynamics and adapt processes for continuous operational improvement",
          "Bill corporate clients for completed story points",
          "Lock code repositories permanently"
        ],
        "correctAnswer": 1,
        "explanation": "Retrospectives empower the team to reflect on recent work and implement concrete process improvements for upcoming sprints."
      },
      {
        "id": "q1-6",
        "type": "matching",
        "question": "Match each Agile & Project Management artifact in Column A with its exact operational definition in Column B:",
        "pairs": [
          {
            "id": "m1-1",
            "left": "Product Backlog",
            "right": "Single prioritized source of requirements for product features"
          },
          {
            "id": "m1-2",
            "left": "Sprint Burndown Chart",
            "right": "Visual representation of work remaining versus elapsed sprint time"
          },
          {
            "id": "m1-3",
            "left": "Definition of Done (DoD)",
            "right": "Agreed quality checklist required before an increment is shippable"
          },
          {
            "id": "m1-4",
            "left": "Work Breakdown Structure",
            "right": "Hierarchical decomposition of total project scope into deliverables"
          }
        ],
        "explanation": "Backlogs prioritize features, burndown charts track velocity, DoD ensures shippable quality, and WBS scopes deliverables."
      },
      {
        "id": "q1-7",
        "type": "identification",
        "question": "In project cost management, what metric calculates Earned Value (EV) minus Actual Cost (AC)? (Hint: 2 words or CV)",
        "acceptedAnswers": [
          "cost variance",
          "cv"
        ],
        "placeholder": "Enter metric name or acronym...",
        "explanation": "Cost Variance (CV = EV - AC) indicates whether a project is over or under budget."
      },
      {
        "id": "q1-8",
        "type": "multiple_choice",
        "question": "What Agile ceremony is dedicated to sizing backlog user stories and clarifying acceptance criteria before sprint planning?",
        "options": [
          "Backlog Refinement / Grooming",
          "Sprint Review",
          "Sprint Retrospective",
          "Daily Scrum"
        ],
        "correctAnswer": 0,
        "explanation": "Backlog Refinement ensures user stories are estimated, clear, and ready for upcoming sprint planning."
      }
    ]
  },
  "act-2": {
    "id": "act-2",
    "title": "Executive Communication & CONNECT Simulation",
    "instructor": "Instructor not assigned",
    "category": "Executive Leadership",
    "headerColor": "#059669",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "crypto_knight",
    "description": "Simulate executive-level communication and high-impact stakeholder negotiations under the Crossworks CONNECT framework. Master the Pyramid Principle and strategic dialogues.",
    "learningObjectives": [
      "Master the CONNECT framework for high-stakes executive negotiations",
      "Structure executive briefings using the Pyramid Principle",
      "Deploy active listening and reflective paraphrasing across multi-tenant cohorts"
    ],
    "questions": [
      {
        "id": "q2-1",
        "type": "multiple_choice",
        "question": "In the Crossworks CONNECT executive communication framework, what is the crucial initial step in high-stakes negotiations?",
        "options": [
          "State bottom-line budget immediately",
          "Establish rapport and diagnose underlying stakeholder interests",
          "Issue a formal legal ultimatum",
          "Delegate communication entirely to junior staff"
        ],
        "correctAnswer": 1,
        "explanation": "Diagnosing stakeholder interests before stating rigid positions builds trust and reveals shared value opportunities."
      },
      {
        "id": "q2-2",
        "type": "identification",
        "question": "What executive briefing methodology dictates stating the core recommendation or key finding first, followed by supporting logic? (Hint: 2 words)",
        "acceptedAnswers": [
          "pyramid principle",
          "the pyramid principle",
          "minto pyramid",
          "pyramid"
        ],
        "placeholder": "Enter briefing structure name...",
        "explanation": "The Pyramid Principle structures executive communications top-down, leading directly with the answer/recommendation."
      },
      {
        "id": "q2-3",
        "type": "sequence_order",
        "question": "Arrange the 4 stages of the CONNECT Strategic Stakeholder Alignment process in proper operational sequence:",
        "correctOrder": [
          "Identify key stakeholder personas and their organizational drivers",
          "Diagnose conflicting interests and shared business goals",
          "Craft tailored value propositions and strategic briefings",
          "Facilitate consensus alignment and document agreed commitments"
        ],
        "initialOrder": [
          "Craft tailored value propositions and strategic briefings",
          "Identify key stakeholder personas and their organizational drivers",
          "Facilitate consensus alignment and document agreed commitments",
          "Diagnose conflicting interests and shared business goals"
        ],
        "explanation": "Effective stakeholder alignment requires mapping personas, diagnosing underlying motivations, articulating value, and securing commitments."
      },
      {
        "id": "q2-4",
        "type": "multiple_choice",
        "question": "Which communication channel possesses the highest information richness for resolving high-friction cross-functional disputes?",
        "options": [
          "Company-wide text broadcast",
          "Face-to-face or interactive video dialogue",
          "Automated system email notification",
          "Shared spreadsheet comment thread"
        ],
        "correctAnswer": 1,
        "explanation": "Face-to-face and interactive dialogue provides rich non-verbal cues, tone feedback, and rapid clarification."
      },
      {
        "id": "q2-5",
        "type": "multiple_choice",
        "question": "In active listening, what technique involves restating the speaker emotional state and core message in your own words?",
        "options": [
          "Passive reception",
          "Reflective paraphrasing",
          "Defensive rebuttal",
          "Selective silence"
        ],
        "correctAnswer": 1,
        "explanation": "Reflective paraphrasing confirms mutual understanding and demonstrates genuine empathy."
      },
      {
        "id": "q2-6",
        "type": "matching",
        "question": "Match each Communication Principle in Column A with its practical executive application in Column B:",
        "pairs": [
          {
            "id": "m2-1",
            "left": "Pyramid Principle",
            "right": "Lead with conclusions, followed by structured supporting pillars"
          },
          {
            "id": "m2-2",
            "left": "Empathic Inquiry",
            "right": "Clarify unstated concerns through open-ended discovery questions"
          },
          {
            "id": "m2-3",
            "left": "Non-Defensive Reframe",
            "right": "Transform critical feedback into collaborative problem-solving"
          },
          {
            "id": "m2-4",
            "left": "Executive Cadence",
            "right": "Deliver predictable, concise visual KPI summaries to the C-suite"
          }
        ],
        "explanation": "Executive clarity requires structured pyramids, empathic questioning, constructive reframing, and predictable cadences."
      },
      {
        "id": "q2-7",
        "type": "identification",
        "question": "What psychological condition describes an environment where team members feel safe to voice concerns, challenge ideas, and admit mistakes without fear of retribution? (Hint: 2 words)",
        "acceptedAnswers": [
          "psychological safety",
          "psychological security"
        ],
        "placeholder": "Enter leadership term...",
        "explanation": "Psychological safety is the shared belief that team members will not be embarrassed, rejected, or punished for speaking up."
      },
      {
        "id": "q2-8",
        "type": "multiple_choice",
        "question": "When presenting high-level strategic proposals to executive decision-makers, what approach is most persuasive?",
        "options": [
          "Reading every bullet point verbatim from 40 technical slides",
          "Focusing on quantifiable business outcomes, revenue impact, and strategic risk mitigations",
          "Withholding all financial projections until the final slide",
          "Debating defensive points during introductory remarks"
        ],
        "correctAnswer": 1,
        "explanation": "Executives prioritize decision-oriented briefs centered on financial ROI, strategic alignment, and risk management."
      }
    ]
  },
  "act-3": {
    "id": "act-3",
    "title": "Supervisory Mastery & High-Impact Coaching",
    "instructor": "Instructor not assigned",
    "category": "Supervisory Mastery",
    "headerColor": "#dc2626",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "first_step",
    "description": "Accelerate supervisory upskilling and situational leadership. Implement the GROW coaching model, performance delegation, and constructive feedback loops.",
    "learningObjectives": [
      "Apply the GROW coaching methodology across developmental team dialogues",
      "Navigate situational leadership models to delegate with high autonomy",
      "Cultivate psychological safety and proactive mistake recovery within supervisory cohorts"
    ],
    "questions": [
      {
        "id": "q3-1",
        "type": "multiple_choice",
        "question": "In the internationally recognized GROW coaching model, what does the letter R signify?",
        "options": [
          "Reporting metrics",
          "Reality - objectively assessing the current situation",
          "Reimbursement",
          "Reprimand"
        ],
        "correctAnswer": 1,
        "explanation": "Reality explores the coachee current situation, challenges, and factual context without imposing subjective judgment."
      },
      {
        "id": "q3-2",
        "type": "identification",
        "question": "In the GROW coaching model, which stage is dedicated to identifying concrete next actions, accountability, and timelines? (Hint: Will or Way Forward)",
        "acceptedAnswers": [
          "will",
          "way forward",
          "wrap up",
          "what next"
        ],
        "placeholder": "Enter GROW stage name...",
        "explanation": "Will (or Way Forward) commits the coachee to specific, actionable steps, completion timelines, and accountability."
      },
      {
        "id": "q3-3",
        "type": "sequence_order",
        "question": "Arrange the 4 phases of the GROW Coaching Framework in standard coaching order:",
        "correctOrder": [
          "Goal - Define the specific target outcome or developmental aspiration",
          "Reality - Explore current challenges, strengths, and factual context",
          "Options - Brainstorm all possible pathways, strategies, and resources",
          "Will - Commit to concrete actions, measurable milestones, and accountability"
        ],
        "initialOrder": [
          "Options - Brainstorm all possible pathways, strategies, and resources",
          "Goal - Define the specific target outcome or developmental aspiration",
          "Will - Commit to concrete actions, measurable milestones, and accountability",
          "Reality - Explore current challenges, strengths, and factual context"
        ],
        "explanation": "Coaching flows naturally from setting the Goal, exploring Reality, generating creative Options, and securing the Will to act."
      },
      {
        "id": "q3-4",
        "type": "multiple_choice",
        "question": "Under Situational Leadership theory, which leadership style is most effective for an employee who possesses high competence and high commitment?",
        "options": [
          "Directing / Telling (S1)",
          "Coaching / Selling (S2)",
          "Supporting / Participating (S3)",
          "Delegating (S4)"
        ],
        "correctAnswer": 3,
        "explanation": "Delegating (S4) empowers highly competent and committed individuals with autonomy and operational trust."
      },
      {
        "id": "q3-5",
        "type": "multiple_choice",
        "question": "When transitioning from individual contributor to team supervisor, what represents the primary mindset shift?",
        "options": [
          "Completing technical tasks faster than all subordinates",
          "Achieving operational outcomes by developing, empowering, and coaching others",
          "Retaining exclusive control over all task execution",
          "Avoiding transparent communication with team members"
        ],
        "correctAnswer": 1,
        "explanation": "Supervision shifts focus from individual task execution to organizational enablement, team coaching, and strategic alignment."
      },
      {
        "id": "q3-6",
        "type": "matching",
        "question": "Match each Supervisory Leadership Competency in Column A with its definition in Column B:",
        "pairs": [
          {
            "id": "m3-1",
            "left": "Delegation with Autonomy",
            "right": "Assigning outcome responsibility while granting execution freedom"
          },
          {
            "id": "m3-2",
            "left": "Constructive Feedback",
            "right": "Providing timely, behavior-specific, forward-looking guidance"
          },
          {
            "id": "m3-3",
            "left": "Conflict Resolution",
            "right": "Facilitating collaborative win-win solutions to interpersonal friction"
          },
          {
            "id": "m3-4",
            "left": "Performance Coaching",
            "right": "Unlocking potential through structured inquiry and reflective inquiry"
          }
        ],
        "explanation": "Effective supervisors empower through delegation, coach through inquiry, provide actionable feedback, and resolve team friction."
      },
      {
        "id": "q3-7",
        "type": "identification",
        "question": "What type of feedback focuses on future behaviors and strategic solutions rather than dwelling exclusively on past mistakes? (Hint: 2 words, Feed...)",
        "acceptedAnswers": [
          "feedforward",
          "feed forward",
          "constructive feedback"
        ],
        "placeholder": "Enter feedback term...",
        "explanation": "Feedforward provides positive, solution-oriented suggestions for future performance rather than dwelling on past errors."
      },
      {
        "id": "q3-8",
        "type": "multiple_choice",
        "question": "Under situational leadership theory, what style combines high directive behavior with high supportive behavior?",
        "options": [
          "Coaching / Selling",
          "Delegating",
          "Laissez-faire",
          "Autocratic directing"
        ],
        "correctAnswer": 0,
        "explanation": "Coaching (S2) balances direct guidance with high personal support and two-way dialogue."
      }
    ]
  },
  "act-4": {
    "id": "act-4",
    "title": "Business Continuity & ISO 31000 Risk Management",
    "instructor": "Instructor not assigned",
    "category": "Risk & Governance",
    "headerColor": "#7c3aed",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "streak_master",
    "description": "Analyze business impact, recovery time objectives (RTO), and risk evaluation matrices under the ISO 31000 framework and Crossworks BCM standards.",
    "learningObjectives": [
      "Master ISO 31000 principles for uncertainty and enterprise risk management",
      "Differentiate Recovery Time Objective (RTO) vs. Recovery Point Objective (RPO)",
      "Conduct Business Impact Analysis (BIA) to safeguard mission-critical activities"
    ],
    "questions": [
      {
        "id": "q4-1",
        "type": "multiple_choice",
        "question": "According to the ISO 31000 international standard, how is Risk formally defined?",
        "options": [
          "An inevitable financial loss",
          "The effect of uncertainty on objectives",
          "A catastrophic natural disaster event",
          "An unmonitored software outage exceeding 4 hours"
        ],
        "correctAnswer": 1,
        "explanation": "ISO 31000 formally defines risk as the effect of uncertainty on organizational objectives."
      },
      {
        "id": "q4-2",
        "type": "identification",
        "question": "In Business Continuity Planning, what 3-letter acronym represents the maximum acceptable duration of disruption before service restoration? (Hint: RTO)",
        "acceptedAnswers": [
          "rto",
          "recovery time objective"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "Recovery Time Objective (RTO) dictates the maximum tolerable duration before an outage must be restored."
      },
      {
        "id": "q4-3",
        "type": "sequence_order",
        "question": "Arrange the 4 steps of the ISO 31000 Risk Assessment process in standard operational sequence:",
        "correctOrder": [
          "Risk Identification - Uncover potential threat vectors and vulnerabilities",
          "Risk Analysis - Estimate the likelihood and consequence of each threat",
          "Risk Evaluation - Prioritize risks against corporate appetite and tolerance",
          "Risk Treatment - Deploy mitigation controls, transfer, or contingency plans"
        ],
        "initialOrder": [
          "Risk Evaluation - Prioritize risks against corporate appetite and tolerance",
          "Risk Identification - Uncover potential threat vectors and vulnerabilities",
          "Risk Treatment - Deploy mitigation controls, transfer, or contingency plans",
          "Risk Analysis - Estimate the likelihood and consequence of each threat"
        ],
        "explanation": "Risk management follows Identification, Analysis of likelihood/impact, Evaluation against thresholds, and targeted Treatment."
      },
      {
        "id": "q4-4",
        "type": "multiple_choice",
        "question": "In enterprise risk assessment matrices, what two fundamental dimensions calculate the overall risk rating score?",
        "options": [
          "Headcount and office footprint",
          "Likelihood (Probability) and Impact (Consequence)",
          "Network latency and disk capacity",
          "Employee turnover and market inflation"
        ],
        "correctAnswer": 1,
        "explanation": "Risk Severity is calculated by evaluating the Likelihood of occurrence against the magnitude of operational Impact."
      },
      {
        "id": "q4-5",
        "type": "multiple_choice",
        "question": "What differentiates Recovery Point Objective (RPO) from Recovery Time Objective (RTO)?",
        "options": [
          "RPO measures maximum tolerable data loss in time, while RTO measures system downtime duration",
          "RPO and RTO are completely identical metrics",
          "RPO applies only to physical hardware fire drills",
          "RTO measures financial penalties in local currency"
        ],
        "correctAnswer": 0,
        "explanation": "RPO defines allowable data loss tolerance (e.g., backup frequency), whereas RTO defines allowable system downtime duration."
      },
      {
        "id": "q4-6",
        "type": "matching",
        "question": "Match each Risk Management Concept in Column A with its exact ISO 31000 definition in Column B:",
        "pairs": [
          {
            "id": "m4-1",
            "left": "Business Impact Analysis (BIA)",
            "right": "Quantifies operational impacts of disruptions over time"
          },
          {
            "id": "m4-2",
            "left": "Recovery Time Objective (RTO)",
            "right": "Target timeframe for restoring critical business activities"
          },
          {
            "id": "m4-3",
            "left": "Recovery Point Objective (RPO)",
            "right": "Maximum tolerable data loss measured back in time"
          },
          {
            "id": "m4-4",
            "left": "Risk Treatment Plan",
            "right": "Structured actions to mitigate, avoid, or transfer prioritized risk"
          }
        ],
        "explanation": "BIA identifies mission-critical dependencies, RTO limits downtime, RPO limits data loss, and Treatment controls risk."
      },
      {
        "id": "q4-7",
        "type": "identification",
        "question": "In a Business Continuity Plan, what formal assessment quantifies the operational and financial impact of disruptions across business units? (Hint: 3 words or BIA)",
        "acceptedAnswers": [
          "business impact analysis",
          "bia"
        ],
        "placeholder": "Enter assessment name or acronym...",
        "explanation": "Business Impact Analysis (BIA) quantifies operational downtime consequences and establishes recovery priorities."
      },
      {
        "id": "q4-8",
        "type": "multiple_choice",
        "question": "When treating an identified risk, choosing to purchase commercial insurance against asset loss is an example of which risk response strategy?",
        "options": [
          "Risk Transfer",
          "Risk Avoidance",
          "Risk Acceptance",
          "Risk Mitigation"
        ],
        "correctAnswer": 0,
        "explanation": "Purchasing insurance or contracting third-party guarantees transfers financial risk exposure to another party."
      }
    ]
  },
  "act-5": {
    "id": "act-5",
    "title": "PMP Certification Exam Readiness (Saturdays Cohort)",
    "instructor": "Jordan Ramos",
    "category": "PMP Review (Saturdays)",
    "headerColor": "#0891b2",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "sec_champ",
    "description": "Comprehensive PMP exam readiness assessment covering People, Process, and Business Environment domains under PMBOK 7th Edition.",
    "learningObjectives": [
      "Evaluate predictive, hybrid, and agile project life cycles",
      "Calculate Earned Value Management (EVM) CPI and SPI metrics",
      "Execute stakeholder engagement and change control governance"
    ],
    "questions": [
      {
        "id": "q5-1",
        "type": "multiple_choice",
        "question": "In Earned Value Management (EVM), a Cost Performance Index (CPI) of 0.85 indicates that the project is:",
        "options": [
          "Under budget and ahead of schedule",
          "Over budget, earning only 0.85 worth of value per currency unit spent",
          "Exactly on budget with 15% management reserve remaining",
          "Ahead of schedule by 15% of total float"
        ],
        "correctAnswer": 1,
        "explanation": "CPI = EV / AC. A CPI below 1.0 means the project is over budget for the work performed."
      },
      {
        "id": "q5-2",
        "type": "identification",
        "question": "What formal PMP document authorizes the existence of a project and grants the Project Manager authority to apply organizational resources? (Hint: 2 words)",
        "acceptedAnswers": [
          "project charter",
          "charter"
        ],
        "placeholder": "Enter document name...",
        "explanation": "The Project Charter formally authorizes the project and empowers the project manager to allocate resources."
      },
      {
        "id": "q5-3",
        "type": "sequence_order",
        "question": "Arrange the 4 steps of the PMP Integrated Change Control workflow in chronological sequence:",
        "correctOrder": [
          "Log the proposed change request and assess initial scope",
          "Analyze impact across scope, schedule, cost, and quality baselines",
          "Submit the evaluated change to the Change Control Board (CCB) for decision",
          "Update project baselines and communicate the approved change to stakeholders"
        ],
        "initialOrder": [
          "Submit the evaluated change to the Change Control Board (CCB) for decision",
          "Log the proposed change request and assess initial scope",
          "Update project baselines and communicate the approved change to stakeholders",
          "Analyze impact across scope, schedule, cost, and quality baselines"
        ],
        "explanation": "Change requests are logged, analyzed for cross-baseline impact, reviewed by the CCB, and then applied to project baselines."
      },
      {
        "id": "q5-4",
        "type": "matching",
        "question": "Match each PMP Project Governance Artifact in Column A with its core operational purpose in Column B:",
        "pairs": [
          {
            "id": "m5-1",
            "left": "Stakeholder Register",
            "right": "Identifies stakeholder influence, interest, and engagement classifications"
          },
          {
            "id": "m5-2",
            "left": "Risk Register",
            "right": "Tracks identified threats, opportunities, risk owners, and mitigation responses"
          },
          {
            "id": "m5-3",
            "left": "Lessons Learned Register",
            "right": "Captures organizational knowledge continuously throughout project execution"
          },
          {
            "id": "m5-4",
            "left": "Requirements Traceability Matrix",
            "right": "Links product requirements from business origin to verified deliverables"
          }
        ],
        "explanation": "Registers and matrices maintain structured traceability across stakeholders, risks, lessons learned, and deliverables."
      },
      {
        "id": "q5-5",
        "type": "multiple_choice",
        "question": "When a key stakeholder requests an unapproved scope addition directly from a developer, what should the Project Manager do first?",
        "options": [
          "Instruct the developer to implement the change immediately to please the stakeholder",
          "Evaluate the impact of the request and guide it through the formal Perform Integrated Change Control process",
          "Terminate the stakeholder contract immediately",
          "Deduct the cost from the contingency reserve without documentation"
        ],
        "correctAnswer": 1,
        "explanation": "All scope modifications must be evaluated for impact and processed through Perform Integrated Change Control."
      },
      {
        "id": "q5-6",
        "type": "identification",
        "question": "What 3-letter acronym refers to the board responsible for reviewing, evaluating, approving, or rejecting changes to project baselines?",
        "acceptedAnswers": [
          "ccb",
          "change control board"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "The Change Control Board (CCB) is the formally chartered group responsible for approving or rejecting baseline changes."
      }
    ]
  },
  "act-6": {
    "id": "act-6",
    "title": "PMP Agile & Hybrid Delivery Mastery (Weekdays Cohort)",
    "instructor": "Jordan Ramos",
    "category": "PMP Review (Weekdays)",
    "headerColor": "#d97706",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "crypto_knight",
    "description": "Assess hybrid project delivery, servant leadership, Kanban flow optimization, and value-driven delivery for weekday PMP candidates.",
    "learningObjectives": [
      "Apply servant leadership principles across cross-functional project teams",
      "Manage Work in Progress (WIP) limits and cycle time in Kanban workflows",
      "Tailor hybrid governance combining predictive milestones with agile iterations"
    ],
    "questions": [
      {
        "id": "q6-1",
        "type": "multiple_choice",
        "question": "In a hybrid project environment, what is the primary benefit of limiting Work in Progress (WIP) on a Kanban board?",
        "options": [
          "It maximizes individual multitasking across 10 concurrent tasks",
          "It exposes workflow bottlenecks and reduces task cycle time",
          "It eliminates the need for quality testing",
          "It prevents stakeholders from viewing project progress"
        ],
        "correctAnswer": 1,
        "explanation": "Limiting WIP reduces context-switching overhead, highlights bottlenecks, and improves throughput flow."
      },
      {
        "id": "q6-2",
        "type": "identification",
        "question": "What leadership philosophy prioritizes removing team impediments, coaching growth, and shielding the team from external distractions? (Hint: 2 words)",
        "acceptedAnswers": [
          "servant leadership",
          "servant leader"
        ],
        "placeholder": "Enter leadership style...",
        "explanation": "Servant leadership focuses on enabling team success by removing blockers and fostering self-organization."
      },
      {
        "id": "q6-3",
        "type": "sequence_order",
        "question": "Arrange the 4 stages of Tuckman Team Development Model in chronological order:",
        "correctOrder": [
          "Forming - Team members meet and learn project objectives and roles",
          "Storming - Team members navigate differing opinions and workflow friction",
          "Norming - Team establishes shared working agreements and constructive trust",
          "Performing - High-trust team executes autonomously with peak synergy"
        ],
        "initialOrder": [
          "Norming - Team establishes shared working agreements and constructive trust",
          "Forming - Team members meet and learn project objectives and roles",
          "Performing - High-trust team executes autonomously with peak synergy",
          "Storming - Team members navigate differing opinions and workflow friction"
        ],
        "explanation": "Tuckman model progresses through Forming, Storming, Norming, Performing (and Adjourning)."
      },
      {
        "id": "q6-4",
        "type": "matching",
        "question": "Match each Agile/Hybrid Metric in Column A with what it measures in Column B:",
        "pairs": [
          {
            "id": "m6-1",
            "left": "Cycle Time",
            "right": "Elapsed time from when work begins on an item until it is completed"
          },
          {
            "id": "m6-2",
            "left": "Lead Time",
            "right": "Total time from when an item is requested on the backlog to final delivery"
          },
          {
            "id": "m6-3",
            "left": "Sprint Velocity",
            "right": "Story points of completed user stories delivered within a single sprint"
          },
          {
            "id": "m6-4",
            "left": "Cumulative Flow Diagram",
            "right": "Visualizes work item stability across states to spot queues and bottlenecks"
          }
        ],
        "explanation": "Flow and velocity metrics help hybrid project managers forecast delivery and optimize throughput."
      },
      {
        "id": "q6-5",
        "type": "multiple_choice",
        "question": "Which artifact defines the behavioral norms, communication rules, and conflict resolution guidelines agreed upon by an agile team?",
        "options": [
          "Team Charter / Social Contract",
          "Vendor Invoice Ledger",
          "Procurement Statement of Work",
          "Corporate Articles of Incorporation"
        ],
        "correctAnswer": 0,
        "explanation": "A Team Charter (or working agreement) establishes shared ground rules and behavioral expectations."
      },
      {
        "id": "q6-6",
        "type": "identification",
        "question": "What 3-letter acronym represents the smallest buildable product version that delivers validated learning and core value to early users?",
        "acceptedAnswers": [
          "mvp",
          "minimum viable product"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "A Minimum Viable Product (MVP) delivers essential features early to gather real user feedback."
      }
    ]
  },
  "act-7": {
    "id": "act-7",
    "title": "CAPM Foundational Project Management Assessment",
    "instructor": "Jordan Ramos",
    "category": "Certified Associate in Project Management (CAPM)",
    "headerColor": "#2563eb",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "first_step",
    "description": "Validate foundational CAPM concepts across project management fundamentals, predictive scheduling, business analysis frameworks, and agile basics.",
    "learningObjectives": [
      "Distinguish project, program, and portfolio management hierarchies",
      "Construct Work Breakdown Structures (WBS) and network logic diagrams",
      "Execute business analysis requirements elicitation and validation"
    ],
    "questions": [
      {
        "id": "q7-1",
        "type": "multiple_choice",
        "question": "How does a Program differ from a standalone Project under PMI standards?",
        "options": [
          "A program is a group of related projects managed in a coordinated way to obtain benefits not available from managing them individually",
          "A program has no defined objectives or governance",
          "A program lasts less than 24 hours",
          "A program only manages routine daily bookkeeping"
        ],
        "correctAnswer": 0,
        "explanation": "Programs coordinate related projects and subsidiary activities to realize shared strategic benefits."
      },
      {
        "id": "q7-2",
        "type": "identification",
        "question": "In a Work Breakdown Structure (WBS), what term refers to the lowest-level deliverable where cost and duration can be reliably estimated and managed? (Hint: 2 words)",
        "acceptedAnswers": [
          "work package",
          "work packages"
        ],
        "placeholder": "Enter WBS lowest level...",
        "explanation": "A work package is the lowest level of each branch in the WBS used to estimate and control cost and schedule."
      },
      {
        "id": "q7-3",
        "type": "sequence_order",
        "question": "Arrange the 4 classic Predictive Project Life Cycle phases in chronological order:",
        "correctOrder": [
          "Initiating - Authorize the project and identify initial stakeholders",
          "Planning - Define scope, schedule, budget, and risk management plans",
          "Executing & Monitoring - Coordinate resources, build deliverables, and track variances",
          "Closing - Obtain formal deliverable acceptance and archive lessons learned"
        ],
        "initialOrder": [
          "Executing & Monitoring - Coordinate resources, build deliverables, and track variances",
          "Initiating - Authorize the project and identify initial stakeholders",
          "Closing - Obtain formal deliverable acceptance and archive lessons learned",
          "Planning - Define scope, schedule, budget, and risk management plans"
        ],
        "explanation": "Predictive project life cycles progress from Initiating to Planning, Executing/Monitoring & Controlling, and Closing."
      },
      {
        "id": "q7-4",
        "type": "matching",
        "question": "Match each Schedule Dependency Type in Column A with its relationship rule in Column B:",
        "pairs": [
          {
            "id": "m7-1",
            "left": "Finish-to-Start (FS)",
            "right": "Successor activity cannot start until predecessor activity has finished"
          },
          {
            "id": "m7-2",
            "left": "Start-to-Start (SS)",
            "right": "Successor activity cannot start until predecessor activity has started"
          },
          {
            "id": "m7-3",
            "left": "Finish-to-Finish (FF)",
            "right": "Successor activity cannot finish until predecessor activity has finished"
          },
          {
            "id": "m7-4",
            "left": "Total Float",
            "right": "Amount of time an activity can be delayed without delaying the project end date"
          }
        ],
        "explanation": "Precedence diagramming method (PDM) uses logical relationships and float to model critical schedules."
      },
      {
        "id": "q7-5",
        "type": "multiple_choice",
        "question": "In the CAPM Business Analysis domain, which role is primarily responsible for eliciting, analyzing, documenting, and validating stakeholder requirements?",
        "options": [
          "Business Analyst (BA)",
          "Facility Maintenance Supervisor",
          "External Freight Forwarder",
          "Payroll Clerk"
        ],
        "correctAnswer": 0,
        "explanation": "The Business Analyst collaborates with stakeholders and the PM to elicit, model, and validate solution requirements."
      },
      {
        "id": "q7-6",
        "type": "identification",
        "question": "What 4-letter matrix maps project tasks against roles using Responsible, Accountable, Consulted, and Informed designations?",
        "acceptedAnswers": [
          "raci",
          "raci matrix",
          "raci chart"
        ],
        "placeholder": "Enter 4-letter acronym...",
        "explanation": "A RACI matrix clarifies role responsibilities and decision-making accountability across deliverables."
      }
    ]
  },
  "act-8": {
    "id": "act-8",
    "title": "Strategic Management Tools & Competitive Analysis",
    "instructor": "Billy Fernandez",
    "category": "Strategic Management Tools",
    "headerColor": "#059669",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "crypto_knight",
    "description": "Evaluate corporate strategy frameworks including SWOT, PESTEL, Porter Five Forces, Balanced Scorecard, and OKR execution.",
    "learningObjectives": [
      "Conduct macro-environmental PESTEL and Porter Five Forces industry analyses",
      "Translate corporate vision into Balanced Scorecard perspectives and OKRs",
      "Prioritize strategic initiatives using portfolio value matrices"
    ],
    "questions": [
      {
        "id": "q8-1",
        "type": "multiple_choice",
        "question": "Which strategic management framework evaluates an organization across Financial, Customer, Internal Business Processes, and Learning & Growth perspectives?",
        "options": [
          "Balanced Scorecard (BSC)",
          "Daily Petty Cash Voucher",
          "Server Rack Wiring Diagram",
          "Single-Entry Bookkeeping Ledger"
        ],
        "correctAnswer": 0,
        "explanation": "Kaplan and Norton Balanced Scorecard balances financial metrics with customer, internal process, and learning drivers."
      },
      {
        "id": "q8-2",
        "type": "identification",
        "question": "What 4-letter strategic framework evaluates internal Strengths and Weaknesses alongside external Opportunities and Threats?",
        "acceptedAnswers": [
          "swot",
          "swot analysis"
        ],
        "placeholder": "Enter 4-letter acronym...",
        "explanation": "SWOT analysis synthesizes internal capabilities (Strengths, Weaknesses) and external market conditions (Opportunities, Threats)."
      },
      {
        "id": "q8-3",
        "type": "sequence_order",
        "question": "Arrange the 4 stages of the Strategic Management Cycle in logical execution order:",
        "correctOrder": [
          "Environmental Scanning - Analyze internal capabilities and external market shifts",
          "Strategy Formulation - Define corporate vision, differentiation, and strategic pillars",
          "Strategy Implementation - Align budgets, OKRs, and cross-functional initiatives",
          "Evaluation & Control - Monitor KPI scorecards and adapt strategic execution"
        ],
        "initialOrder": [
          "Strategy Implementation - Align budgets, OKRs, and cross-functional initiatives",
          "Environmental Scanning - Analyze internal capabilities and external market shifts",
          "Evaluation & Control - Monitor KPI scorecards and adapt strategic execution",
          "Strategy Formulation - Define corporate vision, differentiation, and strategic pillars"
        ],
        "explanation": "Strategic management flows from scanning the environment to formulating strategy, executing initiatives, and evaluating KPIs."
      },
      {
        "id": "q8-4",
        "type": "matching",
        "question": "Match each Strategic Tool in Column A with its analytical focus in Column B:",
        "pairs": [
          {
            "id": "m8-1",
            "left": "PESTEL Analysis",
            "right": "Evaluates Political, Economic, Social, Technological, Environmental, and Legal macro factors"
          },
          {
            "id": "m8-2",
            "left": "Porter Five Forces",
            "right": "Assesses industry attractiveness via supplier/buyer power, substitutes, new entrants, and rivalry"
          },
          {
            "id": "m8-3",
            "left": "Blue Ocean Strategy",
            "right": "Creates uncontested market space through value innovation rather than head-to-head price war"
          },
          {
            "id": "m8-4",
            "left": "Objectives & Key Results (OKRs)",
            "right": "Couples ambitious qualitative goals with 3-5 measurable outcome targets"
          }
        ],
        "explanation": "Each strategic tool targets a distinct layer of macro-environment, industry structure, value innovation, or execution alignment."
      },
      {
        "id": "q8-5",
        "type": "multiple_choice",
        "question": "In the BCG Growth-Share Matrix, business units with high market share in a slow-growing, mature industry that generate steady surplus cash are called:",
        "options": [
          "Cash Cows",
          "Question Marks",
          "Dogs",
          "Sunk Costs"
        ],
        "correctAnswer": 0,
        "explanation": "Cash Cows hold strong market share in mature markets and fund emerging Stars and Question Marks."
      },
      {
        "id": "q8-6",
        "type": "identification",
        "question": "What 3-letter goal-setting acronym stands for Objectives and Key Results?",
        "acceptedAnswers": [
          "okr",
          "okrs",
          "objectives and key results"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "OKRs align organizational and team priorities around qualitative Objectives and quantifiable Key Results."
      }
    ]
  },
  "act-9": {
    "id": "act-9",
    "title": "Enterprise Operational Excellence & Customized Program",
    "instructor": "Owen Castillo",
    "category": "Customized Program",
    "headerColor": "#7c3aed",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "streak_master",
    "description": "Assess custom enterprise workflows, Lean Six Sigma DMAIC problem-solving, cross-team SLA governance, and change adoption.",
    "learningObjectives": [
      "Apply the DMAIC continuous improvement cycle to enterprise bottlenecks",
      "Establish clear Service Level Agreements (SLAs) and operational handoffs",
      "Drive organizational change adoption using structured stakeholder readiness"
    ],
    "questions": [
      {
        "id": "q9-1",
        "type": "multiple_choice",
        "question": "In Lean Six Sigma process improvement, what is the primary focus of the Root Cause Analysis phase?",
        "options": [
          "Treating superficial symptoms temporarily without changing the process",
          "Identifying and verifying the underlying systemic drivers of process defects",
          "Deleting quality logs before audit review",
          "Increasing manual rework steps"
        ],
        "correctAnswer": 1,
        "explanation": "Root Cause Analysis uncovers the fundamental systemic causes of defects so permanent corrective controls can be implemented."
      },
      {
        "id": "q9-2",
        "type": "identification",
        "question": "What 5-letter acronym represents the process improvement cycle of Define, Measure, Analyze, Improve, and Control?",
        "acceptedAnswers": [
          "dmaic",
          "define measure analyze improve control"
        ],
        "placeholder": "Enter 5-letter acronym...",
        "explanation": "DMAIC (Define, Measure, Analyze, Improve, Control) is the core data-driven improvement cycle in Six Sigma."
      },
      {
        "id": "q9-3",
        "type": "sequence_order",
        "question": "Arrange the 4 steps of the PDCA (Plan-Do-Check-Act) Continuous Improvement Cycle in order:",
        "correctOrder": [
          "Plan - Identify the opportunity and design the target process improvement",
          "Do - Implement the change on a small-scale pilot basis",
          "Check - Measure pilot results against baseline target metrics",
          "Act - Standardize the improvement enterprise-wide or refine the cycle"
        ],
        "initialOrder": [
          "Check - Measure pilot results against baseline target metrics",
          "Plan - Identify the opportunity and design the target process improvement",
          "Act - Standardize the improvement enterprise-wide or refine the cycle",
          "Do - Implement the change on a small-scale pilot basis"
        ],
        "explanation": "Deming PDCA cycle iterates through Plan, Do, Check, and Act to sustain continuous operational improvement."
      },
      {
        "id": "q9-4",
        "type": "matching",
        "question": "Match each Operational Excellence Concept in Column A with its definition in Column B:",
        "pairs": [
          {
            "id": "m9-1",
            "left": "Kaizen",
            "right": "Continuous, incremental improvement engaging every level of the organization"
          },
          {
            "id": "m9-2",
            "left": "5 Whys Technique",
            "right": "Iterative interrogative method used to drill down to the root cause of a defect"
          },
          {
            "id": "m9-3",
            "left": "Value Stream Mapping",
            "right": "Visualizes material and information flow to eliminate non-value-adding waste"
          },
          {
            "id": "m9-4",
            "left": "Poka-Yoke",
            "right": "Mistake-proofing mechanism that prevents human errors before they become defects"
          }
        ],
        "explanation": "Lean tools eliminate waste, uncover root causes, and mistake-proof enterprise delivery."
      },
      {
        "id": "q9-5",
        "type": "multiple_choice",
        "question": "When rolling out a customized workflow across multiple business units, what reduces employee resistance most effectively?",
        "options": [
          "Early cross-functional involvement, transparent communication, and hands-on role training",
          "Announcing the change on the day of cutover without documentation",
          "Disabling support channels during transition week",
          "Withholding the rationale behind the workflow redesign"
        ],
        "correctAnswer": 0,
        "explanation": "Engaging champions early and providing clear training and rationale accelerates change adoption."
      },
      {
        "id": "q9-6",
        "type": "identification",
        "question": "What 3-letter acronym defines a formal commitment between a service provider and a client specifying target response and resolution times?",
        "acceptedAnswers": [
          "sla",
          "service level agreement"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "A Service Level Agreement (SLA) establishes measurable performance, availability, and responsiveness targets."
      }
    ]
  },
  "act-10": {
    "id": "act-10",
    "title": "Business Strategy Simulation (BSS) Executive Challenge",
    "instructor": "Billy Fernandez",
    "category": "Business Strategy Simulatuon",
    "headerColor": "#dc2626",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "sec_champ",
    "description": "Test executive decision-making across capital allocation, market expansion, pricing elasticity, and cross-functional trade-offs in the Business Strategy Simulation.",
    "learningObjectives": [
      "Balance short-term cash flow liquidity with long-term R&D and market positioning",
      "Analyze unit economics, contribution margin, and customer acquisition cost (CAC)",
      "Align pricing, capacity, and channel strategy across simulated market rounds"
    ],
    "questions": [
      {
        "id": "q10-1",
        "type": "multiple_choice",
        "question": "In a multi-round Business Strategy Simulation, what happens when a firm expands production capacity aggressively without matching demand growth?",
        "options": [
          "Fixed overhead and depreciation surge, depressing return on invested capital (ROIC)",
          "Unit fixed costs automatically drop to zero",
          "Competitors are forced to exit the industry immediately",
          "Working capital requirements disappear"
        ],
        "correctAnswer": 0,
        "explanation": "Excess idle capacity increases fixed overhead and capital charges per unit sold, hurting profitability and ROIC."
      },
      {
        "id": "q10-2",
        "type": "identification",
        "question": "What 3-letter financial metric measures the net gain or loss of an investment relative to its initial cost? (Hint: ROI)",
        "acceptedAnswers": [
          "roi",
          "return on investment"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "Return on Investment (ROI) evaluates capital efficiency by comparing net benefit to investment cost."
      },
      {
        "id": "q10-3",
        "type": "sequence_order",
        "question": "Arrange the 4 steps of a Business Strategy Simulation Decision Round in proper executive sequence:",
        "correctOrder": [
          "Audit prior-round financial statements, market share shifts, and competitor moves",
          "Forecast segment demand and align target positioning (cost leadership vs differentiation)",
          "Allocate capital across R&D, operations capacity, marketing, and talent",
          "Stress-test pro-forma cash flow projections before locking final round decisions"
        ],
        "initialOrder": [
          "Allocate capital across R&D, operations capacity, marketing, and talent",
          "Audit prior-round financial statements, market share shifts, and competitor moves",
          "Stress-test pro-forma cash flow projections before locking final round decisions",
          "Forecast segment demand and align target positioning (cost leadership vs differentiation)"
        ],
        "explanation": "Disciplined simulation teams diagnose market data, set strategy, allocate resources, and validate cash flow solvency."
      },
      {
        "id": "q10-4",
        "type": "matching",
        "question": "Match each Executive Financial Metric in Column A with its business interpretation in Column B:",
        "pairs": [
          {
            "id": "m10-1",
            "left": "Contribution Margin",
            "right": "Revenue remaining after variable costs to cover fixed expenses and profit"
          },
          {
            "id": "m10-2",
            "left": "Working Capital",
            "right": "Current assets minus current liabilities funding day-to-day operations"
          },
          {
            "id": "m10-3",
            "left": "LTV to CAC Ratio",
            "right": "Compares customer lifetime value against the cost to acquire a customer"
          },
          {
            "id": "m10-4",
            "left": "Operating Leverage",
            "right": "Sensitivity of operating income to changes in revenue based on fixed-to-variable cost mix"
          }
        ],
        "explanation": "Mastering unit economics and working capital prevents insolvency during rapid simulated growth."
      },
      {
        "id": "q10-5",
        "type": "multiple_choice",
        "question": "Under Michael Porter generic competitive strategies, trying to be both the lowest-cost producer and the highest-cost luxury differentiator simultaneously without clear focus often results in:",
        "options": [
          "Being stuck in the middle with conflicting cost structures and blurred brand positioning",
          "Guaranteed monopoly profits in every segment",
          "Zero customer churn",
          "Automatic exemption from market competition"
        ],
        "correctAnswer": 0,
        "explanation": "Firms that fail to commit to a coherent strategic value proposition risk getting stuck in the middle with sub-par returns."
      },
      {
        "id": "q10-6",
        "type": "identification",
        "question": "What 6-letter acronym represents Earnings Before Interest, Taxes, Depreciation, and Amortization?",
        "acceptedAnswers": [
          "ebitda"
        ],
        "placeholder": "Enter 6-letter acronym...",
        "explanation": "EBITDA measures core operational cash earnings before financing and accounting depreciation effects."
      }
    ]
  },
  "act-11": {
    "id": "act-11",
    "title": "Innovation through Design Thinking & Prototyping",
    "instructor": "Jobert Cruz",
    "category": "Innovation through Design Thinking",
    "headerColor": "#1368ce",
    "timePerQuestion": 45,
    "passingScore": 80,
    "showCorrectAnswers": true,
    "badgeAwarded": "first_step",
    "description": "Master human-centered design thinking, empathy mapping, rapid low-fidelity prototyping, and iterative user testing.",
    "learningObjectives": [
      "Conduct deep user empathy interviews and synthesize Point-of-View (POV) problem statements",
      "Facilitate divergent ideation and convergent concept selection",
      "Build rapid low-fidelity prototypes to test critical assumptions with real users"
    ],
    "questions": [
      {
        "id": "q11-1",
        "type": "multiple_choice",
        "question": "What is the primary goal of the Empathize phase in the Design Thinking framework?",
        "options": [
          "Pitch a finished product to investors before talking to users",
          "Set aside assumptions and gain deep, first-hand insight into users real needs and pain points",
          "Write production database schemas immediately",
          "Finalize legal patent filings"
        ],
        "correctAnswer": 1,
        "explanation": "Empathy grounds innovation in genuine human needs observed through interviews, shadowing, and immersion."
      },
      {
        "id": "q11-2",
        "type": "identification",
        "question": "In Design Thinking ideation, what 3-word phrase (or 3-letter acronym HMW) is used to reframe user pain points into open-ended innovation prompts?",
        "acceptedAnswers": [
          "how might we",
          "hmw"
        ],
        "placeholder": "Enter 3-word phrase or HMW...",
        "explanation": "How Might We (HMW) questions frame problems optimistically to invite diverse creative solutions."
      },
      {
        "id": "q11-3",
        "type": "sequence_order",
        "question": "Arrange the first 4 core stages of the Stanford d.school Design Thinking Process in sequence:",
        "correctOrder": [
          "Empathize - Observe and interview users to uncover unmet needs",
          "Define - Synthesize insights into a clear, human-centered problem statement",
          "Ideate - Brainstorm a wide range of creative solution concepts without judgment",
          "Prototype - Build quick, inexpensive representations to test key hypotheses"
        ],
        "initialOrder": [
          "Ideate - Brainstorm a wide range of creative solution concepts without judgment",
          "Empathize - Observe and interview users to uncover unmet needs",
          "Prototype - Build quick, inexpensive representations to test key hypotheses",
          "Define - Synthesize insights into a clear, human-centered problem statement"
        ],
        "explanation": "Design Thinking flows from Empathize to Define, Ideate, Prototype, and Test."
      },
      {
        "id": "q11-4",
        "type": "matching",
        "question": "Match each Design Thinking Artifact in Column A with its purpose in Column B:",
        "pairs": [
          {
            "id": "m11-1",
            "left": "Empathy Map",
            "right": "Captures what a target user Says, Thinks, Does, and Feels"
          },
          {
            "id": "m11-2",
            "left": "Customer Journey Map",
            "right": "Visualizes end-to-end user touchpoints, emotions, and friction moments"
          },
          {
            "id": "m11-3",
            "left": "Low-Fidelity Prototype",
            "right": "Paper sketch or clickable wireframe built rapidly to test core assumptions"
          },
          {
            "id": "m11-4",
            "left": "Point-of-View (POV) Statement",
            "right": "Articulates User + Need + Surprising Insight to anchor ideation"
          }
        ],
        "explanation": "Design thinking artifacts turn raw user observations into actionable problem frames and testable prototypes."
      },
      {
        "id": "q11-5",
        "type": "multiple_choice",
        "question": "Why do Design Thinking teams build low-fidelity prototypes early instead of polished high-cost builds?",
        "options": [
          "To fail fast and learn cheaply before committing engineering resources to unvalidated ideas",
          "Because users prefer broken software in production",
          "To avoid ever testing with real customers",
          "To extend project timelines by 24 months"
        ],
        "correctAnswer": 0,
        "explanation": "Low-fidelity prototypes invite honest user critique and allow teams to pivot quickly at minimal cost."
      },
      {
        "id": "q11-6",
        "type": "identification",
        "question": "What 3-letter acronym refers to a human-centered problem statement combining User, Need, and Insight? (Hint: Point of View)",
        "acceptedAnswers": [
          "pov",
          "point of view",
          "point-of-view"
        ],
        "placeholder": "Enter 3-letter acronym...",
        "explanation": "A Point-of-View (POV) statement synthesizes who the user is, their core need, and the underlying insight."
      }
    ]
  }
};

export const getActiveQuizDatabase = () => {
  try {
    const custom = localStorage.getItem('crossquest_quiz_database');
    if (custom) {
      return { ...QUIZ_DATABASE, ...JSON.parse(custom) };
    }
  } catch (e) {
    console.warn('Could not read custom quiz database:', e);
  }
  return QUIZ_DATABASE;
};

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
