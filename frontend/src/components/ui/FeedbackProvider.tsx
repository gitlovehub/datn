import { useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FeedbackContext, type ConfirmOptions, type ToastItem, type ToastTone } from "./feedbackContext";

type ConfirmState = { options: ConfirmOptions; resolve: (result: boolean) => void } | null;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const role = location.pathname.startsWith("/advisor") ? "advisor" : location.pathname.startsWith("/admin") ? "admin" : "customer";
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const queue = useRef<ConfirmState[]>([]);
  const dialogRef = useRef<ConfirmState>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    const request = { options, resolve };
    if (dialogRef.current) { queue.current.push(request); return; }
    dialogRef.current = request;
    setChecked(options.checklist?.map(() => false) || []);
    setDialog(request);
  }), []);

  const close = useCallback((result: boolean) => {
    const active = dialogRef.current;
    if (!active) return;
    active.resolve(result);
    const next = queue.current.shift() || null;
    dialogRef.current = next;
    if (next) setChecked(next.options.checklist?.map(() => false) || []);
    setDialog(next);
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++nextId.current;
    setToasts(current => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  const canConfirm = !dialog?.options.checklist?.length || checked.every(Boolean);
  return <FeedbackContext.Provider value={{ confirm, notify }}>
    {children}
    {dialog && <div data-area={role} className="cs-feedback-layer fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-[5px]" onMouseDown={event => { if (event.target === event.currentTarget) close(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="cs-confirm-title" aria-describedby="cs-confirm-desc" className="w-full max-w-[500px] overflow-hidden rounded-[20px] border border-cs-border bg-cs-surface text-cs-text shadow-[0_30px_110px_rgba(0,0,0,.5)]" data-ui-dialog="confirm">
        <header className="flex items-start gap-4 border-b border-cs-border px-6 py-5">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${dialog.options.variant === "danger" ? "bg-red-500/15 text-red-400" : "bg-cs-soft text-cs-accent"}`} aria-hidden="true">
            {dialog.options.variant === "danger" ? "!" : "✓"}
          </div>
          <div className="min-w-0 flex-1"><h2 id="cs-confirm-title" className="text-lg font-extrabold leading-6">{dialog.options.title}</h2>
            {dialog.options.reference && <p className="mt-1 text-xs font-semibold text-cs-muted">{dialog.options.reference}</p>}
          </div>
          <button type="button" aria-label="Đóng" onClick={() => close(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-cs-muted hover:bg-cs-soft hover:text-cs-text">✕</button>
        </header>
        <div className="space-y-4 px-6 py-5">
          <p id="cs-confirm-desc" className="text-sm leading-6 text-cs-muted">{dialog.options.description}</p>
          {dialog.options.phone && <a className="cs-unified-btn cs-unified-secondary" href={`tel:${dialog.options.phone.replace(/[^+\d]/g, "")}`}><span aria-hidden="true">☎</span> Gọi {dialog.options.phone}</a>}
          {dialog.options.checklist?.length ? <div className="space-y-3 rounded-xl border border-cs-border bg-cs-surface-2 p-4">
            {dialog.options.checklist.map((item, i) => <label key={i} className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-cs-text">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--cs-accent)]" checked={checked[i] || false} onChange={event => setChecked(prev => prev.map((v,index) => index === i ? event.target.checked : v))}/>
              <span>{item}</span>
            </label>)}
          </div> : null}
          {dialog.options.checklist?.length && !canConfirm ? <p className="text-xs text-cs-muted">Hãy xác nhận các mục trên trước khi tiếp tục.</p> : null}
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-cs-border bg-cs-surface-2 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" autoFocus className="cs-unified-btn cs-unified-secondary" onClick={() => close(false)}>{dialog.options.cancelText || "Quay lại"}</button>
          <button type="button" disabled={!canConfirm} className={`cs-unified-btn ${dialog.options.variant === "danger" ? "cs-unified-danger" : "cs-unified-primary"}`} onClick={() => close(true)}>{dialog.options.confirmText || "Xác nhận"}</button>
        </footer>
      </section>
    </div>}
    <div data-area={role} className="cs-feedback-layer pointer-events-none fixed right-4 top-5 z-[450] flex w-[min(390px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(toast => <div key={toast.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-cs-border bg-cs-surface px-4 py-3 text-cs-text shadow-2xl">
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${toast.tone === "error" ? "bg-red-500/15 text-red-400" : toast.tone === "success" ? "bg-emerald-500/15 text-emerald-500" : "bg-cs-soft text-cs-accent"}`}>{toast.tone === "error" ? "!" : "✓"}</span>
        <p className="flex-1 text-sm leading-5">{toast.message}</p>
        <button className="text-cs-muted hover:text-cs-text" aria-label="Đóng thông báo" onClick={() => setToasts(current => current.filter(item => item.id !== toast.id))}>✕</button>
      </div>)}
    </div>
  </FeedbackContext.Provider>;
}
