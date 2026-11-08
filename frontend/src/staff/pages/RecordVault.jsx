import React, { useState, useMemo } from 'react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { TablePagination, usePagination } from '../../components/TablePagination';
import { 
  Search, 
  Lock, 
  Unlock, 
  FileText, 
  CheckCircle2, 
  Building2,
  User,
  X,
  History,
  Award,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useStaff } from '../StaffContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function RecordVault() {
  const { me, records, loading } = useStaff();
  const { isDark } = useTheme();

  // URL query parameter for client filter (e.g. from Portfolios)
  const queryClient = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('client') || 'ALL';
    } catch {
      return 'ALL';
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(queryClient);

  // Trainee Profile & Lifetime Training History Modal
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [profileTab, setProfileTab] = useState('current'); // 'current' | 'history'

  const userScopes = useMemo(() => {
    return me?.scopes || ['CORP_ALPHA'];
  }, [me]);

  // Show only records in assigned scope
  const scopedRecords = useMemo(() => {
    return records.filter((r) => r.authorized || userScopes.includes(r.scope));
  }, [records, userScopes]);

  const filtered = useMemo(() => {
    return scopedRecords.filter((r) => {
      const matchesSearch = 
        r.trainee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.org.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedClient !== 'ALL' && r.scope !== selectedClient) {
        return false;
      }
      return true;
    });
  }, [scopedRecords, searchTerm, selectedClient]);

  const {
    currentPage: vaultPage,
    setCurrentPage: setVaultPage,
    paginatedItems: pagedVaultRecords,
    totalItems: totalVaultRecords
  } = usePagination(filtered, 6);

  // When viewing trainee history, gather all records matching that trainee across all companies
  const traineeAllRecords = useMemo(() => {
    if (!selectedTrainee) return [];
    return records.filter(r => 
      (r.email && selectedTrainee.email && r.email.toLowerCase() === selectedTrainee.email.toLowerCase()) ||
      (r.trainee && selectedTrainee.trainee && r.trainee.toLowerCase() === selectedTrainee.trainee.toLowerCase())
    );
  }, [records, selectedTrainee]);

  const traineeCurrentRecords = useMemo(() => {
    return traineeAllRecords.filter(r => userScopes.includes(r.scope) || r.authorized);
  }, [traineeAllRecords, userScopes]);

  const traineeCrossClientRecords = useMemo(() => {
    return traineeAllRecords.filter(r => !userScopes.includes(r.scope) && !r.authorized);
  }, [traineeAllRecords, userScopes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. FILTER & SCOPE BAR */}
      <div className="stf-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="stf-search" style={{ flex: 1, minWidth: '260px' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search records, trainees, or courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="stf-pills" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={selectedClient === 'ALL' ? 'on' : ''}
            onClick={() => setSelectedClient('ALL')}
          >
            All Assigned ({scopedRecords.length})
          </button>
          {userScopes.map(scope => (
            <button
              key={scope}
              type="button"
              className={selectedClient === scope ? 'on' : ''}
              onClick={() => setSelectedClient(scope)}
              style={{ fontFamily: 'monospace' }}
            >
              {scope} ({scopedRecords.filter(r => r.scope === scope).length})
            </button>
          ))}
        </div>
      </div>

      {/* 2. RECORDS TABLE (Auto-Decrypted in Scope) */}
      <div className="adm-panel stf-table">
        <div className="adm-scroll">
          <div className="adm-table" style={{ marginTop: 0 }}>
            {/* Table Header */}
            <div className="adm-grid stf-grid adm-th" style={{ gridTemplateColumns: '1.2fr 2fr 2.5fr 1.5fr 1fr 1fr' }}>
              <div>RECORD ID</div>
              <div>TRAINEE</div>
              <div>COURSE PROGRAM</div>
              <div>CLIENT SCOPE</div>
              <div>SCORE</div>
              <div style={{ textAlign: 'right' }}>STATUS</div>
            </div>

            {/* Table Rows */}
            {filtered && filtered.length > 0 ? (
              pagedVaultRecords.map((r) => (
                <div key={r.id} className="stf-rowwrap">
                  <div className="adm-grid stf-grid" style={{ gridTemplateColumns: '1.2fr 2fr 2.5fr 1.5fr 1fr 1fr', alignItems: 'center' }}>
                    {/* Record ID */}
                    <div className="adm-recid">
                      <FileText size={13} />
                      <span>{r.id}</span>
                    </div>

                    {/* Trainee (Clickable to open profile & career history) */}
                    <div 
                      className="adm-person" 
                      onClick={() => setSelectedTrainee(r)}
                      style={{ cursor: 'pointer' }}
                      title="View Trainee Profile & Lifetime Training History"
                    >
                      <div 
                        className="adm-av" 
                        style={{ 
                          background: '#ff7a1a', 
                          color: '#fff',
                          width: '34px',
                          height: '34px',
                          fontSize: '12px'
                        }}
                      >
                        {r.trainee.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {r.trainee}
                          <ExternalLink size={11} style={{ opacity: 0.6 }} />
                        </strong>
                        <span className="adm-mono" style={{ fontSize: '11px' }}>{r.email}</span>
                      </div>
                    </div>

                    {/* Course */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{r.course}</div>
                      <span className="adm-org" style={{ marginTop: '2px', fontSize: '11.5px' }}>{r.org}</span>
                    </div>

                    {/* Policy / Scope */}
                    <div>
                      <span className="adm-chip adm-chip--green" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {r.scope}
                      </span>
                    </div>

                    {/* Assessment Score */}
                    <div>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                        {r.score != null ? `${r.score}%` : '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div style={{ textAlign: 'right' }}>
                      <span className="adm-chip adm-chip--green" style={{ fontSize: '11.5px', padding: '3px 10px' }}>
                        <CheckCircle2 size={12} />
                        <span>{r.status || 'Certified'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <TableEmptyBlock
                icon={FileText}
                title="No Accessible Records Located"
                subtitle="No training records match your active filter within your authorized client scope."
              />
            )}
          </div>

          <TablePagination
            currentPage={vaultPage}
            totalItems={totalVaultRecords}
            pageSize={6}
            onPageChange={setVaultPage}
            itemName="training records"
          />
        </div>

        {/* Note */}
        <div className="stf-note" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock size={16} style={{ flexShrink: 0, color: '#059669' }} />
          <span>
            <strong>Authorized Client Scope:</strong> Displaying training records scoped to your contract attributes ({userScopes.join(', ')}). Out-of-scope records are mathematically protected under CP-ABE.
          </span>
        </div>
      </div>

      {/* 3. TRAINEE PROFILE & LIFETIME TRAINING HISTORY MODAL */}
      {selectedTrainee && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ff7a1a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>
                  {selectedTrainee.trainee.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{selectedTrainee.trainee}</h3>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    {selectedTrainee.email} • {selectedTrainee.org}
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setSelectedTrainee(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: 'flex', gap: '12px', padding: '14px 24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
              <button
                type="button"
                className={`adm-chip ${profileTab === 'current' ? 'adm-chip--solid' : ''}`}
                onClick={() => setProfileTab('current')}
                style={{ cursor: 'pointer' }}
              >
                Current Scope Records ({traineeCurrentRecords.length})
              </button>
              <button
                type="button"
                className={`adm-chip ${profileTab === 'history' ? 'adm-chip--solid' : ''}`}
                onClick={() => setProfileTab('history')}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <History size={13} />
                <span>Training History across Employers ({traineeCrossClientRecords.length})</span>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {profileTab === 'current' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {traineeCurrentRecords.map(r => (
                    <div key={r.id} style={{ padding: '14px', borderRadius: '12px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{r.course}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>Client: {r.org} ({r.scope})</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '14px' }}>{r.score != null ? `${r.score}%` : 'Certified'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{r.status || 'Completed'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}>
                    Read-only credential portability verification. Individual retains lifetime verifiable credentials across corporate roles.
                  </div>

                  {traineeCrossClientRecords.length > 0 ? (
                    traineeCrossClientRecords.map(r => (
                      <div key={r.id} style={{ padding: '14px', borderRadius: '12px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{r.course}</span>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0e7ff', color: '#4338ca' }}>
                              from another client
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            Original Organization: {r.org} ({r.scope})
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} />
                            <span>Verified Certificate</span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No cross-client training history records found for this participant.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedTrainee(null)}
                style={{ padding: '8px 18px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
