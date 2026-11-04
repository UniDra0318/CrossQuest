import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CornerDownLeft } from 'lucide-react';

/**
 * Custom hook to easily slice any array to 4 items per page (or custom pageSize)
 * and manage current page boundaries when filters/search changes.
 */
export function usePagination(items = [], pageSize = 4, initialPage = 1) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalItems = items ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset or clamp page if list length shrinks below current page window
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, startIndex, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex: totalItems === 0 ? 0 : startIndex + 1,
    endIndex: Math.min(totalItems, startIndex + pageSize),
    needsPagination: totalItems > pageSize
  };
}

/**
 * Compact header pagination control (e.g. for card toolbars and table headers)
 * Supports clicking the page number to jump directly to any page.
 */
export function TablePaginationCompact({
  currentPage = 1,
  totalItems = 0,
  pageSize = 4,
  onPageChange,
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [isJumping, setIsJumping] = useState(false);
  const [jumpVal, setJumpVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isJumping && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isJumping]);

  if (totalItems <= pageSize) return null;

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpVal, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange?.(target);
    }
    setIsJumping(false);
    setJumpVal('');
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '10px',
        background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
        fontSize: '12px',
        ...style
      }}
    >
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange?.(currentPage - 1)}
        title="Previous Page"
        style={{
          border: 'none',
          background: 'transparent',
          color: isDark ? '#cbd5e1' : '#334155',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage === 1 ? 0.35 : 1,
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {isJumping ? (
        <form onSubmit={handleJumpSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <input
            ref={inputRef}
            type="number"
            min="1"
            max={totalPages}
            value={jumpVal}
            onChange={(e) => setJumpVal(e.target.value)}
            onBlur={() => setIsJumping(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsJumping(false);
            }}
            placeholder={String(currentPage)}
            style={{
              width: '38px',
              height: '22px',
              textAlign: 'center',
              borderRadius: '6px',
              border: isDark ? '1px solid #6366f1' : '1px solid #4f46e5',
              background: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '11px',
              fontWeight: 700,
              padding: '0 2px'
            }}
          />
        </form>
      ) : (
        <span
          onClick={() => {
            setJumpVal(String(currentPage));
            setIsJumping(true);
          }}
          title="Click to jump to page"
          style={{
            fontWeight: 700,
            fontFamily: 'monospace',
            color: isDark ? '#f8fafc' : '#0f172a',
            cursor: 'pointer',
            padding: '1px 4px',
            borderRadius: '4px',
            transition: 'background 0.15s ease'
          }}
        >
          {currentPage} / {totalPages}
        </span>
      )}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange?.(currentPage + 1)}
        title="Next Page"
        style={{
          border: 'none',
          background: 'transparent',
          color: isDark ? '#cbd5e1' : '#334155',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage === totalPages ? 0.35 : 1,
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/**
 * Standard table pagination controls with dark/light mode compatibility,
 * interactive ellipsis for direct page jumping, and 4-item page navigation.
 */
export function TablePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 4,
  onPageChange,
  itemName = 'items',
  showIfSinglePage = false,
  className = '',
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ellipsis Jump to Page State
  const [jumpingIndex, setJumpingIndex] = useState(null); // 'left' | 'right' | null
  const [jumpInput, setJumpInput] = useState('');
  const jumpInputRef = useRef(null);

  useEffect(() => {
    if (jumpingIndex && jumpInputRef.current) {
      jumpInputRef.current.focus();
      jumpInputRef.current.select();
    }
  }, [jumpingIndex]);

  // If there are pageSize or fewer items and showIfSinglePage is false, do not display pagination
  if (totalItems <= pageSize && !showIfSinglePage) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate smart page list with ellipsis (e.g. [1, '...left', 4, 5, 6, '...right', 20])
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...right', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...left', currentPage - 1, currentPage, currentPage + 1, '...right', totalPages];
  };

  const pages = getPageNumbers();

  const handlePageClick = (page) => {
    if (typeof page === 'string' && page.startsWith('...')) return;
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange?.(page);
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(jumpInput, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange?.(val);
      setJumpingIndex(null);
      setJumpInput('');
    }
  };

  return (
    <div
      className={`table-pagination-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 20px',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: isDark ? '#111827' : '#ffffff',
        borderRadius: '0 0 16px 16px',
        fontSize: '12.5px',
        color: isDark ? '#94a3b8' : '#64748b',
        boxSizing: 'border-box',
        width: '100%',
        ...style
      }}
    >
      {/* Left: Summary text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Showing</span>
        <strong style={{ color: isDark ? '#f8fafc' : '#0f172a', fontFamily: 'monospace' }}>
          {startItem}
        </strong>
        <span>to</span>
        <strong style={{ color: isDark ? '#f8fafc' : '#0f172a', fontFamily: 'monospace' }}>
          {endItem}
        </strong>
        <span>of</span>
        <strong style={{ color: isDark ? '#f8fafc' : '#0f172a', fontFamily: 'monospace' }}>
          {totalItems}
        </strong>
        <span>{itemName}</span>
        {totalPages > 1 && (
          <span
            style={{
              marginLeft: '6px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
              color: isDark ? '#a5b4fc' : '#4f46e5',
              border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #c7d2fe'
            }}
          >
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First Page */}
        {totalPages > 5 && (
          <button
            type="button"
            onClick={() => handlePageClick(1)}
            disabled={currentPage === 1}
            title="First Page"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
              color: isDark ? '#cbd5e1' : '#334155',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronsLeft size={14} />
          </button>
        )}

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
            color: isDark ? '#cbd5e1' : '#334155',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        {/* Page Number Buttons with Jump-To-Page on Ellipsis */}
        {pages.map((p, idx) => {
          if (typeof p === 'string' && p.startsWith('...')) {
            const isThisJumping = jumpingIndex === p;
            if (isThisJumping) {
              return (
                <form
                  key={`jump-${idx}`}
                  onSubmit={handleJumpSubmit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  <input
                    ref={jumpInputRef}
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setJumpingIndex(null);
                    }}
                    onBlur={() => {
                      if (!jumpInput) setJumpingIndex(null);
                    }}
                    placeholder={`1-${totalPages}`}
                    style={{
                      width: '54px',
                      height: '32px',
                      textAlign: 'center',
                      padding: '0 4px',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #6366f1' : '1px solid #4f46e5',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '11px',
                      fontWeight: 700,
                      outline: 'none',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)'
                    }}
                  />
                  <button
                    type="submit"
                    title="Jump to page"
                    style={{
                      height: '32px',
                      padding: '0 8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>Go</span>
                    <CornerDownLeft size={11} />
                  </button>
                </form>
              );
            }

            return (
              <button
                key={`ellipsis-${idx}`}
                type="button"
                onClick={() => {
                  setJumpingIndex(p);
                  setJumpInput('');
                }}
                title={`Click to jump to any page (1 - ${totalPages})`}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 6px',
                  borderRadius: '8px',
                  border: isDark ? '1px dashed rgba(255, 255, 255, 0.2)' : '1px dashed #cbd5e1',
                  background: isDark ? 'rgba(30, 41, 59, 0.35)' : '#f8fafc',
                  color: isDark ? '#a5b4fc' : '#6366f1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                &hellip;
              </button>
            );
          }

          const isActive = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => handlePageClick(p)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '8px',
                border: isActive
                  ? 'none'
                  : isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid #e2e8f0',
                background: isActive
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : isDark
                  ? 'rgba(30, 41, 59, 0.7)'
                  : '#f8fafc',
                color: isActive ? '#ffffff' : isDark ? '#cbd5e1' : '#334155',
                fontWeight: isActive ? 800 : 600,
                cursor: isActive ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
            color: isDark ? '#cbd5e1' : '#334155',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        {totalPages > 5 && (
          <button
            type="button"
            onClick={() => handlePageClick(totalPages)}
            disabled={currentPage === totalPages}
            title="Last Page"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
              color: isDark ? '#cbd5e1' : '#334155',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronsRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default TablePagination;
