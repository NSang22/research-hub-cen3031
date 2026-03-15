import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} />
        <div className="relative bg-black rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-inherit">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-inherit text-2xl leading-none"
            >
              &times;
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
