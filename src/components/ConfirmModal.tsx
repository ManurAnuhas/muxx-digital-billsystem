import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmation Required',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-modal-close" onClick={onCancel}>
          <X size={18} />
        </button>
        <div className={`confirm-modal-icon ${variant}`}>
          <AlertTriangle size={24} />
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-btn-action ${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
