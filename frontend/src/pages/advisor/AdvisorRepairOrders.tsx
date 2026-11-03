import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listWorkflowOrders, type WorkflowOrder, type WorkflowPage } from "../../services/workflowService";
import { card, outline, WorkflowTitle, Notice, Status, errorText, formatDateTime } from "./WorkflowUI";

const filters: Array<[string, string]> = [
  ["", "Tất cả"], ["RECEIVED", "Chờ kiểm tra"], ["INSPECTING", "Đang kiểm tra"], ["QUOTING", "Chờ lập báo giá"],
  ["WAITING_APPROVAL", "Chờ khách duyệt"], ["IN_PROGRESS", "Đang sửa"], ["WAITING_FOR_PARTS", "Chờ phụ tùng"],
  ["COMPLETED", "Chờ thanh toán"], ["HANDED_OVER", "Đã bàn giao"], ["CLOSED", "Đã đóng"],
];

export default function AdvisorRepairOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const [list, setList] = useState<WorkflowPage<WorkflowOrder> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setList(await listWorkflowOrders(page, status)); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { void load(); }, [load]);

  return <main className="mx-auto max-w-6xl pb-12">
    <WorkflowTitle label="SERVICE DESK / REPAIR ORDERS" title="Phiếu sửa chữa" sub="Danh sách phiếu thực tế. Tạo phiếu tại bước tiếp nhận xe, sau đó mở phiếu để kiểm tra, báo giá và sửa chữa."/>
    <div className="mb-5 flex flex-wrap gap-3"><Link className={outline} to="/advisor/reception">+ Tiếp nhận xe và lập phiếu</Link><button type="button" className={outline} disabled={loading} onClick={() => void load()}>Làm mới</button></div>
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">{filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={status === value}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${status === value ? "border-cs-accent bg-cs-accent text-cs-accent-contrast" : "border-cs-border bg-cs-surface-2 text-cs-text hover:border-cs-accent/60"}`}
      onClick={() => { setPage(1); setSearchParams(value ? { status: value } : {}); }}>{label}</button>)}</div>
    {error && <Notice tone="error">{error}</Notice>}
    <section className={card}>
      <div className="mb-5 flex justify-between gap-3"><h2 className="font-bold text-cs-text">Danh sách phiếu</h2><span className="text-sm text-cs-muted">{list?.total ?? 0} phiếu</span></div>
      {loading && <p className="py-8 text-center text-cs-muted">Đang tải phiếu...</p>}
      {!loading && !list?.data?.length && <p className="py-8 text-center text-cs-muted">Chưa có phiếu sửa chữa. Hãy tiếp nhận một lịch đã xác nhận.</p>}
      {!loading && !!list?.data?.length && <div className="space-y-3">{list.data.map(order => <Link key={order.id} to={`/advisor/service-orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cs-border bg-cs-surface-2 p-4 transition hover:border-cs-accent hover:bg-cs-soft">
        <div><p className="font-bold text-cs-text">{order.repair_order_code || `Phiếu #${order.id}`}</p><p className="mt-1 text-sm text-cs-muted">{order.customer?.full_name || `Khách #${order.customer_id}`} · {order.vehicle?.license_plate || `Xe #${order.vehicle_id}`}</p><p className="mt-1 text-xs text-cs-muted">Nhận: {formatDateTime(order.received_at)}</p></div>
        <div className="flex items-center gap-3"><Status status={order.status}/><span className="text-xs font-bold text-cs-accent">Chi tiết →</span></div>
      </Link>)}</div>}
      {!!list && list.last_page > 1 && <div className="mt-6 flex items-center justify-between border-t border-cs-border pt-4"><button type="button" disabled={page <= 1 || loading} className={outline} onClick={() => setPage(p => Math.max(1,p-1))}>← Trước</button><span className="text-sm text-cs-muted">{page}/{list.last_page}</span><button type="button" disabled={page >= list.last_page || loading} className={outline} onClick={() => setPage(p => p+1)}>Sau →</button></div>}
    </section>
  </main>;
}
