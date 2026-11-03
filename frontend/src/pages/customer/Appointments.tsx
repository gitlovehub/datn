import "../../styles/atelier-customer-pages.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  appointmentStatusLabel,
  cancelAppointment,
  formatDate,
  formatTime,
  getAppointmentDetail,
  getMyAppointments,
  getVehicleName,
  requestTypeLabel,
  updateAppointment,
  type CustomerAppointment,
  type Pagination,
} from "../../services/customerApi";

const statusBadge: Record<string, string> = {
  PENDING: "bg-[#F3F4F2] text-[#66717C]",
  CONFIRMED: "bg-[#F3E8D2] text-[#3A3020]",
  CHECKED_IN: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-slate-100 text-slate-500",
};

const canCancel = (a: CustomerAppointment) => ["PENDING", "CONFIRMED"].includes(a.status);
const canEdit = (a: CustomerAppointment) => a.status === "PENDING";

const errorText = (e: unknown, fallback: string) => {
  const err = e as { message?: string; data?: { message?: string; errors?: Record<string, string[]> } };
  const first = err?.data?.errors ? Object.values(err.data.errors).flat()[0] : undefined;
  return first || err?.data?.message || err?.message || fallback;
};

function servicesText(a: CustomerAppointment) {
  const names = [
    ...(a.services ?? []).map((s) => s.name),
    ...(a.packages ?? []).map((p) => p.name),
  ];
  return names.length > 0 ? names.join(", ") : requestTypeLabel[a.request_type] ?? a.request_type;
}

