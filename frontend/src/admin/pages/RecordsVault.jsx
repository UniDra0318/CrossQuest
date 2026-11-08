import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  CheckCircle2 
} from 'lucide-react';
import { TablePagination, TablePaginationCompact, usePagination } from '../../components/TablePagination';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { exportAuditLogs, exportVaultRecords } from '../../api/admin';

export default function RecordsVault({ records = [], token }) {
  const [recordSearch, setRecordSearch] = useState('');
  const [exportingAuditLogs, setExportingAuditLogs] = useState(false);
  const [exportingVaultRecords, setExportingVaultRecords] = useState(false);
  const [vaultToast, setVaultToast] = useState(null);

  const filteredRecords = useMemo(() => {
    if (!recordSearch) return records;
    const q = recordSearch.toLowerCase();
    return records.filter(r =>
      (r.trainee && r.trainee.toLowerCase().includes(q)) ||
      (r.course && r.course.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.org && r.org.toLowerCase().includes(q))
    );
  }, [records, recordSearch]);

  const {
    currentPage: recordPage,
    setCurrentPage: setRecordPage,
    paginatedItems: pagedRecords,
    totalItems: totalRecords
  } = usePagination(filteredRecords, 4);

  const handleExportAuditLogs = async () => {
    if (exportingAuditLogs) return;
    setExportingAuditLogs(true);
    setVaultToast(null);
    try {
      const ok = await exportAuditLogs(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Audit Logs (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export master audit logs.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingAuditLogs(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  const handleExportVaultRecords = async () => {
    if (exportingVaultRecords) return;
    setExportingVaultRecords(true);
    setVaultToast(null);
    try {
      const ok = await exportVaultRecords(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Vault Training Records (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export vault records.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingVaultRecords(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  return (
    <div className="adm-panel" style={{ marginTop: '24px' }}>
      <div className="adm-panel__head">
        <div>
          <h2>Master Record Vault</h2>
          <span className="adm-mono">Global store of multi-tenant cryptographic certificates & training records</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <TablePaginationCompact
            currentPage={recordPage}
            totalItems={totalRecords}
            pageSize={4}
            onPageChange={setRecordPage}
          />
          <div className="adm-search">
            <Search size={15} />
            <input 
              type="text" 
              placeholder="Filter records or courses..." 
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            className="adm-btn adm-btn--light"
            onClick={handleExportAuditLogs}
            disabled={exportingAuditLogs}
            title="Download CSV access & security audit log"
          >
            <Download size={14} className={exportingAuditLogs ? 'spin-animation' : ''} />
            <span>{exportingAuditLogs ? 'Exporting Audit...' : 'Export Master Audit Logs (CSV)'}</span>
          </button>
          <button 
            type="button" 
            className="adm-btn adm-btn--light"
            onClick={handleExportVaultRecords}
            disabled={exportingVaultRecords}
            title="Download CSV training records vault"
          >
            <FileText size={14} className={exportingVaultRecords ? 'spin-animation' : ''} />
            <span>{exportingVaultRecords ? 'Exporting Vault...' : 'Export Vault Records (CSV)'}</span>
          </button>
        </div>
        {vaultToast && (
          <div style={{
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 600,
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: vaultToast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: vaultToast.type === 'success' ? '#34d399' : '#f87171',
            border: vaultToast.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <CheckCircle2 size={14} />
            <span>{vaultToast.text}</span>
          </div>
        )}
      </div>

      <div className="adm-scroll" style={{ maxHeight: 'none', overflowY: 'visible' }}>
        <div className="adm-table">
          <div className="adm-grid adm-grid--vault adm-th">
            <div>RECORD ID</div>
            <div>TRAINEE</div>
            <div>CLIENT ORGANIZATION</div>
            <div>COURSE PROGRAM</div>
            <div>ACCESS CONTROL POLICY</div>
            <div style={{ textAlign: 'right' }}>STATUS</div>
          </div>
          {filteredRecords && filteredRecords.length > 0 ? (
            pagedRecords.map((r) => (
              <div key={r.id} className="adm-row adm-grid adm-grid--vault">
                <div className="adm-recid">
                  <FileText size={13} />
                  <span>{r.id}</span>
                </div>
                <div className="adm-person">
                  <div className="adm-av adm-av--sq" style={{ background: '#6a2bd9', color: '#fff' }}>
                    {(r.trainee || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong>{r.trainee}</strong>
                    <span className="adm-mono">{r.email}</span>
                  </div>
                </div>
                <div>
                  <span className="adm-org">{r.org}</span>
                </div>
                <div className="adm-course">
                  {r.course}
                </div>
                <div>
                  <code className="adm-policy">{r.policy}</code>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`adm-chip ${r.status === 'COMPLETED' ? 'adm-chip--green' : 'adm-chip--amber'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <TableEmptyBlock
              icon={FileText}
              title="No Master Training Records Found"
              subtitle="No records match your current filter, company selection, or search query."
            />
          )}
        </div>
      </div>

      <TablePagination
        currentPage={recordPage}
        totalItems={totalRecords}
        pageSize={4}
        onPageChange={setRecordPage}
        itemName="master records"
      />
    </div>
  );
}
