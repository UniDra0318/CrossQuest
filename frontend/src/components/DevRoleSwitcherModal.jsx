import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  RotateCcw,
  User,
  ListChecks
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ROLE_HOME } from '../routes/routeConfig';
import { DEMO_SCENARIOS } from '../data/demoScenarios';

const API_BASE = 'http://localhost:8000/api/v1';

const ROLE_GROUPS = [
  { role: 'admin', heading: 'Administrators' },
  { role: 'account_manager', heading: 'Account Managers' },
  { role: 'finance', heading: 'Finance' },
  { role: 'trainer', heading: 'Trainers' },
  { role: 'trainee', heading: 'Trainees' },
];

export default function DevRoleSwitcherModal({ isOpen, onClose }) {
  const { currentUser, loginRole, DEMO_USERS } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('scenarios'); // 'scenarios' | 'accounts'
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [scenarioStates, setScenarioStates] = useState({});
  const [resettingId, setResettingId] = useState(null);
  const [visitedPersonas, setVisitedPersonas] = useState({});

  const fetchScenarioStates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dev/scenarios`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setScenarioStates(data || {});
      }
    } catch {
      // ignore when dev endpoints are disabled
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'scenarios' && import.meta.env.DEV) {
      fetchScenarioStates();
    }
  }, [isOpen, activeTab, fetchScenarioStates]);

  const allPersonas = useMemo(
    () => Object.entries(DEMO_USERS || {}).map(([key, u]) => ({ key, ...u })),
    [DEMO_USERS]
  );

  const companies = useMemo(() => {
    const codes = new Set();
    allPersonas.forEach((u) => {
      (u.assigned_companies || []).forEach((c) => { if (c !== 'ALL') codes.add(c); });
      if (u.company_code) codes.add(u.company_code);
    });
    return [{ id: 'ALL', label: 'All Accounts' }, ...[...codes].sort().map((c) => ({ id: c, label: c }))];
  }, [allPersonas]);

  if (!isOpen || !import.meta.env.DEV) return null;

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      case 'account_manager': return Key;
      case 'finance': return Building2;
      case 'trainer': return GraduationCap;
      case 'trainee': return Award;
      default: return User;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      case 'account_manager': return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
      case 'trainer': return { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' };
      case 'trainee': return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'finance': return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const handleSwitchPersona = async (personaKey) => {
    let switched;
    try {
      switched = await loginRole(personaKey);
    } catch (err) {
      window.alert(err?.message || 'Could not switch persona.');
      return;
    }
    setVisitedPersonas((prev) => ({ ...prev, [personaKey]: true }));
    onClose();
    const target = ROLE_HOME[switched?.role] || '/';
    navigate(target);
  };

  const handleResetScenario = async (scenarioId) => {
    setResettingId(scenarioId);
    try {
      await fetch(`${API_BASE}/dev/scenarios/${scenarioId}/reset`, {
        method: 'POST',
        credentials: 'include'
      });
      await fetchScenarioStates();
    } finally {
      setResettingId(null);
    }
  };

  const filteredPersonas = allPersonas.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.organization?.toLowerCase().includes(q) ||
      u.company_code?.toLowerCase().includes(q) ||
      (u.scenario_ids || []).some((s) => s.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    if (filterCompany === 'ALL') return true;
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
          maxWidth: '880px',
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
                Simulate real records, scopes and sign-off workflows across the pilot companies.
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

        {/* Top Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
          background: isDark ? '#0b0f19' : '#f8fafc'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'scenarios' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'),
              color: activeTab === 'scenarios' ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155')
            }}
          >
            <ListChecks size={15} />
            <span>Scenarios ({DEMO_SCENARIOS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'accounts' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'),
              color: activeTab === 'accounts' ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155')
            }}
          >
            <User size={15} />
            <span>All accounts ({allPersonas.length})</span>
          </button>
        </div>

        {activeTab === 'scenarios' ? (
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DEMO_SCENARIOS.map((scn) => {
              const liveState = scenarioStates[scn.id]?.state;
              return (
                <div
                  key={scn.id}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
                    background: isDark ? '#0f172a' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#e0e7ff', color: '#4338ca' }}>
                          {scn.id}
                        </span>
                        <strong style={{ fontSize: '14.5px' }}>{scn.title}</strong>
                        {liveState && (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                            {liveState}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                        {scn.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetScenario(scn.id)}
                      disabled={resettingId === scn.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        background: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#334155',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>{resettingId === scn.id ? 'Resetting...' : 'Reset scenario'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {scn.steps.map((step, idx) => {
                      const persona = DEMO_USERS?.[step.persona];
                      const isDone = !!visitedPersonas[step.persona];
                      return (
                        <button
                          key={`${scn.id}-${idx}`}
                          type="button"
                          onClick={() => handleSwitchPersona(step.persona)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
                            background: isDark ? '#111827' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '12.5px'
                          }}
                        >
                          <span>
                            <strong style={{ color: '#4f46e5', marginRight: '6px' }}>{idx + 1}.</strong>
                            <strong style={{ marginRight: '6px' }}>{persona?.name || step.persona}:</strong>
                            <span style={{ color: isDark ? '#cbd5e1' : '#475569' }}>{step.do}</span>
                          </span>
                          {isDone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>
                              <Check size={13} /> Done
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Filter & Search Bar */}
            <div style={{
              padding: '16px 24px',
              background: isDark ? '#0f172a' : '#ffffff',
              borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by persona name, email, company, role, or scenario..."
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {companies.map((c) => {
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
                        background: isSelected ? '#4f46e5' : (isDark ? '#1e293b' : '#f1f5f9'),
                        color: isSelected ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grouped Persona Cards */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {ROLE_GROUPS.map((grp) => {
                const groupUsers = filteredPersonas.filter((u) => u.role === grp.role);
                if (groupUsers.length === 0) return null;
                return (
                  <div key={grp.role}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '10px' }}>
                      {grp.heading} ({groupUsers.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {groupUsers.map((u) => {
                        const RoleIcon = getRoleIcon(u.role);
                        const isSelected = u.email === currentUser?.email;
                        const badgeColors = getRoleBadgeColor(u.role);
                        const multiCompanyCount = (u.assigned_companies || []).filter((c) => c !== 'ALL').length;
                        return (
                          <button
                            key={u.key}
                            type="button"
                            onClick={() => handleSwitchPersona(u.key)}
                            style={{
                              padding: '14px',
                              borderRadius: '16px',
                              border: isSelected ? '2px solid #4f46e5' : (isDark ? '1px solid #1f2937' : '1px solid #e2e8f0'),
                              background: isSelected ? (isDark ? 'rgba(79, 70, 229, 0.15)' : '#eef2ff') : (isDark ? '#0f172a' : '#ffffff'),
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RoleIcon size={16} color={badgeColors.text} />
                                <strong style={{ fontSize: '13.5px', color: isDark ? '#f8fafc' : '#0f172a' }}>{u.name}</strong>
                              </div>
                              {isSelected && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '999px', background: '#4f46e5', color: '#ffffff', fontSize: '10px', fontWeight: 800 }}>
                                  <Check size={11} /> Active
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                              {u.email}
                            </span>
                            {u.demo_note && (
                              <span style={{ fontSize: '11px', color: isDark ? '#cbd5e1' : '#334155' }}>
                                {u.demo_note}
                              </span>
                            )}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                              {multiCompanyCount > 1 && (
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8' }}>
                                  {multiCompanyCount} Companies
                                </span>
                              )}
                              {(u.scenario_ids || []).map((sid) => (
                                <span key={sid} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: '#f3e8ff', color: '#7e22ce' }}>
                                  {sid}
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
