// CrossQuest Enterprise Learning Quiz Database
// Aligned with real Crossworks pilot training programs and lead instructors:
// 1. act-1: Agile PME & Project Management Challenge (Lead Trainer Joey Ramos)
// 2. act-2: Executive Communication & CONNECT Simulation (Lead Trainer Billy Fernandez)
// 3. act-3: Supervisory Mastery & High-Impact Coaching (Lead Trainer Jobert Cruz)
// 4. act-4: Business Continuity & ISO 31000 Risk Management (Lead Trainer Owen Castillo)

export const QUIZ_DATABASE = {
  'act-1': {
    id: 'act-1',
    title: 'Agile PME & Project Management Challenge',
    instructor: 'Lead Trainer Joey Ramos',
    category: 'Project Management',
    headerColor: '#1368ce',
    timePerQuestion: 45,
    passingScore: 80,
    showCorrectAnswers: true,
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
        question: 'In Agile Project Management, what is the primary operational objective of the Daily Standup ceremony?',
        options: [
          'Estimate annual resource budgets',
          'Synchronize team progress and identify blockers within 15 minutes',
          'Conduct individual formal performance appraisals',
          'Deliver finalized stakeholder status invoices'
        ],
        correctAnswer: 1,
        explanation: 'Daily Standup ensures rapid team synchronization and early blocker identification within a strict 15-minute timebox.'
      },
      {
        id: 'q1-2',
        type: 'identification',
        question: 'What project metric represents the ratio of Earned Value (EV) to Planned Value (PV)? (Hint: 3-letter acronym SPI)',
        acceptedAnswers: ['spi', 'schedule performance index'],
        placeholder: 'Enter 3-letter acronym...',
        explanation: 'Schedule Performance Index (SPI = EV / PV) measures project schedule efficiency.'
      },
      {
        id: 'q1-3',
        type: 'sequence_order',
        question: 'Arrange the 4 core phases of the Critical Path Method (CPM) and Project Scheduling in correct chronological sequence:',
        correctOrder: [
          'Define distinct project activities and milestones',
          'Establish precedence dependencies and work breakdown structure (WBS)',
          'Estimate task durations and identify the critical path',
          'Calculate early/late start dates and monitor total float'
        ],
        initialOrder: [
          'Estimate task durations and identify the critical path',
          'Define distinct project activities and milestones',
          'Calculate early/late start dates and monitor total float',
          'Establish precedence dependencies and work breakdown structure (WBS)'
        ],
        explanation: 'Critical path scheduling begins with defining deliverables, structuring dependencies, estimating durations, and analyzing float along the critical path.'
      },
      {
        id: 'q1-4',
        type: 'multiple_choice',
        question: 'In the Scrum framework, who possesses sole authority to cancel a Sprint prior to its scheduled completion?',
        options: [
          'Scrum Master',
          'Development Team Lead',
          'Product Owner',
          'Project Management Office (PMO) Director'
        ],
        correctAnswer: 2,
        explanation: 'Only the Product Owner has the authority to cancel a Sprint, typically if the sprint goal becomes obsolete.'
      },
      {
        id: 'q1-5',
        type: 'multiple_choice',
        question: 'What is the primary operational purpose of a Project Retrospective ceremony?',
        options: [
          'Determine salary adjustments for the iteration',
          'Inspect team dynamics and adapt processes for continuous operational improvement',
          'Bill corporate clients for completed story points',
          'Lock code repositories permanently'
        ],
        correctAnswer: 1,
        explanation: 'Retrospectives empower the team to reflect on recent work and implement concrete process improvements for upcoming sprints.'
      },
      {
        id: 'q1-6',
        type: 'matching',
        question: 'Match each Agile & Project Management artifact in Column A with its exact operational definition in Column B:',
        pairs: [
          { id: 'm1-1', left: 'Product Backlog', right: 'Single prioritized source of requirements for product features' },
          { id: 'm1-2', left: 'Sprint Burndown Chart', right: 'Visual representation of work remaining versus elapsed sprint time' },
          { id: 'm1-3', left: 'Definition of Done (DoD)', right: 'Agreed quality checklist required before an increment is shippable' },
          { id: 'm1-4', left: 'Work Breakdown Structure', right: 'Hierarchical decomposition of total project scope into deliverables' }
        ],
        explanation: 'Backlogs prioritize features, burndown charts track velocity, DoD ensures shippable quality, and WBS scopes deliverables.'
      },
      {
        id: 'q1-7',
        type: 'identification',
        question: 'In project cost management, what metric calculates Earned Value (EV) minus Actual Cost (AC)? (Hint: 2 words or CV)',
        acceptedAnswers: ['cost variance', 'cv'],
        placeholder: 'Enter metric name or acronym...',
        explanation: 'Cost Variance (CV = EV - AC) indicates whether a project is over or under budget.'
      },
      {
        id: 'q1-8',
        type: 'multiple_choice',
        question: 'What Agile ceremony is dedicated to sizing backlog user stories and clarifying acceptance criteria before sprint planning?',
        options: [
          'Backlog Refinement / Grooming',
          'Sprint Review',
          'Sprint Retrospective',
          'Daily Scrum'
        ],
        correctAnswer: 0,
        explanation: 'Backlog Refinement ensures user stories are estimated, clear, and ready for upcoming sprint planning.'
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
    showCorrectAnswers: true,
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
        question: 'In the Crossworks CONNECT executive communication framework, what is the crucial initial step in high-stakes negotiations?',
        options: [
          'State bottom-line budget immediately',
          'Establish rapport and diagnose underlying stakeholder interests',
          'Issue a formal legal ultimatum',
          'Delegate communication entirely to junior staff'
        ],
        correctAnswer: 1,
        explanation: 'Diagnosing stakeholder interests before stating rigid positions builds trust and reveals shared value opportunities.'
      },
      {
        id: 'q2-2',
        type: 'identification',
        question: 'What executive briefing methodology dictates stating the core recommendation or key finding first, followed by supporting logic? (Hint: 2 words)',
        acceptedAnswers: ['pyramid principle', 'the pyramid principle', 'minto pyramid', 'pyramid'],
        placeholder: 'Enter briefing structure name...',
        explanation: 'The Pyramid Principle structures executive communications top-down, leading directly with the answer/recommendation.'
      },
      {
        id: 'q2-3',
        type: 'sequence_order',
        question: 'Arrange the 4 stages of the CONNECT Strategic Stakeholder Alignment process in proper operational sequence:',
        correctOrder: [
          'Identify key stakeholder personas and their organizational drivers',
          'Diagnose conflicting interests and shared business goals',
          'Craft tailored value propositions and strategic briefings',
          'Facilitate consensus alignment and document agreed commitments'
        ],
        initialOrder: [
          'Craft tailored value propositions and strategic briefings',
          'Identify key stakeholder personas and their organizational drivers',
          'Facilitate consensus alignment and document agreed commitments',
          'Diagnose conflicting interests and shared business goals'
        ],
        explanation: 'Effective stakeholder alignment requires mapping personas, diagnosing underlying motivations, articulating value, and securing commitments.'
      },
      {
        id: 'q2-4',
        type: 'multiple_choice',
        question: 'Which communication channel possesses the highest information richness for resolving high-friction cross-functional disputes?',
        options: [
          'Company-wide text broadcast',
          'Face-to-face or interactive video dialogue',
          'Automated system email notification',
          'Shared spreadsheet comment thread'
        ],
        correctAnswer: 1,
        explanation: 'Face-to-face and interactive dialogue provides rich non-verbal cues, tone feedback, and rapid clarification.'
      },
      {
        id: 'q2-5',
        type: 'multiple_choice',
        question: 'In active listening, what technique involves restating the speaker emotional state and core message in your own words?',
        options: [
          'Passive reception',
          'Reflective paraphrasing',
          'Defensive rebuttal',
          'Selective silence'
        ],
        correctAnswer: 1,
        explanation: 'Reflective paraphrasing confirms mutual understanding and demonstrates genuine empathy.'
      },
      {
        id: 'q2-6',
        type: 'matching',
        question: 'Match each Communication Principle in Column A with its practical executive application in Column B:',
        pairs: [
          { id: 'm2-1', left: 'Pyramid Principle', right: 'Lead with conclusions, followed by structured supporting pillars' },
          { id: 'm2-2', left: 'Empathic Inquiry', right: 'Clarify unstated concerns through open-ended discovery questions' },
          { id: 'm2-3', left: 'Non-Defensive Reframe', right: 'Transform critical feedback into collaborative problem-solving' },
          { id: 'm2-4', left: 'Executive Cadence', right: 'Deliver predictable, concise visual KPI summaries to the C-suite' }
        ],
        explanation: 'Executive clarity requires structured pyramids, empathic questioning, constructive reframing, and predictable cadences.'
      },
      {
        id: 'q2-7',
        type: 'identification',
        question: 'What psychological condition describes an environment where team members feel safe to voice concerns, challenge ideas, and admit mistakes without fear of retribution? (Hint: 2 words)',
        acceptedAnswers: ['psychological safety', 'psychological security'],
        placeholder: 'Enter leadership term...',
        explanation: 'Psychological safety is the shared belief that team members will not be embarrassed, rejected, or punished for speaking up.'
      },
      {
        id: 'q2-8',
        type: 'multiple_choice',
        question: 'When presenting high-level strategic proposals to executive decision-makers, what approach is most persuasive?',
        options: [
          'Reading every bullet point verbatim from 40 technical slides',
          'Focusing on quantifiable business outcomes, revenue impact, and strategic risk mitigations',
          'Withholding all financial projections until the final slide',
          'Debating defensive points during introductory remarks'
        ],
        correctAnswer: 1,
        explanation: 'Executives prioritize decision-oriented briefs centered on financial ROI, strategic alignment, and risk management.'
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
    showCorrectAnswers: true,
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
        question: 'In the internationally recognized GROW coaching model, what does the letter R signify?',
        options: [
          'Reporting metrics',
          'Reality - objectively assessing the current situation',
          'Reimbursement',
          'Reprimand'
        ],
        correctAnswer: 1,
        explanation: 'Reality explores the coachee current situation, challenges, and factual context without imposing subjective judgment.'
      },
      {
        id: 'q3-2',
        type: 'identification',
        question: 'In the GROW coaching model, which stage is dedicated to identifying concrete next actions, accountability, and timelines? (Hint: Will or Way Forward)',
        acceptedAnswers: ['will', 'way forward', 'wrap up', 'what next'],
        placeholder: 'Enter GROW stage name...',
        explanation: 'Will (or Way Forward) commits the coachee to specific, actionable steps, completion timelines, and accountability.'
      },
      {
        id: 'q3-3',
        type: 'sequence_order',
        question: 'Arrange the 4 phases of the GROW Coaching Framework in standard coaching order:',
        correctOrder: [
          'Goal - Define the specific target outcome or developmental aspiration',
          'Reality - Explore current challenges, strengths, and factual context',
          'Options - Brainstorm all possible pathways, strategies, and resources',
          'Will - Commit to concrete actions, measurable milestones, and accountability'
        ],
        initialOrder: [
          'Options - Brainstorm all possible pathways, strategies, and resources',
          'Goal - Define the specific target outcome or developmental aspiration',
          'Will - Commit to concrete actions, measurable milestones, and accountability',
          'Reality - Explore current challenges, strengths, and factual context'
        ],
        explanation: 'Coaching flows naturally from setting the Goal, exploring Reality, generating creative Options, and securing the Will to act.'
      },
      {
        id: 'q3-4',
        type: 'multiple_choice',
        question: 'Under Situational Leadership theory, which leadership style is most effective for an employee who possesses high competence and high commitment?',
        options: [
          'Directing / Telling (S1)',
          'Coaching / Selling (S2)',
          'Supporting / Participating (S3)',
          'Delegating (S4)'
        ],
        correctAnswer: 3,
        explanation: 'Delegating (S4) empowers highly competent and committed individuals with autonomy and operational trust.'
      },
      {
        id: 'q3-5',
        type: 'multiple_choice',
        question: 'When transitioning from individual contributor to team supervisor, what represents the primary mindset shift?',
        options: [
          'Completing technical tasks faster than all subordinates',
          'Achieving operational outcomes by developing, empowering, and coaching others',
          'Retaining exclusive control over all task execution',
          'Avoiding transparent communication with team members'
        ],
        correctAnswer: 1,
        explanation: 'Supervision shifts focus from individual task execution to organizational enablement, team coaching, and strategic alignment.'
      },
      {
        id: 'q3-6',
        type: 'matching',
        question: 'Match each Supervisory Leadership Competency in Column A with its definition in Column B:',
        pairs: [
          { id: 'm3-1', left: 'Delegation with Autonomy', right: 'Assigning outcome responsibility while granting execution freedom' },
          { id: 'm3-2', left: 'Constructive Feedback', right: 'Providing timely, behavior-specific, forward-looking guidance' },
          { id: 'm3-3', left: 'Conflict Resolution', right: 'Facilitating collaborative win-win solutions to interpersonal friction' },
          { id: 'm3-4', left: 'Performance Coaching', right: 'Unlocking potential through structured inquiry and reflective inquiry' }
        ],
        explanation: 'Effective supervisors empower through delegation, coach through inquiry, provide actionable feedback, and resolve team friction.'
      },
      {
        id: 'q3-7',
        type: 'identification',
        question: 'What type of feedback focuses on future behaviors and strategic solutions rather than dwelling exclusively on past mistakes? (Hint: 2 words, Feed...)',
        acceptedAnswers: ['feedforward', 'feed forward', 'constructive feedback'],
        placeholder: 'Enter feedback term...',
        explanation: 'Feedforward provides positive, solution-oriented suggestions for future performance rather than dwelling on past errors.'
      },
      {
        id: 'q3-8',
        type: 'multiple_choice',
        question: 'Under situational leadership theory, what style combines high directive behavior with high supportive behavior?',
        options: [
          'Coaching / Selling',
          'Delegating',
          'Laissez-faire',
          'Autocratic directing'
        ],
        correctAnswer: 0,
        explanation: 'Coaching (S2) balances direct guidance with high personal support and two-way dialogue.'
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
    showCorrectAnswers: true,
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
        question: 'According to the ISO 31000 international standard, how is Risk formally defined?',
        options: [
          'An inevitable financial loss',
          'The effect of uncertainty on objectives',
          'A catastrophic natural disaster event',
          'An unmonitored software outage exceeding 4 hours'
        ],
        correctAnswer: 1,
        explanation: 'ISO 31000 formally defines risk as the effect of uncertainty on organizational objectives.'
      },
      {
        id: 'q4-2',
        type: 'identification',
        question: 'In Business Continuity Planning, what 3-letter acronym represents the maximum acceptable duration of disruption before service restoration? (Hint: RTO)',
        acceptedAnswers: ['rto', 'recovery time objective'],
        placeholder: 'Enter 3-letter acronym...',
        explanation: 'Recovery Time Objective (RTO) dictates the maximum tolerable duration before an outage must be restored.'
      },
      {
        id: 'q4-3',
        type: 'sequence_order',
        question: 'Arrange the 4 steps of the ISO 31000 Risk Assessment process in standard operational sequence:',
        correctOrder: [
          'Risk Identification - Uncover potential threat vectors and vulnerabilities',
          'Risk Analysis - Estimate the likelihood and consequence of each threat',
          'Risk Evaluation - Prioritize risks against corporate appetite and tolerance',
          'Risk Treatment - Deploy mitigation controls, transfer, or contingency plans'
        ],
        initialOrder: [
          'Risk Evaluation - Prioritize risks against corporate appetite and tolerance',
          'Risk Identification - Uncover potential threat vectors and vulnerabilities',
          'Risk Treatment - Deploy mitigation controls, transfer, or contingency plans',
          'Risk Analysis - Estimate the likelihood and consequence of each threat'
        ],
        explanation: 'Risk management follows Identification, Analysis of likelihood/impact, Evaluation against thresholds, and targeted Treatment.'
      },
      {
        id: 'q4-4',
        type: 'multiple_choice',
        question: 'In enterprise risk assessment matrices, what two fundamental dimensions calculate the overall risk rating score?',
        options: [
          'Headcount and office footprint',
          'Likelihood (Probability) and Impact (Consequence)',
          'Network latency and disk capacity',
          'Employee turnover and market inflation'
        ],
        correctAnswer: 1,
        explanation: 'Risk Severity is calculated by evaluating the Likelihood of occurrence against the magnitude of operational Impact.'
      },
      {
        id: 'q4-5',
        type: 'multiple_choice',
        question: 'What differentiates Recovery Point Objective (RPO) from Recovery Time Objective (RTO)?',
        options: [
          'RPO measures maximum tolerable data loss in time, while RTO measures system downtime duration',
          'RPO and RTO are completely identical metrics',
          'RPO applies only to physical hardware fire drills',
          'RTO measures financial penalties in local currency'
        ],
        correctAnswer: 0,
        explanation: 'RPO defines allowable data loss tolerance (e.g., backup frequency), whereas RTO defines allowable system downtime duration.'
      },
      {
        id: 'q4-6',
        type: 'matching',
        question: 'Match each Risk Management Concept in Column A with its exact ISO 31000 definition in Column B:',
        pairs: [
          { id: 'm4-1', left: 'Business Impact Analysis (BIA)', right: 'Quantifies operational impacts of disruptions over time' },
          { id: 'm4-2', left: 'Recovery Time Objective (RTO)', right: 'Target timeframe for restoring critical business activities' },
          { id: 'm4-3', left: 'Recovery Point Objective (RPO)', right: 'Maximum tolerable data loss measured back in time' },
          { id: 'm4-4', left: 'Risk Treatment Plan', right: 'Structured actions to mitigate, avoid, or transfer prioritized risk' }
        ],
        explanation: 'BIA identifies mission-critical dependencies, RTO limits downtime, RPO limits data loss, and Treatment controls risk.'
      },
      {
        id: 'q4-7',
        type: 'identification',
        question: 'In a Business Continuity Plan, what formal assessment quantifies the operational and financial impact of disruptions across business units? (Hint: 3 words or BIA)',
        acceptedAnswers: ['business impact analysis', 'bia'],
        placeholder: 'Enter assessment name or acronym...',
        explanation: 'Business Impact Analysis (BIA) quantifies operational downtime consequences and establishes recovery priorities.'
      },
      {
        id: 'q4-8',
        type: 'multiple_choice',
        question: 'When treating an identified risk, choosing to purchase commercial insurance against asset loss is an example of which risk response strategy?',
        options: [
          'Risk Transfer',
          'Risk Avoidance',
          'Risk Acceptance',
          'Risk Mitigation'
        ],
        correctAnswer: 0,
        explanation: 'Purchasing insurance or contracting third-party guarantees transfers financial risk exposure to another party.'
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
