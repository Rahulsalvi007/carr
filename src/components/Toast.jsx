import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium animate-in slide-in-from-bottom-5 duration-200 bg-white max-w-sm border-zinc-200">
      {isSuccess && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
      {isError && <AlertCircle size={16} className="text-rose-600 shrink-0" />}
      {!isSuccess && !isError && <Info size={16} className="text-blue-600 shrink-0" />}

      <span className="text-zinc-800 flex-1">{toast.message}</span>

      <button
        onClick={onClose}
        className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