function Appointments() {
  const [items, setItems] = useState<CustomerAppointment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<CustomerAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getMyAppointments({ status, page, perPage: 10 })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e, "Không thể tải danh sách lịch hẹn."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, reloadKey]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) =>
      [a.appointment_code, a.vehicle?.license_plate, getVehicleName(a.vehicle), servicesText(a)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, keyword]);

  const openDetail = useCallback(async (a: CustomerAppointment) => {
    setSelected(a);
    setEditing(false);
    setCancelling(false);
    setCancelReason("");
    setModalError("");
    setDetailLoading(true);
    try {
      const detail = await getAppointmentDetail(a.id);
      setSelected(detail);
      setEditDate(detail.appointment_date?.slice(0, 10) ?? "");
      setEditTime(formatTime(detail.appointment_time));
    } catch (e) {
      setModalError(errorText(e, "Không thể tải chi tiết lịch hẹn."));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeModal = () => {
    setSelected(null);
    setEditing(false);
    setCancelling(false);
    setModalError("");
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    if (!editDate || !editTime) {
      setModalError("Vui lòng chọn ngày và giờ hẹn.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await updateAppointment(selected.id, {
        appointment_date: editDate,
        appointment_time: editTime,
      });
      setNotice("Đã cập nhật lịch hẹn thành công.");
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (e) {
      setModalError(errorText(e, "Không thể cập nhật lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setSaving(true);
    setModalError("");
    try {
      await cancelAppointment(selected.id, cancelReason.trim() || "Khách hàng chủ động hủy");
      setNotice("Đã hủy lịch hẹn.");
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (e) {
      setModalError(errorText(e, "Không thể hủy lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  const awaitingCount = items.filter(a => ["PENDING", "CREATED"].includes(a.status)).length;
  const confirmedCount = items.filter(a => a.status === "CONFIRMED").length;
  const badgeKind = (value: string) => value === "CONFIRMED" ? "confirmed" : ["PENDING", "CREATED"].includes(value) ? "pending" : value === "CANCELLED" ? "cancelled" : "neutral";

  return (
    <div className="at-customer-page at-customer-appointments">
      <div className="at-customer-container">
        <div className="at-customer-heading">
          <div><p className="at-customer-eyebrow">MY GARAGE / APPOINTMENTS</p>
          <h1>Lịch hẹn của tôi</h1>
          <p>Theo dõi lịch đã gửi, xác nhận từ gara và thông tin tiếp nhận.</p></div>
          <Link className="at-customer-primary" to="/customer/booking">＋ Đặt lịch mới</Link>
        </div>
        {notice && <div role="status" className="at-customer-notice">{notice}<button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
        <div className="at-customer-stats">
          <div className="at-customer-stat"><span>TỔNG LỊCH HẸN</span><strong>{loading ? "…" : pagination.total}</strong><small>Trong tài khoản của bạn</small></div>
          <div className="at-customer-stat"><span>CHỜ XÁC NHẬN</span><strong>{loading ? "…" : awaitingCount}</strong><small>Trên trang hiện tại · Cố vấn sẽ phản hồi</small></div>
          <div className="at-customer-stat"><span>ĐÃ XÁC NHẬN</span><strong>{loading ? "…" : confirmedCount}</strong><small>Trên trang hiện tại · Sẵn sàng đến gara</small></div>
        </div>
        <div className="at-customer-filter">
          <label htmlFor="appointment-status">Lọc trạng thái</label>
          <select id="appointment-status" value={status} onChange={e => {setStatus(e.target.value);setPage(1)}}>
            <option value="">Tất cả lịch hẹn</option>
            {Object.entries(appointmentStatusLabel).map(([code,label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <label className="at-search-label" htmlFor="appointment-keyword">Tìm kiếm</label>
          <input id="appointment-keyword" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Mã lịch, biển số, tên xe…" />
        </div>
        {error && <div role="alert" className="at-customer-notice at-customer-error"><span>{error}</span><button type="button" onClick={() => setReloadKey(k=>k+1)}>Thử lại</button></div>}
        {loading && <div className="at-customer-empty">Đang tải lịch hẹn...</div>}
        {!loading && filtered.length===0 && <div className="at-customer-empty"><h2>Chưa có lịch hẹn phù hợp</h2><p>Thử đổi bộ lọc hoặc tạo lịch bảo dưỡng mới.</p><Link to="/customer/booking" className="at-customer-primary">Đặt lịch bảo dưỡng</Link></div>}
        {!loading && filtered.map(a => <article key={a.id} className="at-appointment-card">
          <div className="at-appointment-top">
            <div><p className="at-appointment-code">{a.appointment_code}</p><h2>{getVehicleName(a.vehicle)}</h2><p className="at-appointment-description">{a.vehicle?.license_plate ?? "Chưa có biển số"} · {servicesText(a)}</p></div>
            <span className={`at-customer-status is-${badgeKind(a.status)}`}>● {appointmentStatusLabel[a.status] ?? a.status}</span>
          </div>
          <div className="at-appointment-bottom">
            <strong>▣ {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}</strong>
            <div className="at-appointment-actions"><button type="button" onClick={() => void openDetail(a)}>Chi tiết</button>
              {canCancel(a) && <button type="button" onClick={() => { void openDetail(a).then(() => setCancelling(true)); }}>Hủy lịch</button>}
            </div>
          </div>
        </article>)}
        {pagination.last_page>1 && <div className="at-customer-pagination"><span>Trang {pagination.current_page}/{pagination.last_page} · {pagination.total} lịch hẹn</span><div>
          <button disabled={page<=1} onClick={() => setPage(p=>Math.max(1,p-1))}>← Trước</button>
          <button disabled={page>=pagination.last_page} onClick={() => setPage(p=>p+1)}>Sau →</button>
        </div></div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT LỊCH HẸN
                </p>
                <h3 className="text-lg font-extrabold text-[#1F2933]">{selected.appointment_code}</h3>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    statusBadge[selected.status] ?? statusBadge.PENDING
                  }`}
                >
                  {appointmentStatusLabel[selected.status] ?? selected.status}
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <p className="py-8 text-center text-xs text-[#8A949E]">Đang tải chi tiết...</p>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4">
                  <div>
                    <p className="text-slate-400">Xe</p>
                    <p className="mt-0.5 font-bold text-slate-800">{getVehicleName(selected.vehicle)}</p>
                    <p className="font-mono text-slate-500">{selected.vehicle?.license_plate ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Loại yêu cầu</p>
                    <p className="mt-0.5 font-bold text-slate-800">
                      {requestTypeLabel[selected.request_type] ?? selected.request_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ngày hẹn</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatDate(selected.appointment_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Giờ hẹn</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatTime(selected.appointment_time)}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-700">Dịch vụ / gói đã chọn</p>
                  <p className="mt-1 text-slate-600">{servicesText(selected)}</p>
                </div>
                {selected.symptom_description && (
                  <div>
                    <p className="font-bold text-slate-700">Mô tả tình trạng</p>
                    <p className="mt-1 text-slate-600">{selected.symptom_description}</p>
                  </div>
                )}
                {selected.note && (
                  <div>
                    <p className="font-bold text-slate-700">Ghi chú</p>
                    <p className="mt-1 text-slate-600">{selected.note}</p>
                  </div>
                )}
                {selected.status === "CANCELLED" && selected.cancel_reason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
                    <strong>Lý do hủy:</strong> {selected.cancel_reason}
                  </div>
                )}

                {editing && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E1E4E6] p-4">
                    <div>
                      <label className="mb-1 block font-semibold">Ngày hẹn mới</label>
                      <input
                        type="date"
                        min={todayISO}
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[#DDE1E4] px-3 outline-none focus:border-[#D6A85F]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Giờ hẹn mới</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[#DDE1E4] px-3 outline-none focus:border-[#D6A85F]"
                      />
                    </div>
                  </div>
                )}

                {cancelling && (
                  <div className="rounded-xl border border-[#E1E4E6] p-4">
                    <label className="mb-1 block font-semibold">Lý do hủy (không bắt buộc)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={255}
                      rows={3}
                      className="w-full rounded-lg border border-[#DDE1E4] p-3 outline-none focus:border-[#D6A85F]"
                    />
                  </div>
                )}

                {modalError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
                    {modalError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="cs-btn cs-btn-secondary"
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSaveEdit()}
                        className="cs-btn cs-btn-primary"
                      >
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </>
                  ) : cancelling ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCancelling(false)}
                        className="cs-btn cs-btn-secondary"
                      >
                        Không hủy
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleCancel()}
                        className="cs-btn cs-btn-danger"
                      >
                        {saving ? "Đang hủy..." : "Xác nhận hủy lịch"}
                      </button>
                    </>
                  ) : (
                    <>
                      {canEdit(selected) && (
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="cs-btn cs-btn-secondary"
                        >
                          Đổi ngày giờ
                        </button>
                      )}
                      {canCancel(selected) && (
                        <button
                          type="button"
                          onClick={() => setCancelling(true)}
                          className="cs-btn cs-btn-danger-outline"
                        >
                          Hủy lịch
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeModal}
                        className="cs-btn cs-btn-primary"
                      >
                        Đóng
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;