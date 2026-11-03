import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Button({ children, className = "", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button className={`cs-button cs-btn cs-btn-primary ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`cs-card rounded-2xl border border-cs-border bg-cs-surface p-6 ${className}`}>{children}</section>;
}
export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="mb-7">{eyebrow && <p className="mb-2.5 text-xs font-extrabold tracking-[0.16em] text-cs-accent">{eyebrow}</p>}<h1 className="font-[Manrope] text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.2] tracking-[-0.04em]">{title}</h1>{description && <p className="mt-[9px] text-sm text-cs-muted">{description}</p>}</div>;
}
export function EmptyState({ title = "Chưa có dữ liệu", description, children }: PropsWithChildren<{title?: string; description?: string}>) {
  return <Card><div className="flex min-h-[235px] flex-col items-center justify-center gap-3 text-center"><span className="grid size-12 place-items-center rounded-[15px] bg-cs-soft text-[27px] text-cs-accent" aria-hidden="true">◇</span><h2 className="text-[17px] font-extrabold">{title}</h2>{description && <p className="max-w-[570px] text-[13px] leading-[1.7] text-cs-muted">{description}</p>}{children}</div></Card>;
}
export function LoadingState() { return <p className="p-[25px] text-center text-cs-muted" role="status">Đang tải dữ liệu...</p>; }
export function StatusBadge({ status }: { status: string }) {
  const statusLabel: Record<string, string> = {
    CREATED: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy",
    RECEIVED: "Đã tiếp nhận", DIAGNOSING: "Đang chẩn đoán", CLOSED: "Đã đóng phiếu",
    ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động",
  };
  return <span className="rounded-full bg-cs-soft px-[11px] py-1.5 text-xs font-extrabold text-cs-accent">{statusLabel[status] ?? status}</span>;
}
