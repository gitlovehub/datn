import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyRepairOrders,
  getMyRepairOrderDetail,
  getVehicleName,
  repairStatusLabel,
  type CustomerRepairOrder,
} from "../../services/customerApi";

// Presentation stages follow the ATELIER timeline, mapped to the actual Laravel
// repair-order state machine. No demo statuses are sent to the backend.
const stages = [
  { status: "RECEIVED", label: "Đã tiếp nhận", color: "blue" },
  { status: "INSPECTING", label: "Đang chẩn đoán", color: "blue" },
  { status: "WAITING_APPROVAL", label: "Chờ khách duyệt", color: "amber" },
  { status: "IN_PROGRESS", label: "Đang sửa chữa", color: "blue" },
  { status: "COMPLETED", label: "Sẵn sàng bàn giao", color: "green" },
  { status: "HANDED_OVER", label: "Đã bàn giao", color: "green" },
  { status: "CLOSED", label: "Đã đóng phiếu", color: "muted" },
] as const;

function stageIndex(status: string): number {
  if (status === "QUOTING") return 1;
  if (status === "WAITING_FOR_PARTS" || status === "REVIEW_TEST") return 3;
  return stages.findIndex(stage => stage.status === status);
}

function statusColor(status: string) {
  if (status === "WAITING_APPROVAL" || status === "WAITING_FOR_PARTS" || status === "QUOTING") return "amber";
  if (status === "COMPLETED" || status === "HANDED_OVER") return "green";
  if (status === "CLOSED") return "muted";
  return "blue";
}

const statusColorClasses: Record<"blue" | "amber" | "green" | "muted", string> = {
  blue: "bg-[#e5effe] text-[#275184] dark:bg-[#263d5d] dark:text-[#a9ccff]",
  amber: "bg-[#fff0dc] text-[#955c12] dark:bg-[#4b3522] dark:text-[#f4be69]",
  green: "bg-[#e3f5e9] text-[#276044] dark:bg-[#203f32] dark:text-[#96d9ae]",
  muted: "bg-[#eceff3] text-[#535e6d] dark:bg-[#2a3039] dark:text-[#b1b8c5]",
};

function formatEventTime(date?: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("vi-VN");
}

function TrackingCard({ order }: { order: CustomerRepairOrder }) {
  const [detail, setDetail] = useState<CustomerRepairOrder | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setHistoryError(false);
    getMyRepairOrderDetail(order.id)
      .then(data => { if (active) setDetail(data); })
      .catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [order.id]);

  const status = detail?.status ?? order.status;
  const current = stageIndex(status);
  const history = (detail?.statusHistory ?? detail?.status_history ?? [])
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5);
  const recordedStatuses = new Set(history.map(item => item.status));
  const isEarlyClosed = status === "CLOSED" && !recordedStatuses.has("COMPLETED") && !recordedStatuses.has("HANDED_OVER");

  return (
    <article className="mb-5 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[var(--cs-border,#e9e9e6)] pb-6 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight">
        <div>
          <p className="mb-2 text-[13px] font-extrabold tracking-[0.11em] text-[#cf2935]">{order.repair_order_code}</p>
          <h2>{getVehicleName(order.vehicle)}</h2>
          <p className="mt-1 text-[13px] text-[var(--cs-muted,#757575)]">
            {order.vehicle?.license_plate ?? "Chưa có biển số"}
            {order.received_at ? ` · Tiếp nhận ${formatEventTime(order.received_at)}` : ""}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-2 text-xs font-extrabold ${statusColorClasses[statusColor(status)]}`}>
          ● {repairStatusLabel[status] ?? status}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 [&_h3]:mb-5 [&_h3]:text-[17px] [&_h3]:font-extrabold">
        <section aria-label="Tiến độ công việc">
          <h3>Tiến độ công việc</h3>
          {status === "WAITING_FOR_PARTS" && <p className="mb-5 rounded-lg border-l-[3px] border-[#cf2935] bg-[var(--cs-soft,#fff1f1)] px-3.5 py-3 text-xs leading-6">Đang tạm dừng do chờ phụ tùng. Gara sẽ tiếp tục khi có vật tư.</p>}
          {status === "QUOTING" && <p className="mb-5 rounded-lg border-l-[3px] border-[#cf2935] bg-[var(--cs-soft,#fff1f1)] px-3.5 py-3 text-xs leading-6">Gara đang lập báo giá để bạn xem xét.</p>}
          <ol className="m-0 list-none p-0">
            {stages.map((stage, index) => {
              const isCurrent = stage.status === status || (status === "QUOTING" && stage.status === "INSPECTING") ||
                ((status === "WAITING_FOR_PARTS" || status === "REVIEW_TEST") && stage.status === "IN_PROGRESS");
              const isPast = current > index && !(isEarlyClosed && index > 0) && !["CLOSED"].includes(status);
              const isVisible = isCurrent || isPast;
              return <li key={stage.status} className={`relative min-h-11 border-l border-[var(--cs-border,#e9e9e6)] pb-5 pl-7 last:border-l-transparent before:absolute before:left-[-6px] before:top-1 before:size-3 before:rounded-full before:border-2 before:border-[#cf2935] before:bg-[var(--cs-surface,#fff)] ${isVisible ? "before:bg-[#cf2935]" : "opacity-50"} [&_small]:mt-2 [&_small]:block [&_small]:text-xs [&_small]:text-[var(--cs-muted,#757575)]`}>
                <span className={`inline-flex w-fit max-w-full items-center rounded-full px-3 py-1.5 text-xs font-extrabold leading-5 ${statusColorClasses[stage.color]}`}>{stage.label}</span>
                {isCurrent && <small>{status === "WAITING_FOR_PARTS" ? "Đang chờ phụ tùng" : status === "REVIEW_TEST" ? "Đang kiểm tra lại" : "Đang ở bước này"}</small>}
              </li>;
            })}
          </ol>
        </section>
        <section aria-label="Nhật ký gần đây" >
          <h3>Nhật ký gần đây</h3>
          {loadingHistory && <p className="text-sm leading-relaxed text-[var(--cs-muted,#757575)]">Đang tải nhật ký...</p>}
          {!loadingHistory && historyError && <p className="text-sm leading-relaxed text-[var(--cs-muted,#757575)]">Chưa tải được nhật ký. Vui lòng thử tải lại trang.</p>}
          {!loadingHistory && !historyError && history.length === 0 && <p className="text-sm leading-relaxed text-[var(--cs-muted,#757575)]">Chưa có cập nhật mới.</p>}
          {!loadingHistory && !historyError && history.map(event => <div className="mb-3 flex flex-col gap-1.5 border-b border-[var(--cs-border,#e9e9e6)] py-1 pb-4 last:border-0 [&_strong]:break-words [&_strong]:text-[13px] [&_strong]:leading-6 [&_span]:text-xs [&_span]:text-[var(--cs-muted,#757575)]" key={event.id}>
            <strong>{event.note?.trim() || repairStatusLabel[event.status] || "Cập nhật trạng thái phiếu"}</strong>
            <span>{formatEventTime(event.created_at)}</span>
          </div>)}
          {!loadingHistory && !historyError && !history.length && (detail?.note || order.note) &&
            <p className="text-sm leading-relaxed text-[var(--cs-muted,#757575)]">{detail?.note || order.note}</p>}
        </section>
      </div>
    </article>
  );
}

