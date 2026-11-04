import React, { useMemo, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Custom hook to easily slice any array to 10 items per page (or custom pageSize)
 * and manage current page boundaries when filters/search changes.
 */
export function usePagination(items = [], pageSize = 10, initialPage = 1) {
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
 */
export function TablePaginationCompact({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

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

      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: isDark ? '#f8fafc' : '#0f172a' }}>
        {currentPage} / {totalPages}
      </span>

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
 * smart ellipsis windowing, and instant 10-item page navigation.
 */
export function TablePagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  itemName = 'items',
  showIfSinglePage = false,
  className = '',
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If there are 10 or fewer items and showIfSinglePage is false, do not display pagination
  if (totalItems <= pageSize && !showIfSinglePage) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate smart page list with ellipsis (e.g. [1, '...', 4, 5, 6, '...', 20])
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  const handlePageClick = (page) => {
    if (page === '...' || page === currentPage || page < 1 || page > totalPages) return;
    onPageChange?.(page);
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

        {/* Page Number Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '4px 8px',
                  color: isDark ? '#64748b' : '#94a3b8',
                  userSelect: 'none'
                }}
              >
                &hellip;
              </span>
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
