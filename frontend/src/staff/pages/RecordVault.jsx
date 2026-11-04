import React, { useState } from 'react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { TablePagination, usePagination } from '../../components/TablePagination';
import { 
  Search, 
  Lock, 
  Unlock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Award,
  Sparkles
} from 'lucide-react';
import { useStaff } from '../StaffContext';

export default function RecordVault() {
  const { me, records, decryptedRecords, deniedAttempts, decryptingId, handleDecrypt, loading } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState('ALL'); // 'ALL' | 'MINE' | 'OTHER'

  const filtered = records.filter((r) => {
    const matchesSearch = 
      r.trainee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.org.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterScope === 'MINE') return r.authorized;
    if (filterScope === 'OTHER') return !r.authorized;
    return true;
  });

  return (
    <div>
      {/* 1. FILTER BAR */}
      <div className="stf-bar">
        <div className="stf-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search records, trainees, or courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="stf-pills">
          <button
            type="button"
            className={filterScope === 'ALL' ? 'on' : ''}
            onClick={() => setFilterScope('ALL')}
          >
            All Client Records ({records.length})
          </button>
          <button
            type="button"
            className={filterScope === 'MINE' ? 'on' : ''}
            onClick={() => setFilterScope('MINE')}
          >
            Assigned Scope: {me?.scopes?.join(', ') || 'CORP_ALPHA'} ({records.filter(r => r.authorized).length})
          </button>
          <button
            type="button"
            className={filterScope === 'OTHER' ? 'on' : ''}
            onClick={() => setFilterScope('OTHER')}
          >
            Out-of-Scope ({records.filter(r => !r.authorized).length})
          </button>
        </div>
      </div>

      {/* 2. RECORDS TABLE */}
      <div className="adm-panel stf-table">
        <div className="adm-scroll">
          <div className="adm-table" style={{ marginTop: 0 }}>
            {/* Table Header */}
            <div className="adm-grid stf-grid adm-th">
              <div>RECORD ID</div>
              <div>TRAINEE</div>
              <div>COURSE PROGRAM & CLIENT</div>
              <div>POLICY / SCOPE</div>
              <div style={{ textAlign: 'right' }}>DECRYPTION ACTION</div>
            </div>

            {/* Table Rows */}
            {filtered && filtered.length > 0 ? (
              pagedVaultRecords.map((r) => {
              const isDecrypted = Boolean(decryptedRecords[r.id]);
              const decData = decryptedRecords[r.id];
              const isDenied = Boolean(deniedAttempts[r.id]);
              const isBusy = decryptingId === r.id;

              return (
                <div key={r.id} className={`stf-rowwrap ${!r.authorized ? 'stf-locked' : ''}`}>
                  <div className="adm-grid stf-grid" style={{ alignItems: 'center' }}>
                    {/* Record ID */}
                    <div className="adm-recid">
                      <FileText size={13} />
                      <span>{r.id}</span>
                    </div>

                    {/* Trainee */}
                    <div className="adm-person">
                      <div 
                        className="adm-av" 
                        style={{ 
                          background: r.authorized ? '#ff7a1a' : '#64748b', 
                          color: '#fff',
                          width: '36px',
                          height: '36px'
                        }}
                      >
                        {r.trainee.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong>{r.trainee}</strong>
                        <span className="adm-mono">{r.email}</span>
                      </div>
                    </div>

                    {/* Course & Org */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{r.course}</div>
                      <span className="adm-org" style={{ marginTop: '4px' }}>{r.org}</span>
                    </div>

                    {/* Policy / Scope */}
                    <div className="stf-policycell">
                      <span className={`adm-chip ${r.authorized ? 'adm-chip--green' : 'adm-chip--red'}`}>
                        {r.authorized ? `AUTHORIZED (${r.scope})` : `RESTRICTED (${r.scope})`}
                      </span>
                      <code className="adm-mono" style={{ fontSize: '10.5px' }}>{r.policy}</code>
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: 'right' }}>
                      {r.authorized ? (
                        isDecrypted ? (
                          <span className="adm-chip adm-chip--green" style={{ padding: '8px 14px', fontSize: '12px' }}>
                            <Unlock size={13} /> Decrypted
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="adm-btn adm-btn-solid adm-chip--solid"
                            onClick={() => handleDecrypt(r)}
                            disabled={isBusy}
                          >
                            <Lock size={13} />
                            <span>{isBusy ? 'Decrypting...' : 'Decrypt Record'}</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="stf-attempt"
                          onClick={() => handleDecrypt(r)}
                          disabled={isBusy}
                          title="Simulate out-of-scope access attempt to test policy enforcement"
                        >
                          <ShieldAlert size={14} />
                          <span>{isBusy ? 'Attempting...' : 'Attempt Decrypt (Out-of-Scope)'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Decryption Success Box */}
                  {isDecrypted && decData && (
                    <div className="stf-result stf-result--ok">
                      <div>
                        <dt>CERTIFICATE SERIAL</dt>
                        <dd>{decData.certificateId}</dd>
                      </div>
                      <div>
                        <dt>ISSUED RECIPIENT</dt>
                        <dd>{decData.issuedTo}</dd>
                      </div>
                      <div>
                        <dt>ASSESSMENT SCORE</dt>
                        <dd style={{ color: '#08613f', fontWeight: 700 }}>
                          {decData.score != null ? `${decData.score}% ACCURACY` : 'PASSED'}
                        </dd>
                      </div>
                      <div>
                        <dt>DECRYPTED AT</dt>
                        <dd>{new Date(decData.decryptedAt).toLocaleTimeString()} UTC</dd>
                      </div>
                    </div>
                  )}

                  {/* Inline Decryption Failure Box */}
                  {isDenied && (
                    <div className="stf-result stf-result--bad">
                      <AlertTriangle size={16} />
                      <span>
                        <strong>Access Authorization Denied:</strong> {deniedAttempts[r.id]} This unauthorized request was reported to the Administrator's Anomaly Monitor.
                      </span>
                    </div>
                  )}
                </div>
              );
            })
            ) : (
              <TableEmptyBlock
                icon={FileText}
                title="No Accessible Records Located"
                subtitle="No records match your active search query or assigned tenant clearance scope."
              />
            )}
          </div>
          <TablePagination
            currentPage={vaultPage}
            totalItems={totalVaultRecords}
            pageSize={10}
            onPageChange={setVaultPage}
            itemName="encrypted records"
          />
        </div>

        {/* Protection Footer Note */}
        <div className="stf-note">
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Row-Level CP-ABE Cryptographic Guard:</strong> As an Account Manager, your encryption attributes are strictly bounded to <code>CORP_ALPHA</code>. Cross-tenant decryption attempts are rejected at the cipher layer and logged in real-time.
          </span>
        </div>
      </div>
    </div>
  );
}
