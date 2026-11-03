import type { ReactNode } from "react";
export const card = "rounded-2xl border border-cs-border bg-cs-surface p-5 shadow-sm sm:p-6";
export const input = "mt-2 min-h-11 w-full rounded-xl border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none transition hover:border-cs-accent/60 focus:border-cs-accent focus:ring-2 focus:ring-cs-accent/20 disabled:opacity-50";
/** Nút thao tác chuẩn (styles/buttons.css): action = bước tiếp theo, outline = thao tác phụ. */
export const action = "cs-btn cs-btn-primary";
export const outline = "cs-btn cs-btn-secondary";
export const danger = "cs-btn cs-btn-danger-outline";
export const success = "cs-btn cs-btn-success";
export function WorkflowTitle({ label, title, sub }: { label: string; title: string; sub: string }) {
  return <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cs-accent">{label}</p><h1 className="mt-2 text-2xl font-black text-cs-text sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-cs-muted">{sub}</p></div>;
}
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-6 ${tone === "error" ? "border-red-500/40 bg-red-500/10 text-cs-text" : tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-cs-text" : "border-cs-border bg-cs-soft text-cs-text"}`}>{children}</div>;
}
export function Status({ status }: { status: string }) {
  const translation: Record<string, string> = {
    PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", CHECKED_IN: "Đã tiếp nhận", CANCELLED: "Đã hủy",
    RECEIVED: "Đã lập phiếu", INSPECTING: "Đang kiểm tra", QUOTING: "Chờ lập báo giá", WAITING_APPROVAL: "Chờ khách duyệt",
    IN_PROGRESS: "Đang sửa chữa", WAITING_FOR_PARTS: "Chờ phụ tùng", COMPLETED: "Chờ thanh toán", HANDED_OVER: "Đã bàn giao", CLOSED: "Đã đóng",
  };
  return <span className="inline-flex rounded-lg border border-cs-border bg-cs-soft px-2.5 py-1 text-xs font-bold text-cs-text">{translation[status] || status}</span>;
}
export function formatDateTime(date?: string | null) {
  if (!date) return "Chưa có";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? date : parsed.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại."; }
