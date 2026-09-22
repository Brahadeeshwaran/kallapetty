import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderTop: '1px solid var(--border-light)',
      background: 'var(--bg-app)',
      borderBottomLeftRadius: '8px',
      borderBottomRightRadius: '8px'
    }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> results
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 12px',
            background: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-app)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          <ChevronLeft size={16} style={{ marginRight: '4px' }} />
          Prev
        </button>
        
        <span style={{ fontSize: '13px', fontWeight: 500, margin: '0 8px' }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 12px',
            background: currentPage === totalPages ? 'var(--bg-main)' : 'var(--bg-app)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Next
          <ChevronRight size={16} style={{ marginLeft: '4px' }} />
        </button>
      </div>
    </div>
  );
}
