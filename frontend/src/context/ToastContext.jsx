import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const iconMap = {
  success: <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />,
  error: <XCircle size={18} className="text-rose-400 flex-shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />,
  info: <Info size={18} className="text-purple-400 flex-shrink-0" />,
};

const borderMap = {
  success: 'border-emerald-500/30 bg-emerald-950/70 text-emerald-100 shadow-emerald-950/50',
  error: 'border-rose-500/30 bg-rose-950/70 text-rose-100 shadow-rose-950/50',
  warning: 'border-amber-500/30 bg-amber-950/70 text-amber-100 shadow-amber-950/50',
  info: 'border-purple-500/30 bg-purple-950/70 text-purple-100 shadow-purple-950/50',
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 pointer-events-auto text-xs sm:text-sm font-medium ${borderMap[item.type] || borderMap.info} animate-slideIn`}
        >
          {iconMap[item.type] || iconMap.info}
          <span className="flex-1 leading-snug break-words">{item.message}</span>
          <button
            onClick={() => removeToast(item.id)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
            aria-label="Close toast"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
