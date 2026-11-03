import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "info",
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles = {
    success: "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-500/10",
    error: "bg-rose-50 border-rose-300 text-rose-900 shadow-rose-500/10",
    warning: "bg-amber-50 border-amber-300 text-amber-900 shadow-amber-500/10",
    info: "bg-[#FAF8F5] border-[#D6A85F] text-[#20252B] shadow-amber-900/10",
  }[type];

  const icon = {
    success: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm">
        ✓
      </div>
    ),
    error: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-sm">
        ✕
      </div>
    ),
    warning: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-sm">
        !
      </div>
    ),
    info: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D6A85F] text-xs font-bold text-white shadow-sm">
        ℹ
      </div>
    ),
  }[type];

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md ${bgStyles}`}
      >
        {icon}
        <div className="flex-1 text-xs font-medium leading-5">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 -mr-1 -mt-1 cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toast;
