import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldAlert, 
  Settings, 
  Building2, 
  BarChart3, 
  BookOpen, 
  CheckSquare, 
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
  // path, roles, nav label (null = not in sidebar), page id, icon
  // Admin
  { path: '/admin',          roles: ['admin'], label: 'Home',              page: 'admin_overview',     icon: LayoutDashboard },
  { path: '/admin/records',  roles: ['admin'], label: 'Training Records',  page: 'records_vault',       icon: FileText },
  { path: '/admin/people',   roles: ['admin'], label: 'People and Access', page: 'attribute_authority', icon: Users },
  { path: '/admin/alerts',   roles: ['admin'], label: 'Alerts',            page: 'anomalies',           icon: ShieldAlert },
  { path: '/admin/settings', roles: ['admin'], label: 'Settings',          page: 'system_settings',     icon: Settings },

  // Account Manager
  { path: '/am',             roles: ['account_manager'], label: 'Sessions', page: 'am_sessions',        icon: LayoutDashboard },
  { path: '/am/clients',     roles: ['account_manager'], label: 'Clients',  page: 'assigned_clients',   icon: Building2 },
  { path: '/am/reports',     roles: ['account_manager'], label: 'Reports',  page: 'compliance_reports', icon: BarChart3 },
  { path: '/am/records',     roles: ['account_manager'], label: null,       page: 'records_vault',       icon: FileText },

  // Trainer
  { path: '/trainer',          roles: ['trainer'], label: 'Home',              page: 'trainer_courses',   icon: LayoutDashboard },
  { path: '/trainer/sessions', roles: ['trainer'], label: 'My Sessions',       page: 'trainee_roster',    icon: BookOpen },
  { path: '/trainer/grade',    roles: ['trainer'], label: 'Session Sign-off',  page: 'grade_entry',       icon: CheckSquare },
  { path: '/trainer/quizzes',  roles: ['trainer'], label: 'Quizzes and Teams', page: 'quiz_creator',      icon: Sparkles },
  { path: '/trainer/results',  roles: ['trainer'], label: 'Results',           page: 'trainer_analytics', icon: BarChart3 },

  // Finance
  { path: '/finance',         roles: ['finance'], label: 'Records',            page: 'company_trainees',       icon: FileText },
  { path: '/finance/reports', roles: ['finance'], label: 'Reports',            page: 'audit_certificate',      icon: ShieldCheck },
  { path: '/finance/import',  roles: ['finance'], label: 'Import & Reconcile', page: 'finance_reconciliation', icon: LayoutDashboard },

  // Trainee
  { path: '/home',              roles: ['trainee'], label: 'Home',                 page: 'trainee_quest',  icon: Flame },
  { path: '/home/certificates', roles: ['trainee'], label: 'Certificates',         page: 'trainee_certs',  icon: Award },
  { path: '/home/quizzes',      roles: ['trainee'], label: 'Quizzes',              page: 'trainee_quiz',   icon: GraduationCap },
  { path: '/home/badges',       roles: ['trainee'], label: 'Badges & Leaderboard', page: 'trainee_badges', icon: Sparkles },

  // Dev & Crypto Lab (Admin only)
  { path: '/demo/crypto-lab',   roles: ['admin'], label: null, page: 'crypto_lab' },
];