export default function RepairStatus() {
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyRepairOrders()
      .then(data => { if (active) { setOrders(data); setError(""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Không thể tải tiến độ xe."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return <section className="min-h-[calc(100dvh-180px)] px-5 py-12 sm:px-6 sm:pb-16 bg-[var(--cs-bg,#f7f7f6)] text-[var(--cs-text,#191919)] ">
    <div className="mx-auto w-full max-w-[1200px]">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5 [&_h1]:text-[clamp(29px,4vw,46px)] [&_h1]:font-extrabold [&_h1]:tracking-[-0.055em] [&_h1]:leading-[1.16] [&_p:not(:first-child)]:mt-2.5 [&_p:not(:first-child)]:text-sm [&_p:not(:first-child)]:text-[var(--cs-muted,#757575)]"><div>
        <p className="mb-2.5 text-xs font-extrabold tracking-[0.16em] text-[#cf2935]">MY GARAGE / TRACKING</p>
        <h1>Hành trình sửa chữa</h1>
        <p>Biết xe đang ở công đoạn nào và công việc tiếp theo là gì.</p>
      </div></header>
      {loading && <div className="my-4 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] px-5 py-12 text-center text-[var(--cs-muted,#757575)] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-[var(--cs-text,#191919)] [&_a]:mt-5">Đang tải hành trình sửa chữa...</div>}
      {error && <div role="alert" className="my-3.5 flex items-center justify-between gap-4 rounded-xl border border-[#426c4d] bg-[#20362a] px-4 py-3 text-[#b8eac3] [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-current [&_button]:px-3 [&_button]:py-1.5 border-[#a64753] bg-[#45272d] text-[#ffb1b9]"><span>{error}</span><button type="button" onClick={() => setReload(x => x + 1)}>Thử lại</button></div>}
      {!loading && !error && orders.length === 0 && <div className="my-4 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] px-5 py-12 text-center text-[var(--cs-muted,#757575)] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-[var(--cs-text,#191919)] [&_a]:mt-5"><h2>Chưa có phiếu sửa chữa</h2><p>Khi gara tiếp nhận xe, trạng thái công việc sẽ xuất hiện tại đây.</p><Link to="/customer/appointments" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cf2935] bg-[#cf2935] px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-[#af1f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]">Xem lịch hẹn của tôi</Link></div>}
      {!loading && !error && orders.map(order => <TrackingCard key={order.id} order={order} />)}
    </div>
  </section>;
}
