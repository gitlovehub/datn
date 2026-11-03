import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdvisorAppointments } from "../../services/advisorAppointmentService";
import { getDashboardSummary, type DashboardSummary } from "../../services/dashboardService";
import { Status, formatDateTime } from "../advisor/WorkflowUI";

// Reusable utility compositions. Every class is a static Tailwind v4 candidate;
// role-dependent colors are set with the existing --cs-* design tokens.
const ui = {
  task: "mt-[9px] flex items-center justify-between gap-4 rounded-xl border border-cs-border bg-cs-surface px-[17px] py-[15px] hover:border-cs-accent hover:bg-cs-surface-2 [&_strong]:text-[13px] [&_strong]:text-cs-text [&_p]:mt-[5px]! [&_p]:text-xs [&_p]:leading-[1.6] [&_p]:text-cs-muted [&>span]:shrink-0 [&>span]:font-[Manrope] [&>span]:text-[21px] [&>span]:font-extrabold [&>span]:text-cs-accent",
  panelPad: "min-w-0 overflow-hidden rounded-[19px] border border-cs-border bg-cs-surface p-[25px] max-[650px]:p-[19px]",
  outline: "inline-flex min-h-[42px] items-center justify-center gap-3 whitespace-nowrap rounded-[11px] border border-cs-border bg-cs-surface px-[17px] py-[11px] text-center text-xs font-extrabold text-cs-text! transition hover:border-cs-accent hover:brightness-95",
  panelTitle: "font-[Manrope] text-xl font-extrabold leading-[1.4] tracking-[-0.04em] max-[650px]:text-lg",
  panelHead: "flex items-center justify-between gap-[15px] border-b border-cs-border p-[25px_27px] max-[650px]:items-start max-[650px]:p-[19px]",
} as const;

