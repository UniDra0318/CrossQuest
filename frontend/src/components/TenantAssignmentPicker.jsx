import React, { useState, useMemo } from 'react';
import { Search, X, Check, Plus, Building2, CheckSquare, Square, Globe } from 'lucide-react';

/**
 * TenantAssignmentPicker
 * Highly flexible, scalable tenant/client company multi-selector.
 * Supports searching across dozens/hundreds of companies, select-all/clear-all,
 * custom tenant code entry, selected chips with 1-click removal, and scrollable grid.
 */
export default function TenantAssignmentPicker({
  selectedTenants = [],
  onChange,
  companies = [],
  role = '',
  isDark = false,
  label = 'ASSIGNED CLIENT TENANTS',
  helperText = 'Cryptographic multi-tenant CP-ABE scope boundary'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customCodeError, setCustomCodeError] = useState('');

  // 1. Build a unified deduplicated master list of available tenants
  const masterCompanies = useMemo(() => {
    const map = new Map();

    // Add all registered companies from database/state
    (companies || []).forEach(c => {
      if (c && c.code) {
        const cleanCode = c.code.trim().toUpperCase();
        map.set(cleanCode, {
          code: cleanCode,
          name: c.name || cleanCode,
          industry: c.industry || 'Registered Client Organization'
        });
      }
    });

    // Ensure any already-selected tenant codes are also included
    (selectedTenants || []).forEach(code => {
      if (code) {
        const cleanCode = String(code).trim().toUpperCase();
        if (!map.has(cleanCode)) {
          map.set(cleanCode, {
            code: cleanCode,
            name: `${cleanCode} (Assigned Tenant)`,
            industry: 'Custom / Enterprise Scope'
          });
        }
      }
    });

    return Array.from(map.values());
  }, [companies, selectedTenants]);

  // 2. Filter available companies based on user search query
  const filteredCompanies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return masterCompanies;
    return masterCompanies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q))
    );
  }, [masterCompanies, searchTerm]);

  // Toggle single tenant
  const handleToggle = (code) => {
    const clean = code.trim().toUpperCase();
    const isSelected = selectedTenants.includes(clean);
    if (isSelected) {
      onChange(selectedTenants.filter(t => t !== clean));
    } else {
      onChange([...selectedTenants, clean]);
    }
  };

  // Select all visible / master companies
  const handleSelectAll = () => {
    const allCodes = Array.from(new Set([...selectedTenants, ...masterCompanies.map(c => c.code)]));
    onChange(allCodes);
  };

  // Clear all
  const handleClearAll = () => {
    onChange([]);
  };

  // Add custom tenant code
  const handleAddCustomCode = (e) => {
    e.preventDefault();
    setCustomCodeError('');
    const clean = customCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!clean) {
      setCustomCodeError('Please enter a valid company/tenant code.');
      return;
    }
    if (selectedTenants.includes(clean)) {
      setCustomCodeError(`Tenant "${clean}" is already assigned.`);
      return;
    }
    onChange([...selectedTenants, clean]);
    setCustomCode('');
  };

  const isAllSelected = masterCompanies.length > 0 && masterCompanies.every(c => selectedTenants.includes(c.code));

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '12px'
    }}>
      {/* Header with Title and Count Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '0.08em', color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
            {label}
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '999px',
            background: selectedTenants.length > 0 ? (isDark ? 'rgba(99, 102, 241, 0.25)' : '#ede9fe') : (isDark ? '#334155' : '#f1f5f9'),
            color: selectedTenants.length > 0 ? (isDark ? '#c4b5fd' : '#6d28d9') : (isDark ? '#94a3b8' : '#64748b'),
            fontWeight: 800,
            fontSize: '10.5px'
          }}>
            {selectedTenants.length} of {masterCompanies.length} Selected
          </span>
        </div>

        {/* Quick Bulk Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: isAllSelected ? (isDark ? '#10b981' : '#059669') : (isDark ? '#334155' : '#e2e8f0'),
              color: isAllSelected ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
              border: 'none',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Assign all available company tenants"
          >
            <CheckSquare size={11} /> Select All
          </button>
          {selectedTenants.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: isDark ? '#451a1a' : '#fee2e2',
                color: isDark ? '#fca5a5' : '#b91c1c',
                border: 'none',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Clear all assigned tenants"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {helperText && (
        <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '-4px' }}>
          {helperText}
        </span>
      )}

      {/* Selected Tenants Removable Chips Tray */}
      {selectedTenants.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px',
          padding: '6px 8px',
          background: isDark ? '#0f172a' : '#f8fafc',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          maxHeight: '75px',
          overflowY: 'auto'
        }}>
          {selectedTenants.map(code => (
            <span
              key={code}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isDark ? '#312e81' : '#ede9fe',
                color: isDark ? '#c4b5fd' : '#5b21b6',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                border: isDark ? '1px solid #4338ca' : '1px solid #ddd6fe'
              }}
            >
              <span>{code}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggle(code); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#f87171' : '#dc2626',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 1
                }}
                title={`Remove ${code}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Filter Bar + Custom Code Entry Row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', color: isDark ? '#64748b' : '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search company by name or code (e.g. San Miguel, CORP, BANK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 26px 6px 30px',
              borderRadius: '8px',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '11.5px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Company List / Grid */}
      <div style={{
        maxHeight: '175px',
        overflowY: 'auto',
        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
        borderRadius: '10px',
        background: isDark ? '#0b1120' : '#ffffff',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
      }}>
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map(c => {
            const checked = selectedTenants.includes(c.code);
            return (
              <div
                key={c.code}
                onClick={() => handleToggle(c.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  background: checked
                    ? (isDark ? 'rgba(99, 102, 241, 0.18)' : '#f5f3ff')
                    : 'transparent',
                  border: checked
                    ? (isDark ? '1px solid #4338ca' : '1px solid #c4b5fd')
                    : '1px solid transparent',
                  transition: 'background 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    style={{
                      width: '14px',
                      height: '14px',
                      accentColor: '#7c3aed',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: checked ? (isDark ? '#4338ca' : '#7c3aed') : (isDark ? '#1e293b' : '#f1f5f9'),
                    color: checked ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                    flexShrink: 0
                  }}>
                    {c.code}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: isDark ? '#f8fafc' : '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {c.name}
                    </span>
                    {c.industry && (
                      <span style={{
                        fontSize: '10px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {c.industry}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, marginLeft: '8px' }}>
                  {checked && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: isDark ? '#34d399' : '#059669',
                      fontSize: '10.5px',
                      fontWeight: 700
                    }}>
                      <Check size={11} /> Active
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: isDark ? '#94a3b8' : '#64748b',
            fontSize: '11.5px'
          }}>
            No companies matching "<strong>{searchTerm}</strong>".
            <div style={{ marginTop: '4px', fontSize: '10.5px' }}>
              You can add it below as a custom tenant code!
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Tenant Code Form */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        background: isDark ? '#1e293b' : '#f8fafc',
        borderRadius: '8px',
        border: isDark ? '1px dashed #475569' : '1px dashed #cbd5e1'
      }}>
        <Building2 size={13} style={{ color: isDark ? '#94a3b8' : '#64748b', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Add custom tenant code (e.g. ENERGY_THETA)..."
          value={customCode}
          onChange={(e) => {
            setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'));
            setCustomCodeError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomCode(e);
            }
          }}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: '6px',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            background: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            fontFamily: 'monospace',
            fontSize: '11px',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={handleAddCustomCode}
          disabled={!customCode.trim()}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: customCode.trim() ? '#7c3aed' : (isDark ? '#334155' : '#cbd5e1'),
            color: '#ffffff',
            border: 'none',
            fontSize: '11px',
            fontWeight: 700,
            cursor: customCode.trim() ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0
          }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {customCodeError && (
        <span style={{ fontSize: '10.5px', color: '#ef4444', marginTop: '-2px' }}>
          {customCodeError}
        </span>
      )}
    </div>
  );
}

