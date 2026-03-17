import React from 'react';
import { X, AlertTriangle, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-500" size={24} />,
          button: 'bg-red-600 hover:bg-red-700 text-white',
          bg: 'bg-red-50 dark:bg-red-900/10',
          border: 'border-red-200 dark:border-red-800'
        };
      case 'success':
        return {
          icon: <Check className="text-emerald-500" size={24} />,
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          bg: 'bg-emerald-50 dark:bg-emerald-900/10',
          border: 'border-emerald-200 dark:border-emerald-800'
        };
      case 'info':
        return {
          icon: <Info className="text-blue-500" size={24} />,
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          border: 'border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          icon: <AlertTriangle className="text-amber-500" size={24} />,
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
          bg: 'bg-amber-50 dark:bg-amber-900/10',
          border: 'border-amber-200 dark:border-amber-800'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${styles.bg} ${styles.border} border`}>
                {styles.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all shadow-lg ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
