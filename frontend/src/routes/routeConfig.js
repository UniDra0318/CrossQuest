import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldAlert, 
  Settings, 
  Building2, 
  BarChart3, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Award, 
  GraduationCap 
} from 'lucide-react';

export const ROLE_HOME = {
  admin: '/admin',
  account_manager: '/am',
  trainer: '/trainer',
  finance: '/finance',
  trainee: '/home',
};

export const ROUTES = [
  // path, roles, nav label (null = not in sidebar), title, page id, icon
  // Admin
  { path: '/admin',          roles: ['admin'], label: 'Home',              title: 'Overview',                      page: 'admin_overview',     icon: LayoutDashboard },
  { path: '/admin/records',  roles: ['admin'], label: 'Training Records',  title: 'Training Records Vault',        page: 'records_vault',       icon: FileText },
  { path: '/admin/quizzes',  roles: ['admin'], label: 'Quizzes and Teams', title: 'Quizzes & Teams (Global Scope)', page: 'admin_quizzes',      icon: Sparkles },
  { path: '/admin/people',   roles: ['admin'], label: 'People and Access', title: 'People & Attribute Authority',  page: 'attribute_authority', icon: Users },
  { path: '/admin/alerts',   roles: ['admin'], label: 'Alerts',            title: 'Anomaly Detection & Alerts',    page: 'anomalies',           icon: ShieldAlert },
  { path: '/admin/settings', roles: ['admin'], label: 'Settings',          title: 'System Settings & Baseline',    page: 'system_settings',     icon: Settings },

  // Account Manager
  { path: '/am',             roles: ['account_manager'], label: 'Sessions', title: 'Training Sessions',            page: 'am_sessions',        icon: LayoutDashboard },
  { path: '/am/clients',     roles: ['account_manager'], label: 'Clients',  title: 'Assigned Client Companies',    page: 'assigned_clients',   icon: Building2 },
  { path: '/am/reports',     roles: ['account_manager'], label: 'Reports',  title: 'Compliance & Audit Reports',   page: 'compliance_reports', icon: BarChart3 },
  { path: '/am/records',     roles: ['account_manager'], label: null,       title: 'Training Records Vault',        page: 'records_vault',       icon: FileText },

  // Trainer
  { path: '/trainer',              roles: ['trainer'], label: 'Sessions',          title: 'Training Sessions',        page: 'trainer_courses',        icon: LayoutDashboard },
  { path: '/trainer/sessions/:id', roles: ['trainer'], label: null,                title: 'Session Cohort Details',   page: 'trainer_session_detail', icon: BookOpen },
  { path: '/trainer/quizzes',      roles: ['trainer'], label: 'Quizzes and Teams', title: 'Quizzes & Teams Studio',   page: 'quiz_creator',           icon: Sparkles },
  { path: '/trainer/results',      roles: ['trainer'], label: 'Results',           title: 'Session Analytics',        page: 'trainer_analytics',      icon: BarChart3 },

  // Finance
  { path: '/finance',         roles: ['finance'], label: 'Records',            title: 'Trainee Training Records',     page: 'company_trainees',       icon: FileText },
  { path: '/finance/reports', roles: ['finance'], label: 'Reports',            title: 'Compliance & Audit Reports',   page: 'audit_certificate',      icon: ShieldCheck },
  { path: '/finance/import',  roles: ['finance'], label: 'Import & Reconcile', title: 'Import & Reconciliation Desk', page: 'finance_reconciliation', icon: LayoutDashboard },

  // Trainee
  { path: '/home',              roles: ['trainee'], label: 'Home',                 title: 'Trainee Quest Hub',             page: 'trainee_quest',     icon: Flame },
  { path: '/home/trainings',    roles: ['trainee'], label: 'My Trainings',         title: 'My Enrolled Courses',          page: 'trainee_trainings', icon: BookOpen },
  { path: '/home/certificates', roles: ['trainee'], label: 'Credentials',          title: 'Credentials & Certificates',   page: 'trainee_certs',     icon: Award },
  { path: '/home/quizzes',      roles: ['trainee'], label: 'Quizzes',              title: 'Quiz Arena & Challenges',      page: 'trainee_quiz',      icon: GraduationCap },
  { path: '/home/badges',       roles: ['trainee'], label: 'Badges & Leaderboard', title: 'Badges & Leaderboard',         page: 'trainee_badges',    icon: Sparkles },

  // Cryptographic Lab (Admin Only - thesis defense & verification)
  { path: '/demo/crypto-lab',   roles: ['admin'], label: null, title: 'Cryptographic Sandbox Lab', page: 'crypto_lab' },
  { path: '/admin/crypto-lab',  roles: ['admin'], label: null, title: 'Cryptographic Sandbox Lab', page: 'crypto_lab' },
];