type Appointment = {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  customer?: { full_name?: string } | null;
  vehicle?: { license_plate?: string | null } | null;
};
type AppointmentPayload = { data?: Appointment[] | { data?: Appointment[] }; pagination?: { total?: number } };
type Mode = "advisor" | "admin";
const pendingStatuses = new Set(["PENDING", "CREATED"]); // Backend currently uses PENDING; demo uses CREATED.
const statuses: Record<string, string> = {
  PENDING: "Chờ xác nhận", CREATED: "Chờ xác nhận", CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã tiếp nhận", CANCELLED: "Đã hủy",
};
function getItems(payload: AppointmentPayload): Appointment[] {
  const list = payload?.data;
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object" && Array.isArray(list.data)) return list.data;
  return [];
}
function dateLabel(value?: string) {
  if (!value) return "Chưa rõ ngày";
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}
function useAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let mounted = true;
    // The existing Laravel endpoint returns paginated data and supports status=PENDING.
    // Query the total separately; never present the first page as a global count.
    Promise.all([
      getAdvisorAppointments({ per_page: 100 }),
      getAdvisorAppointments({ per_page: 1, status: "PENDING" }),
    ]).then(([result, pending]: [AppointmentPayload, AppointmentPayload]) => {
      if (!mounted) return;
      setItems(getItems(result));
      setPendingCount(typeof pending?.pagination?.total === "number" ? pending.pagination.total : null);
      setPhase("ready");
    }).catch(() => { if (mounted) { setItems([]); setPendingCount(null); setPhase("error"); } });
    return () => { mounted = false; };
  }, [refreshKey]);
  return { items, pendingCount, phase, retry: () => { setPhase("loading"); setRefreshKey(previous => previous + 1); } };
}
function useSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    getDashboardSummary().then(data => { if (mounted) setSummary(data); }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, []);
  return { summary, failed };
}
const vnd = (value: number) => new Intl.NumberFormat("vi-VN", { notation: value >= 1e6 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value) + " ₫";
function OverviewMetric({ title, value, helper, featured, to, hint }: { title: string; value: string; helper: string; featured?: boolean; to?: string; hint?: string }) {
  const body = <article title={hint} className={`min-h-[144px] rounded-[17px] border p-[23px_24px] max-[650px]:min-h-[130px] max-[650px]:p-[17px_15px] ${featured ? "border-cs-accent bg-cs-accent text-cs-accent-contrast" : "border-cs-border bg-cs-surface"}`}>
    <div className={`text-xs font-extrabold uppercase leading-[1.5] tracking-[0.11em] max-[650px]:text-xs ${featured ? "text-cs-accent-contrast opacity-85" : "text-cs-muted"}`}>{title}</div><div className="mb-[5px] mt-[14px] font-[Manrope] text-[clamp(26px,2.8vw,33px)] font-extrabold leading-[1.3] tracking-[-0.055em]">{value}</div>
    <div className={`text-xs leading-[1.6] ${featured ? "text-cs-accent-contrast opacity-85" : "text-cs-muted"}`}>{helper}</div>
  </article>;
  return to ? <Link className="block rounded-[17px] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-cs-accent" to={to}>{body}</Link> : body;
}
function QueuePanel({ items, phase, role }: { items: Appointment[]; phase: "loading" | "ready" | "error"; role: Mode }) {
  return <section className="min-w-0 overflow-hidden rounded-[19px] border border-cs-border bg-cs-surface">
    <div className={ui.panelHead}><div><h2 className={ui.panelTitle}>{role === "advisor" ? "Lịch hẹn sắp đến" : "Hoạt động vận hành"}</h2>
      <p className="mt-1! text-xs leading-[1.6] text-cs-muted">{role === "advisor" ? "Các lịch tiếp nhận và xác nhận từ hệ thống." : "Lịch hẹn mới nhất từ hệ thống."}</p></div>
      <Link className={ui.outline} to={role === "advisor" ? "/advisor/appointments" : "/admin/appointments"}>Xem lịch <span aria-hidden="true">→</span></Link>
    </div>
    {phase === "loading" ? <div className="px-[25px] py-11 text-center text-[13px] leading-[1.7] text-cs-muted" role="status">Đang tải lịch hẹn…</div> :
      phase === "error" ? <div className="px-[25px] py-11 text-center text-[13px] leading-[1.7] text-cs-muted" role="alert">Không tải được lịch hẹn. Vui lòng thử lại khi API hoạt động.</div> :
      items.length === 0 ? <div className="px-[25px] py-11 text-center text-[13px] leading-[1.7] text-cs-muted">Chưa có lịch hẹn. Dữ liệu thực sẽ hiển thị tại đây.</div> :
      <div className="divide-y divide-cs-border">{items.slice(0, 6).map(item => <div className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-[14px] px-6 py-5 max-[650px]:grid-cols-[65px_minmax(0,1fr)] max-[650px]:gap-2.5 max-[650px]:p-[15px]" key={item.id}>
        <div className="[&_strong]:block [&_strong]:font-[Manrope] [&_strong]:text-xl [&_strong]:font-extrabold [&_strong]:leading-[1.35] [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-cs-muted"><strong>{item.appointment_time?.slice(0, 5) || "—"}</strong><small>{dateLabel(item.appointment_date)}</small></div>
        <div className="min-w-0 [&_strong]:break-words [&_strong]:text-xs [&_p]:mt-[5px]! [&_p]:break-words [&_p]:text-xs [&_p]:text-cs-muted"><strong>{item.customer?.full_name || item.appointment_code || "Lịch hẹn"}</strong>
          <p>{item.vehicle?.license_plate || "Chưa có biển số"} · {item.appointment_code || `#${item.id}`}</p></div>
        <span className={`inline-flex items-center rounded-[30px] bg-cs-surface-2 px-2.5 py-[7px] text-xs font-extrabold text-cs-muted max-[650px]:col-start-2 max-[650px]:justify-self-start ${pendingStatuses.has(item.status) ? "bg-cs-soft text-cs-accent" : ""}`}>{statuses[item.status] || item.status}</span>
      </div>)}</div>}
  </section>;
}
export default function WorkspaceDashboard({ role }: { role: Mode }) {
  const { items, pendingCount, phase, retry } = useAppointments();
  const { summary, failed } = useSummary();
  const metric = (pick: (data: DashboardSummary) => number | string) => summary ? String(pick(summary)) : failed ? "!" : "…";
  const why = (key: string) => summary?.definitions[key];
  const days = summary?.period_days ?? 30;
  const ready = phase === "ready";
  const countPending = pendingCount;
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const advisor = role === "advisor";
  const upcoming = items.filter(item => !["CANCELLED", "COMPLETED"].includes(item.status) && (!advisor || !item.appointment_date || item.appointment_date >= isoToday))
    .sort((a, b) => `${a.appointment_date || ""} ${a.appointment_time || ""}`.localeCompare(`${b.appointment_date || ""} ${b.appointment_time || ""}`));
  return <main className="mx-auto max-w-[1700px] px-[clamp(18px,3vw,46px)] pb-[72px] pt-[35px] text-cs-text max-[650px]:px-4 max-[650px]:pb-12 max-[650px]:pt-[25px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0">
    <div className="mb-8 flex items-start justify-between gap-4 max-[650px]:mb-[23px]"><div><p className="mb-[11px]! text-xs font-extrabold tracking-[0.14em] text-cs-accent">{advisor ? "SERVICE DESK / DAILY OPERATIONS" : "BUSINESS INTELLIGENCE / ATELIER"}</p>
      <h1 className="font-[Manrope] text-[clamp(31px,3.4vw,47px)] font-extrabold leading-[1.13] tracking-[-0.055em] max-[650px]:text-[30px]">{advisor ? "Chào buổi làm việc." : "Trung tâm điều hành."}</h1>
      <p className="mt-3! text-sm leading-[1.7] text-cs-muted">{advisor ? "Mọi việc cần xử lý hôm nay — tập trung tại một nơi." : "Theo dõi hoạt động gara trên dữ liệu API thực tế."}</p></div>
      <span className="inline-flex items-center gap-[9px] whitespace-nowrap rounded-full bg-cs-soft px-[14px] py-[9px] text-xs font-extrabold text-cs-accent max-[650px]:text-xs"><span className="size-[7px] rounded-full bg-current"/>{advisor ? new Intl.DateTimeFormat("vi-VN").format(new Date()) : "WORKSPACE"}</span>
    </div>
    <section className={`mb-5 flex min-h-[138px] items-center justify-between gap-5 rounded-[18px] px-[29px] py-6 max-[650px]:block max-[650px]:px-5 max-[650px]:py-[23px] ${advisor ? "bg-[#272018] text-[#f5e9d8]" : "border border-[#2e4030] bg-[#18231a] text-[#e5f9e0]"}`}>
      <div><p className={`mb-[14px]! text-xs font-extrabold tracking-[0.08em] ${advisor ? "text-[#dabb83]" : "text-[#bbfc67]"}`}>{advisor ? "TODAY'S FOCUS" : "OPERATIONAL OVERVIEW"}</p>
        <h2 className="font-[Manrope] text-[clamp(18px,2vw,23px)] font-extrabold leading-[1.3] tracking-[-0.025em]">{phase === "loading" ? "Đang cập nhật dữ liệu" : phase === "error" ? "Cần kiểm tra kết nối API" : `${countPending ?? "—"} lịch cần xác nhận`}</h2>
        <p className={`mt-[7px]! text-xs leading-[1.7] ${advisor ? "text-[#c8b8a3]" : "text-[#b2cbb0]"}`}>{advisor ? "Ưu tiên kiểm tra lịch đặt mới và lịch tiếp nhận đã xác nhận." : summary ? `${summary.repair_orders.in_garage} xe trong gara · ${summary.appointments.today} lịch hôm nay · tỉ lệ hủy ${summary.period.cancel_rate}% trong ${days} ngày.` : "Đang tải số liệu tổng hợp."}</p></div>
      {advisor ? <Link className="inline-flex min-h-[42px] items-center justify-center gap-3 whitespace-nowrap rounded-[11px] border border-transparent px-[17px] py-[11px] text-center text-xs font-extrabold transition hover:brightness-95 max-[650px]:mt-[17px] max-[650px]:w-full bg-[#e6c27b] text-[#242019]" to="/advisor/reception">Tiếp nhận xe <span aria-hidden="true">→</span></Link> :
        <Link className="inline-flex min-h-[42px] items-center justify-center gap-3 whitespace-nowrap rounded-[11px] border border-transparent px-[17px] py-[11px] text-center text-xs font-extrabold transition hover:brightness-95 max-[650px]:mt-[17px] max-[650px]:w-full bg-[#c5ff64] text-[#162111]" to="/admin/appointments">Quản lý lịch hẹn <span aria-hidden="true">→</span></Link>}
    </section>
    <div className="mb-5 grid grid-cols-4 gap-4 max-[1150px]:grid-cols-2 max-[650px]:gap-2.5">
      {advisor ? <>
        <OverviewMetric title="Lịch cần xác nhận" value={ready && countPending !== null ? String(countPending) : "—"} helper="Chờ cố vấn kiểm tra" featured/>
        <OverviewMetric title="Báo giá chờ duyệt" value={metric(d => d.repair_orders.waiting_approval)} helper={summary ? `${summary.repair_orders.waiting_quotation} phiếu chờ lập báo giá` : "Phiếu chờ khách duyệt"} to="/advisor/service-orders?status=WAITING_APPROVAL"/>
        <OverviewMetric title="Xe đang sửa" value={metric(d => d.repair_orders.in_progress)} helper={summary ? `${summary.repair_orders.waiting_parts} phiếu chờ phụ tùng` : "Đang sửa chữa"} to="/advisor/service-orders?status=IN_PROGRESS"/>
        <OverviewMetric title="Chờ bàn giao" value={metric(d => d.repair_orders.ready_for_pickup)} helper={summary ? `Đã thanh toán · ${summary.repair_orders.waiting_payment} phiếu chờ thu tiền` : "Đã thanh toán, chờ nhận xe"} hint={why("repair_orders.ready_for_pickup")} to="/advisor/service-orders?status=COMPLETED"/>
      </> : <>
        <OverviewMetric title="Doanh thu ghi nhận" value={summary ? vnd(summary.period.revenue) : metric(() => 0)} helper={`Tiền đã thu trong ${days} ngày qua`} hint={why("period.revenue")} featured/>
        <OverviewMetric title="Xe đang trong gara" value={metric(d => d.repair_orders.in_garage)} helper={summary ? `${summary.repair_orders.ready_for_pickup} xe chờ khách nhận` : "Chưa bàn giao"} hint={why("repair_orders.in_garage")}/>
        <OverviewMetric title="Lịch cần xác nhận" value={ready && countPending !== null ? String(countPending) : "—"} helper="Đang đợi cố vấn"/>
        <OverviewMetric title="Phụ tùng cảnh báo" value={metric(d => d.inventory.low_stock)} helper="Tồn kho ≤ mức cảnh báo" hint={why("inventory.low_stock")} to="/admin/inventory"/>
      </>}
    </div>
    <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] items-start gap-[22px] max-[1150px]:grid-cols-1">
      <QueuePanel items={upcoming} phase={phase} role={role}/>
      <div className="grid gap-5">
        <section className={ui.panelPad}><div className="flex items-center justify-between gap-[15px] pb-[18px]"><div><h2 className={ui.panelTitle}>{advisor ? "Ưu tiên xử lý" : "Ưu tiên hôm nay"}</h2></div><span className="rounded-lg bg-cs-surface-2 px-2.5 py-[7px] text-xs font-extrabold text-cs-muted">{advisor ? "ACTION QUEUE" : "ACTIONABLE"}</span></div>
          <Link className={ui.task} to={advisor ? "/advisor/appointments" : "/admin/appointments"}><div><strong>Lịch đặt mới</strong><p>Kiểm tra và xác nhận lịch</p></div><span>{ready && countPending !== null ? countPending : "—"}</span></Link>
          {advisor ? <>
            <Link className={ui.task} to="/advisor/service-orders?status=QUOTING"><div><strong>Cần lập báo giá</strong><p>Đã chẩn đoán, chờ báo giá cho khách</p></div><span>{summary ? summary.repair_orders.waiting_quotation : "→"}</span></Link>
            <Link className={ui.task} to="/advisor/service-orders?status=RECEIVED"><div><strong>Chờ kiểm tra / chẩn đoán</strong><p>Xe đã tiếp nhận, chưa có kết quả kiểm tra</p></div><span>{summary ? summary.repair_orders.waiting_diagnosis : "→"}</span></Link>
          </> : <>
            <Link className={ui.task} to="/admin/inventory"><div><strong>Quản lý kho</strong><p>Xem phụ tùng và vật tư</p></div><span>→</span></Link>
            <Link className={ui.task} to="/admin/services"><div><strong>Danh mục dịch vụ</strong><p>Kiểm tra các dịch vụ hiện có</p></div><span>→</span></Link>
          </>}
        </section>
        <section className={ui.panelPad}><h2 className={ui.panelTitle}>{advisor ? "Phiếu hoạt động gần đây" : "Sự kiện mới nhất"}</h2>
          {!summary ? <p className="mt-[14px]! text-xs leading-[1.8] text-cs-muted" role={failed ? "alert" : "status"}>{failed ? "Không tải được số liệu tổng hợp." : "Đang tải…"}</p> :
            summary.recent_orders.length === 0 ? <p className="mt-[14px]! text-xs leading-[1.8] text-cs-muted">Chưa có phiếu sửa chữa nào.</p> :
            <ul className="mt-3 divide-y divide-cs-border">{summary.recent_orders.map(order => {
              const content = <><div className="min-w-0"><strong className="block truncate text-[13px]">{order.repair_order_code} · {order.vehicle?.license_plate || "—"}</strong><p className="mt-1! truncate text-xs text-cs-muted">{order.customer?.full_name || "Khách hàng"} · {formatDateTime(order.updated_at)}</p></div><Status status={order.status}/></>;
              return <li key={order.id}>{advisor ? <Link className="flex items-center justify-between gap-3 rounded-lg py-3 hover:bg-cs-surface-2" to={`/advisor/service-orders/${order.id}`}>{content}</Link> : <div className="flex items-center justify-between gap-3 py-3">{content}</div>}</li>;
            })}</ul>}
          {phase === "error" && <button className={ui.outline} type="button" onClick={retry}>Tải lại lịch hẹn</button>}
        </section>
      </div>
    </div>
  </main>;
}
