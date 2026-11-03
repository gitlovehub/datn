import { useEffect, useMemo, useState } from "react";
import { Toast, type ToastType } from "../../components/auth/Toast";
import "../../styles/atelier-customer-pages.css";
import "../../styles/atelier-customer-complete.css";
import {
  formatMoney,
  getMyRepairOrderDetail,
  getMyRepairOrders,
  getVehicleName,
  quotationStatusLabel,
  respondQuotation,
  type CustomerQuotation,
  type CustomerRepairOrder,
} from "../../services/customerApi";

type QuotationRow = {
  quotation: CustomerQuotation;
  order: CustomerRepairOrder;
};

export default function QuotationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const orders = await getMyRepairOrders();
      const detailed = await Promise.all(
        orders.map(async (o) => {
          try {
            return await getMyRepairOrderDetail(o.id);
          } catch {
            return o;
          }
        }),
      );

      const list: QuotationRow[] = [];
      detailed.forEach((order) => {
        (order.quotations ?? []).forEach((q) => {
          list.push({ quotation: q, order });
        });
      });

      // Sắp xếp mới nhất lên đầu
      list.sort((a, b) => b.quotation.id - a.quotation.id);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách báo giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openModal = (row: QuotationRow) => {
    setSelectedRow(row);
    setSubmitError("");
    const initialChecked: Record<number, boolean> = {};
    (row.quotation.items ?? []).forEach((it) => {
      // Mặc định chọn true nếu chưa duyệt, hoặc lấy theo is_approved đã lưu
      initialChecked[it.id] = it.is_approved !== false;
    });
    setSelectedItems(initialChecked);
  };

  const closeModal = () => {
    setSelectedRow(null);
    setSubmitError("");
  };

  const handleToggleItem = (itemId: number) => {
    if (selectedRow?.quotation.status !== "SENT") return;
    setSelectedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSelectAll = (approveAll: boolean) => {
    if (selectedRow?.quotation.status !== "SENT") return;
    const next: Record<number, boolean> = {};
    (selectedRow.quotation.items ?? []).forEach((it) => {
      next[it.id] = approveAll;
    });
    setSelectedItems(next);
  };

  const handleRespond = async (isFullReject = false) => {
    if (!selectedRow) return;
    setSubmitting(true);
    setSubmitError("");

    const responses = (selectedRow.quotation.items ?? []).map((it) => ({
      item_id: it.id,
      is_approved: isFullReject ? false : Boolean(selectedItems[it.id]),
    }));

    try {
      await respondQuotation(selectedRow.quotation.id, responses);
      setToast({
        message: isFullReject
          ? "Đã từ chối toàn bộ báo giá."
          : "Đã gửi phản hồi duyệt báo giá thành công.",
        type: "success",
      });
      closeModal();
      await loadData();
    } catch (e) {
      const err = e as { message?: string; data?: { message?: string } };
      setSubmitError(err?.data?.message || err?.message || "Không thể gửi phản hồi báo giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ quotation, order }) => {
      if (statusFilter !== "ALL" && quotation.status !== statusFilter) return false;
      if (!q) return true;
      return [
        quotation.quotation_code,
        order.repair_order_code,
        order.vehicle?.license_plate,
        getVehicleName(order.vehicle),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [rows, statusFilter, search]);

  const pendingCount = rows.filter((r) => r.quotation.status === "SENT").length;
  const approvedCount = rows.filter((r) =>
    ["APPROVED", "PARTIALLY_APPROVED"].includes(r.quotation.status),
  ).length;

  return <section className="at-customer-page at-customer-quotes"><div className="at-customer-container">
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}
    <header className="at-customer-heading"><div>
      <p className="at-customer-eyebrow">MY GARAGE / QUOTATIONS</p>
      <h1>Báo giá của tôi</h1>
      <p>Xem từng hạng mục và quyết định những công việc được phép thực hiện.</p>
    </div></header>
    <div className="at-customer-stats">
      <div className="at-customer-stat"><span>TỔNG BÁO GIÁ</span><strong>{loading ? "—" : rows.length}</strong><small>Báo giá thuộc tài khoản</small></div>
      <div className="at-customer-stat"><span>CHỜ BẠN DUYỆT</span><strong>{loading ? "—" : pendingCount}</strong><small>Đang chờ phản hồi</small></div>
      <div className="at-customer-stat"><span>ĐÃ DUYỆT</span><strong>{loading ? "—" : approvedCount}</strong><small>Toàn bộ hoặc một phần</small></div>
    </div>
    <div className="at-customer-filter">
      <label htmlFor="quote-status">Lọc trạng thái</label>
      <select id="quote-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value="ALL">Tất cả báo giá</option><option value="SENT">Chờ bạn duyệt</option>
        <option value="APPROVED">Đã duyệt</option><option value="PARTIALLY_APPROVED">Đã duyệt một phần</option>
        <option value="REJECTED">Đã từ chối</option><option value="CANCELLED">Đã hủy</option>
      </select>
      <input aria-label="Tìm báo giá" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Mã báo giá, biển số, tên xe..."/>
    </div>
    {loading && <div className="at-customer-empty">Đang tải báo giá...</div>}
    {error && <div role="alert" className="at-customer-notice at-customer-error"><span>{error}</span><button type="button" className="cs-btn cs-btn-secondary cs-btn-sm" onClick={() => void loadData()}>Thử lại</button></div>}
    {!loading && !error && filtered.length===0 && <div className="at-customer-empty"><h2>Chưa có báo giá phù hợp</h2>
      <p>Khi gara lập báo giá cho xe của bạn, thông tin sẽ xuất hiện tại đây.</p></div>}
    {!loading && !error && filtered.map(row => <article key={row.quotation.id} className="at-quote-card">
      <div className="at-appointment-top"><div>
        <p className="at-appointment-code">{row.quotation.quotation_code}</p>
        <h2>{getVehicleName(row.order.vehicle)}</h2>
        <p className="at-appointment-description">{row.order.vehicle?.license_plate ?? "Chưa có biển số"} · {row.order.repair_order_code}</p>
      </div><span className={`at-customer-status ${row.quotation.status === "SENT" ? "is-pending" : row.quotation.status === "REJECTED" || row.quotation.status === "CANCELLED" ? "is-cancelled" : "is-confirmed"}`}>● {quotationStatusLabel[row.quotation.status] ?? row.quotation.status}</span></div>
      <div className="at-quote-bottom"><div><small>TỔNG DỰ KIẾN</small><strong>{formatMoney(row.quotation.total_amount)}</strong>
        <span>{row.quotation.items?.length ?? 0} hạng mục · Phiên bản {row.quotation.version}</span></div>
        <button type="button" className={row.quotation.status === "SENT" ? "at-customer-primary" : "at-customer-outline"} onClick={() => openModal(row)}>
          {row.quotation.status === "SENT" ? "Xem và duyệt →" : "Xem chi tiết →"}</button></div>
    </article>)}
    <p className="at-customer-footnote">Báo giá chỉ có hiệu lực sau khi bạn phê duyệt các hạng mục. Gara không tự duyệt thay bạn.</p>
  </div>
  {selectedRow && <div className="at-customer-modal-backdrop" role="presentation" onMouseDown={event => {if(event.target===event.currentTarget)closeModal();}}>
    <div className="at-customer-modal" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title">
      <div className="at-modal-head"><div><p className="at-customer-eyebrow">CHI TIẾT / BÁO GIÁ</p>
        <h2 id="quote-modal-title">{selectedRow.quotation.quotation_code}</h2>
        <p>{getVehicleName(selectedRow.order.vehicle)} · {selectedRow.order.vehicle?.license_plate ?? "Chưa có biển số"}</p>
      </div><button type="button" className="at-modal-close" onClick={closeModal} aria-label="Đóng cửa sổ">✕</button></div>
      <div className="at-modal-summary"><span>{quotationStatusLabel[selectedRow.quotation.status] ?? selectedRow.quotation.status}</span><strong>{formatMoney(selectedRow.quotation.total_amount)}</strong></div>
      <p className="at-quote-instruction">{selectedRow.quotation.status === "SENT" ? "Chọn hạng mục bạn đồng ý thực hiện. Bỏ chọn những hạng mục chưa muốn sửa." : "Danh sách hạng mục trong báo giá."}</p>
      {selectedRow.quotation.status === "SENT" && <div className="at-quote-select-all"><button type="button" className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => handleSelectAll(true)}>Chọn tất cả</button><button type="button" className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => handleSelectAll(false)}>Bỏ chọn</button></div>}
      <div className="at-quote-items">{(selectedRow.quotation.items ?? []).map(item => <label className="at-quote-item" key={item.id}>
        {selectedRow.quotation.status === "SENT" && <input type="checkbox" checked={Boolean(selectedItems[item.id])} onChange={() => handleToggleItem(item.id)}/>}
        <div><small>{item.item_type === "PART" ? "PHỤ TÙNG" : "DỊCH VỤ"}</small><strong>{item.description || "Hạng mục sửa chữa"}</strong>
          <span>Số lượng: {Number(item.quantity)} · Đơn giá: {formatMoney(item.unit_price)}</span></div>
        <b>{formatMoney(item.amount)}</b>
      </label>)}{!selectedRow.quotation.items?.length && <p className="at-quote-instruction">Chưa có chi tiết hạng mục.</p>}</div>
      {submitError && <p role="alert" className="at-customer-notice at-customer-error">{submitError}</p>}
      <div className="at-modal-actions"><button type="button" className="at-customer-outline" onClick={closeModal}>Đóng</button>
        {selectedRow.quotation.status === "SENT" && <><button type="button" disabled={submitting} className="at-danger-outline" onClick={() => void handleRespond(true)}>Từ chối</button>
          <button type="button" disabled={submitting || !selectedRow.quotation.items?.length} className="at-customer-primary" aria-busy={submitting} onClick={() => void handleRespond(false)}>{submitting ? "Đang gửi..." : "Xác nhận duyệt báo giá"}</button></>}
      </div>
    </div>
  </div>}
  </section>;

}