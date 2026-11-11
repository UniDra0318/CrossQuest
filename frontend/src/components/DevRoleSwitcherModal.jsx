import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Zap, 
  Check, 
  Shield, 
  Key, 
  Building2, 
  GraduationCap, 
  Award, 
  Search, 
  Flame, 
  Lock,
  Building,
  User
} from 'lucide-react';
import { useAuth, DEMO_STATUS_MIX } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ROLE_HOME } from '../routes/routeConfig';

export default function DevRoleSwitcherModal({ isOpen, onClose }) {
  const { currentUser, loginRole, DEMO_USERS } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');

  if (!isOpen || !import.meta.env.DEV) return null;

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return Shield;
      case 'account_manager': return Key;
      case 'finance':
      case 'company_staff': return Building2;
      case 'trainer': return GraduationCap;
      case 'trainee': return Award;
      default: return User;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      case 'account_manager': return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
      case 'trainer': return { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' };
      case 'trainee': return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'finance': return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
      case 'company_staff': return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  // 14 personas list
  const allPersonas = Object.entries(DEMO_USERS)
    .map(([key, u]) => ({ key, ...u }));

  const companies = [
    { id: 'ALL', label: 'All Accounts' },
    { id: 'CROSSWORKS', label: 'Crossworks HQ' },
    { id: 'VHL', label: 'Vertiv Holdings' },
    { id: 'IPROY_SERVI', label: 'IPRoyal Services' },
    { id: 'AMIHAN_SOLUTI', label: 'Amihan Solutions' },
    { id: 'EWALIC', label: 'EastWest Ageas' },
    { id: 'ROP', label: 'Red Oak Properties' },
    { id: 'ISLA_LPG_CORPOR', label: 'Isla LPG' },
    { id: 'UNIVER_ROBINA_CORPOR', label: 'Universal Robina' },
    { id: 'BIBSP', label: 'Boehringer Ingelheim' },
    { id: 'AYALA_LAND_INC', label: 'Ayala Land' },
    { id: 'SECURI_BANK_CORPOR', label: 'Security Bank' }
  ];

  const filteredPersonas = allPersonas.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.organization?.toLowerCase().includes(q) ||
      u.company_code?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterCompany === 'ALL') return true;
    if (filterCompany === 'CROSSWORKS') return !u.company_code || u.company_code.includes('CROSSWORKS');
    return u.company_code === filterCompany || u.assigned_companies?.includes(filterCompany);
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div 
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: isDark ? '#111827' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
          background: isDark ? '#0f172a' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Developer Role Switcher
                </h2>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#fef3c7',
                  color: '#b45309',
                  fontSize: '10px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  border: '1px solid #fcd34d'
                }}>
                  Live Multi-Tenant Sandbox
                </span>
              </div>
              <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Instantly simulate real database records, scopes, streaks, and CP-ABE clearances across all 10 pilot companies.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          padding: '16px 24px',
          background: isDark ? '#0f172a' : '#ffffff',
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by persona name, email, company, or role..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '12px',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Company Scope Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {companies.map(c => {
              const isSelected = filterCompany === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCompany(c.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer',
                    background: isSelected 
                      ? '#4f46e5' 
                      : (isDark ? '#1e293b' : '#f1f5f9'),
                    color: isSelected 
                      ? '#ffffff' 
                      : (isDark ? '#94a3b8' : '#475569'),
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Persona Cards Grid */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {filteredPersonas.map(u => {
            const RoleIcon = getRoleIcon(u.role);
            const isSelected = u.email === currentUser?.email;
            const badgeColors = getRoleBadgeColor(u.role);

            return (
              <div
                key={u.key}
                onClick={async () => {
                  const loggedUser = await loginRole(u.key);
                  const targetRole = loggedUser?.role || u.role;
                  navigate(ROLE_HOME[targetRole] || '/home');
                  onClose();
                }}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: isSelected 
                    ? '2px solid #4f46e5' 
                    : `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                  background: isSelected 
                    ? (isDark ? '#1e1b4b' : '#eef2ff') 
                    : (isDark ? '#131b2e' : '#ffffff'),
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 16px rgba(79, 70, 229, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                {/* Top Row: Avatar + Name + Active Check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: isSelected 
                      ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' 
                      : (isDark ? '#1e293b' : '#f1f5f9'),
                    color: isSelected ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {u.initials || <RoleIcon size={18} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.email}
                    </span>
                  </div>

                  {isSelected && (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={12} /> Active
                    </span>
                  )}
                </div>

                {/* Badges Row: Role + Company Scope */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    background: badgeColors.bg,
                    color: badgeColors.text,
                    border: `1px solid ${badgeColors.border}`,
                    textTransform: 'uppercase'
                  }}>
                    <RoleIcon size={11} />
                    {u.role.replace(/_/g, ' ')}
                  </span>

                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    color: isDark ? '#cbd5e1' : '#475569',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
                  }}>
                    {u.organization || u.company_code}
                  </span>

                  {u.streak !== undefined && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10.5px',
                      fontWeight: '800',
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #ffedd5'
                    }}>
                      <Flame size={11} fill="#ea580c" />
                      {u.streak}d Streak
                    </span>
                  )}
                  {DEMO_STATUS_MIX[u.key] && DEMO_STATUS_MIX[u.key].map((st, idx) => {
                    const colors = st === 'Completed'
                      ? { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
                      : st === 'In progress'
                        ? { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }
                        : { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
                    return (
                      <span key={`${st}-${idx}`} style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '800',
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`
                      }}>
                        {st}
                      </span>
                    );
                  })}

                  {u.role === 'trainee' && Array.isArray(u.assigned_companies) && u.assigned_companies.length > 1 && (
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: isDark ? '#1e1b4b' : '#eef2ff',
                      color: isDark ? '#a5b4fc' : '#4338ca',
                      border: `1px solid ${isDark ? '#3730a3' : '#c7d2fe'}`
                    }}>
                      {u.assigned_companies.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
          background: isDark ? '#0f172a' : '#f8fafc',
          fontSize: '12px',
          color: isDark ? '#94a3b8' : '#64748b'
        }}>
          <span>Showing <strong>{filteredPersonas.length}</strong> authenticated pilot personas</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'transparent',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              color: isDark ? '#cbd5e1' : '#475569',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

