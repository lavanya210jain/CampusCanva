import { useDialog } from '../../hooks/useDialog';
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useDialog(isOpen, onCancel);
  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDestructive ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300' : 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button aria-label="Close dialog" onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition shadow-xs ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
