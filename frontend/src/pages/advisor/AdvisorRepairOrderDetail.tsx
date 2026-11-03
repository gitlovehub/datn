import { useCallback, useEffect, useState } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useLocation, useParams } from "react-router-dom";
import { latestQuotation, workflowApi, type WorkflowOrder } from "../../services/workflowService";
import { card, outline, WorkflowTitle, Notice, Status, errorText, formatDateTime } from "./WorkflowUI";
import { InspectionPanel, PaymentPanel, QuotationPanel, RepairPanel } from "./RepairOrderPanels";

/** Các bước của phiếu sửa chữa theo thứ tự cố vấn thao tác; mỗi bước gồm những trạng thái thuộc về nó. */
const steps: Array<{ label: string; statuses: string[] }> = [
  { label: "Tiếp nhận", statuses: ["RECEIVED"] },
  { label: "Kiểm tra & chẩn đoán", statuses: ["INSPECTING"] },
  { label: "Báo giá", statuses: ["QUOTING", "WAITING_APPROVAL"] },
  { label: "Sửa chữa", statuses: ["IN_PROGRESS", "WAITING_FOR_PARTS"] },
  { label: "Thanh toán & bàn giao", statuses: ["COMPLETED", "HANDED_OVER"] },
];

function StepTracker({ status }: { status: string }) {
  const current = steps.findIndex(step => step.statuses.includes(status));
  const finished = status === "HANDED_OVER";
  return <ol className="mb-6 grid grid-cols-5 gap-2 print:hidden" aria-label="Tiến trình phiếu sửa chữa">
    {steps.map((step, index) => {
      const done = finished || index < current;
      const active = !finished && index === current;
      return <li key={step.label} aria-current={active ? "step" : undefined} className={`rounded-xl border px-2 py-2.5 text-center text-xs font-semibold sm:text-sm ${
        active ? "border-cs-accent bg-cs-soft text-cs-text" : done ? "border-cs-border bg-cs-surface text-cs-muted" : "border-dashed border-cs-border text-cs-muted"}`}>
        <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
          active ? "bg-cs-accent text-cs-accent-contrast" : done ? "bg-emerald-600 text-white" : "bg-cs-surface-2 text-cs-muted"}`}>{done ? "✓" : index + 1}</span>
        <span className="hidden sm:inline">{step.label}</span>
      </li>;
    })}
  </ol>;
}

export default function AdvisorRepairOrderDetail() {
  const id = Number(useParams().orderId);
  const { notify } = useAppFeedback();
  const location = useLocation();
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState((location.state as { success?: string } | null)?.success || "");
  const fetchOrder = useCallback(() => {
    if (!Number.isSafeInteger(id) || id < 1) return Promise.reject(new Error("Mã phiếu không hợp lệ."));
    return workflowApi.order(id);
  }, [id]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setOrder(await fetchOrder()); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  }, [fetchOrder]);
  useEffect(() => {
    let active = true;
    fetchOrder()
      .then(result => { if (active) setOrder(result); })
      .catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrder]);
  const refreshAfterAction = useCallback(async (message: string) => {
    setOrder(await fetchOrder());
    setSuccess(message); notify(message, "success");
  }, [fetchOrder, notify]);

  return <main data-print-repair-order className="mx-auto max-w-6xl pb-12">
    <div className="cs-btn-row mb-4 print:hidden">
      <Link className={outline} to="/advisor/service-orders">← Danh sách phiếu</Link>
      <button type="button" disabled={loading} className={outline} onClick={() => void load()}>Làm mới</button>
      <button type="button" className={outline} onClick={() => window.print()}>In phiếu sửa chữa</button>
    </div>
    <WorkflowTitle label="SERVICE DESK / REPAIR ORDER" title={order?.repair_order_code || `Phiếu sửa chữa #${id}`} sub="Mọi bước của phiếu thao tác trên trang này: kiểm tra, báo giá, sửa chữa, thu tiền và bàn giao."/>
    {error && <Notice tone="error">{error}</Notice>}{success && <Notice tone="success">{success}</Notice>}
    {loading && <p className="text-cs-muted">Đang tải dữ liệu phiếu...</p>}
    {!loading && order && <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cs-border bg-cs-soft px-5 py-4"><div className="text-sm font-semibold text-cs-text">Trạng thái hiện tại</div><Status status={order.status}/></div>
      {order.status === "CLOSED" ? <Notice tone="error">Phiếu đã đóng, không còn thao tác tiếp.</Notice> : <StepTracker status={order.status}/>}
      <section className={card}>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent print:hidden">Bước 1 · Tiếp nhận</p>
        <h2 className="mb-5 mt-1 text-lg font-bold text-cs-text">Phiếu tiếp nhận</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
          ["Khách hàng", order.customer?.full_name || `#${order.customer_id || "?"}`],
          ["Điện thoại", order.customer?.phone || "—"],
          ["Biển số", order.vehicle?.license_plate || `#${order.vehicle_id || "?"}`],
          ["Lịch hẹn", order.appointment_id ? `#${order.appointment_id}` : "Khách walk-in"],
          ["Cố vấn", order.advisor?.full_name || "—"],
          ["Nhận xe lúc", formatDateTime(order.received_at)],
          ["Số km", order.mileage_received == null ? "—" : `${order.mileage_received.toLocaleString("vi-VN")} km`],
        ].map(([name, value]) => <div key={name}><dt className="text-xs text-cs-muted">{name}</dt><dd className="mt-1 text-sm font-semibold text-cs-text">{value}</dd></div>)}</dl>
        <div className="mt-5 border-t border-cs-border pt-4"><p className="text-xs font-bold text-cs-muted">Tình trạng ban đầu</p><p className="mt-2 whitespace-pre-wrap text-sm text-cs-text">{order.initial_condition || "Chưa ghi"}</p></div>
        {order.note && <p className="mt-3 whitespace-pre-wrap text-sm text-cs-muted">Ghi chú: {order.note}</p>}
      </section>
      <InspectionPanel key={`inspection-${order.inspections?.[0]?.id ?? 0}-${order.inspections?.[0]?.recommendations?.length ?? 0}`} order={order} onChanged={refreshAfterAction}/>
      <QuotationPanel key={`quotation-${latestQuotation(order)?.id ?? 0}-${order.inspections?.[0]?.recommendations?.length ?? 0}`} order={order} onChanged={refreshAfterAction}/>
      <RepairPanel order={order} onChanged={refreshAfterAction}/>
      <PaymentPanel key={`payment-${order.invoice?.id ?? 0}-${order.invoice?.payments?.length ?? 0}`} order={order} onChanged={refreshAfterAction}/>
      <section className={`${card} mt-6`}><h2 className="mb-4 text-lg font-bold text-cs-text">Lịch sử xử lý phiếu</h2>
        {order.status_history?.length ? <ol className="space-y-3 border-l-2 border-cs-accent/40 pl-5">{order.status_history.map(item => <li key={item.id} className="text-sm text-cs-text"><Status status={item.status || ""}/><span className="ml-3 text-xs text-cs-muted">{formatDateTime(item.created_at)}</span>{item.note && <p className="mt-1 text-xs text-cs-muted">{item.note}</p>}</li>)}</ol> : <p className="text-sm text-cs-muted">Chưa có nhật ký.</p>}
      </section>
    </>}
  </main>;
}
