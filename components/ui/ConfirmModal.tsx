
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'primary'
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    primary: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
    success: 'bg-green-600 hover:bg-green-700 shadow-green-200'
  };

  const iconColors = {
    danger: 'text-red-600 bg-red-100',
    primary: 'text-indigo-600 bg-indigo-100',
    success: 'text-green-600 bg-green-100'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${iconColors[variant]}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition shadow-lg ${colorClasses[variant]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
