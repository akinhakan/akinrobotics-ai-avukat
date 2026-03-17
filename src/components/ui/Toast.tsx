import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-rose-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
    error: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    info: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColors[type]} min-w-[300px] max-w-md`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-grow text-sm font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default Toast;
