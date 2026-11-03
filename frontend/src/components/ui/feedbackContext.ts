import { createContext, useContext } from "react";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "warning" | "danger" | "info";
  checklist?: string[];
  reference?: string;
  phone?: string;
};

export type ToastTone = "success" | "error" | "info";
export type ToastItem = { id: number; message: string; tone: ToastTone };
type Feedback = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, tone?: ToastTone) => void;
};

export const FeedbackContext = createContext<Feedback | null>(null);

export function useAppFeedback(): Feedback {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useAppFeedback must be used inside FeedbackProvider");
  return context;
}
