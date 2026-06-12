import React from 'react';
import Button from './Button';
import { FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message,
  type = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: FaExclamationTriangle,
      iconBg: 'bg-yellow-400/15 dark:bg-yellow-400/15',
      iconColor: 'text-yellow-400',
      buttonVariant: 'warning'
    },
    warning: {
      icon: FaExclamationCircle,
      iconBg: 'bg-yellow-400/15 dark:bg-yellow-400/15',
      iconColor: 'text-yellow-400',
      buttonVariant: 'warning'
    }
  };

  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6 text-center sm:px-6">
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
        />

        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-yellow-400/30 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-yellow-400/10 dark:border-yellow-400/30 dark:bg-slate-950 dark:ring-yellow-400/10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500" />

          <div className="px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:text-left">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${config.iconBg} shadow-lg`}>
                <Icon className={config.iconColor} size={22} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-yellow-400 dark:text-yellow-400">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-gray-200 dark:text-gray-200">
                  {message}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-yellow-400/20 bg-black/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Button
              variant="outline"
              onClick={onClose}
              className="!rounded-full !border-yellow-400 !bg-transparent !px-5 !py-2.5 !text-sm !font-semibold !text-yellow-400 hover:!bg-yellow-400 hover:!text-black"
            >
              {cancelText}
            </Button>
            <Button
              variant={config.buttonVariant}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="!rounded-full !px-5 !py-2.5 !text-sm !font-semibold !bg-yellow-400 !text-black shadow-lg shadow-yellow-500/20"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
