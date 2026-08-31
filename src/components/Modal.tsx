import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  maxWidth?: string;
}

export default function Modal({ title, onClose, children, width, maxWidth }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          width: width, 
          maxWidth: maxWidth, 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '90vh' 
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>{title}</span>
          <button onClick={onClose} type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
