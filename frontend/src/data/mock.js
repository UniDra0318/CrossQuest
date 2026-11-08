export const learner = {
  name: 'Juan Dela Cruz',
  title: 'Trainee Analyst',
  role: 'trainee',
  organization: 'San Miguel Conglomerate Holdings',
  initials: 'JD',
  streak: 7,
  points: 12877,
  level: 4,
};

export const quests = [
  {
    id: 'act-1',
    title: 'Agile PME & Project Management Challenge',
    instructor: 'Lead Trainer Joey Ramos',
    questionsCount: '5 QUESTIONS',
    track: 'infosec',
    category: 'Project Management',
    completed: true,
    score: 94,
    accuracy: '94% accuracy',
    progress: [true, true, true, false],
  },
  {
    id: 'act-2',
    title: 'Executive Communication & CONNECT Simulation',
    instructor: 'Lead Trainer Billy Fernandez',
    questionsCount: '5 QUESTIONS',
    track: 'access',
    category: 'Executive Leadership',
    completed: true,
    score: 100,
    accuracy: '100% accuracy',
    progress: [true, true, true, true],
  },
  {
    id: 'act-3',
    title: 'Supervisory Mastery & High-Impact Coaching',
    instructor: 'Lead Trainer Jobert Cruz',
    questionsCount: '5 QUESTIONS',
    track: 'privacy',
    category: 'Supervisory Mastery',
    completed: true,
    score: 88,
    accuracy: '88% accuracy',
    progress: [true, true, true, false],
  },
  {
    id: 'act-4',
    title: 'Business Continuity & ISO 31000 Risk Management',
    instructor: 'Lead Trainer Owen Castillo',
    questionsCount: '5 QUESTIONS',
    track: 'database',
    category: 'Risk & Governance',
    completed: false,
    score: null,
    accuracy: 'Assigned · Due in 3d',
    progress: [false, false, false, false],
  },
];

export const badges = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Completed orientation modules',
    icon: 'star',
    hi: '#ffe08a',
    lo: '#ffc53d',
    rim: '#d99a00',
    fg: '#17102b',
  },
  {
    id: 'security-champion',
    title: 'Security Champion',
    description: 'Aced Security & Compliance Assessment',
    icon: 'shield',
    hi: '#6fa8ff',
    lo: '#1d6fe0',
    rim: '#124a9e',
    fg: '#ffffff',
  },
  {
    id: 'seven-day-streak',
    title: '7-Day Streak',
    description: 'Active training 7 consecutive days',
    icon: 'flame',
    hi: '#ffb57a',
    lo: '#ff7a1a',
    rim: '#b84f00',
    fg: '#17102b',
  },
  {
    id: 'security-decoder',
    title: 'Security Decoder',
    description: 'Verified policy attribute satisfaction',
    icon: 'zap',
    hi: '#a97cf5',
    lo: '#6a2bd9',
    rim: '#3b1590',
    fg: '#ffffff',
  },
];

// Monday to Sunday: true = trained that day.
export const week = [true, true, true, true, true, true, true];

// Placeholder names/rank until the real leaderboard endpoint exists.
export const leaderboard = {
  top: [
    { rank: 1, name: '[Name]' },
    { rank: 2, name: '[Name]' },
    { rank: 3, name: '[Name]' },
  ],
  myRank: 1,
};
