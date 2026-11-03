import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import { fetchApi } from "../../services/api";
import { getUserDisplayName } from "../auth/auth";
import {
  FINISHED_REPAIR_STATUSES,
  appointmentStatusLabel,
  formatDate,
  formatMoney,
  formatTime,
  getMyAppointments,
  getMyRepairOrderDetail,
  getMyRepairOrders,
  getMyVehicles,
  getVehicleName,
  repairStatusLabel,
  requestTypeLabel,
  updateMyVehicleMileage,
  type CustomerAppointment,
  type CustomerRepairOrder,
  type CustomerVehicle,
} from "../../services/customerApi";

const HOTLINE_DISPLAY = "033 240 5972";
const HOTLINE_TEL = "0332405972";

/* Bước hiển thị trên timeline và vị trí hiện tại theo trạng thái phiếu sửa chữa */
const STEPS = [
  { n: 1, title: "Tiếp nhận" },
  { n: 2, title: "Kiểm tra" },
  { n: 3, title: "Báo giá" },
  { n: 4, title: "Sửa chữa" },
  { n: 5, title: "Hoàn tất" },
];

const STEP_BY_STATUS: Record<string, number> = {
  RECEIVED: 1,
  INSPECTING: 2,
  WAITING_APPROVAL: 3,
  WAITING_FOR_PARTS: 4,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  HANDED_OVER: 5,
  CLOSED: 5,
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as { message?: string; data?: { message?: string; errors?: Record<string, string[]> } };
  const first = err?.data?.errors ? Object.values(err.data.errors).flat()[0] : undefined;
  return first || err?.data?.message || err?.message || fallback;
};

type User = { full_name?: string; name?: string; email?: string; customer?: { full_name?: string } | null } | null;

function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [details, setDetails] = useState<Record<number, CustomerRepairOrder>>({});

  const [searchKeyword, setSearchKeyword] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [showOdoModal, setShowOdoModal] = useState(false);
  const [odoVehicleId, setOdoVehicleId] = useState("");
  const [odoValue, setOdoValue] = useState("");
  const [odoSaving, setOdoSaving] = useState(false);
  const [odoError, setOdoError] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
  }, []);

  /* ---------- Tải dữ liệu thật ---------- */
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      const [profile, vehicleRes, appointmentRes, orderRes] = await Promise.allSettled([
        fetchApi("/me"),
        getMyVehicles(),
        getMyAppointments({ perPage: 50 }),
        getMyRepairOrders(),
      ]);
      if (!active) return;

      if (profile.status === "fulfilled" && profile.value?.account) {
        setUser(profile.value.account);
        localStorage.setItem("user", JSON.stringify(profile.value.account));
      }

      const failures: string[] = [];
      if (vehicleRes.status === "fulfilled") setVehicles(vehicleRes.value);
      else failures.push("danh sách xe");
      if (appointmentRes.status === "fulfilled") setAppointments(appointmentRes.value.items);
      else failures.push("lịch hẹn");

      let orderList: CustomerRepairOrder[] = [];
      if (orderRes.status === "fulfilled") {
        orderList = orderRes.value;
        setOrders(orderList);
      } else failures.push("phiếu sửa chữa");

      if (failures.length > 0) {
        setLoadError(`Không tải được ${failures.join(", ")}. Vui lòng thử lại.`);
      }

      /* Lấy chi tiết (hóa đơn) cho các phiếu để hiển thị chi phí */
      const targets = orderList.slice(0, 12);
      const results = await Promise.allSettled(targets.map((o) => getMyRepairOrderDetail(o.id)));
      if (!active) return;
      const map: Record<number, CustomerRepairOrder> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[targets[i].id] = r.value;
      });
      setDetails(map);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  /* ---------- Dữ liệu suy ra ---------- */
  const todayISO = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            ["PENDING", "CONFIRMED"].includes(a.status) &&
            a.appointment_date.slice(0, 10) >= todayISO,
        )
        .sort((a, b) =>
          `${a.appointment_date} ${a.appointment_time}`.localeCompare(
            `${b.appointment_date} ${b.appointment_time}`,
          ),
        ),
    [appointments, todayISO],
  );

  const activeOrder = useMemo(
    () => orders.find((o) => !FINISHED_REPAIR_STATUSES.includes(o.status)) ?? null,
    [orders],
  );
  const activeOrderCount = orders.filter((o) => !FINISHED_REPAIR_STATUSES.includes(o.status)).length;
  const history = useMemo(
    () => orders.filter((o) => FINISHED_REPAIR_STATUSES.includes(o.status)),
    [orders],
  );

  const orderTotal = (o: CustomerRepairOrder) => Number(details[o.id]?.invoice?.total_amount ?? 0);
  const totalSpent = history.reduce((sum, o) => sum + orderTotal(o), 0);

  const filteredHistory = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return history.filter((o) => {
      if (vehicleFilter !== "ALL" && String(o.vehicle_id) !== vehicleFilter) return false;
      if (!q) return true;
      return [o.repair_order_code, o.vehicle?.license_plate, getVehicleName(o.vehicle)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [history, searchKeyword, vehicleFilter]);

  const currentStep = activeOrder ? STEP_BY_STATUS[activeOrder.status] ?? 1 : 0;
  const selectedOrder =
    selectedOrderId !== null
      ? details[selectedOrderId] ?? orders.find((o) => o.id === selectedOrderId) ?? null
      : null;

  /* ---------- Hành động ---------- */
  const openOrderDetail = async (o: CustomerRepairOrder) => {
    setSelectedOrderId(o.id);
    setDetailError("");
    if (details[o.id]) return;
    setDetailLoading(true);
    try {
      const d = await getMyRepairOrderDetail(o.id);
      setDetails((prev) => ({ ...prev, [o.id]: d }));
    } catch (e) {
      setDetailError(errorText(e, "Không thể tải chi tiết phiếu."));
    } finally {
      setDetailLoading(false);
    }
  };

  const openOdoModal = () => {
    if (vehicles.length === 0) {
      showToast("Bạn chưa có xe nào. Hãy thêm xe trước khi cập nhật số ODO.", "warning");
      return;
    }
    const first = vehicles[0];
    setOdoVehicleId(String(first.id));
    setOdoValue(first.mileage != null ? String(first.mileage) : "");
    setOdoError("");
    setShowOdoModal(true);
  };

  const handleSaveOdo = async (e: React.FormEvent) => {
    e.preventDefault();
    const mileage = Number(odoValue);
    if (odoValue.trim() === "" || !Number.isInteger(mileage) || mileage < 0) {
      setOdoError("Vui lòng nhập số km hợp lệ (số nguyên, từ 0 trở lên).");
      return;
    }
    setOdoSaving(true);
    setOdoError("");
    try {
      await updateMyVehicleMileage(Number(odoVehicleId), mileage);
      setVehicles((prev) =>
        prev.map((v) => (String(v.id) === odoVehicleId ? { ...v, mileage } : v)),
      );
      setShowOdoModal(false);
      showToast(`Đã cập nhật số ODO thành ${mileage.toLocaleString("vi-VN")} km.`, "success");
    } catch (err) {
      setOdoError(errorText(err, "Không thể cập nhật số ODO."));
    } finally {
      setOdoSaving(false);
    }
  };

  const handleCopyHotline = async () => {
    try {
      await navigator.clipboard.writeText(HOTLINE_DISPLAY);
      showToast(`Đã sao chép số ${HOTLINE_DISPLAY}.`, "success");
    } catch {
      showToast(`Hotline: ${HOTLINE_DISPLAY}`, "info");
    }
  };

  const stepAction = (n: number) => {
    if (n === 3) navigate("/quotation");
    else navigate("/repair-status");
  };

  const selectedInvoice = selectedOrder?.invoice ?? null;
  const selectedWorkItems = selectedOrder?.workItems ?? selectedOrder?.work_items ?? [];
  const paidAmount = (selectedInvoice?.payments ?? [])
    .filter((p) => p.status === "SUCCESS")
    .reduce((s, p) => s + Number(p.amount), 0);

  const kpis = [
    {
      to: "/customer/cars",
      label: "Xe đã đăng ký",
      value: `${vehicles.length} xe`,
      hint: vehicles.length > 0 ? "Quản lý hồ sơ xe" : "Chưa có xe, thêm xe ngay",
    },
    {
      to: "/customer/appointments",
      label: "Lịch hẹn sắp tới",
      value: `${upcoming.length} lịch`,
      hint: upcoming[0]
        ? `Gần nhất: ${formatDate(upcoming[0].appointment_date)} · ${formatTime(upcoming[0].appointment_time)}`
        : "Chưa có lịch hẹn nào",
    },
    {
      to: "/repair-status",
      label: "Xe đang ở gara",
      value: `${activeOrderCount} xe`,
      hint: activeOrder
        ? repairStatusLabel[activeOrder.status] ?? activeOrder.status
        : "Hiện không có xe đang xử lý",
    },
    {
      to: "/invoices",
      label: "Tổng chi phí dịch vụ",
      value: formatMoney(totalSpent),
      hint: `${history.length} phiếu đã hoàn tất`,
    },
  ];

  return (
    <div className="at-customer-dashboard min-h-screen bg-[#F7F7F5] text-[#20252B]">

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1240px] px-6 py-8 md:px-8 md:py-10">
          {/* ===== TIÊU ĐỀ TRANG ===== */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / TỔNG QUAN DỊCH VỤ
              </p>
              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#1F2933]">
                Xin chào, {getUserDisplayName(user)}
              </h1>
              <p className="mt-1.5 text-[13px] leading-6 text-[#66717C]">
                {loading
                  ? "Đang đồng bộ dữ liệu của bạn..."
                  : "Theo dõi xe đang ở gara, lịch hẹn và toàn bộ lịch sử dịch vụ tại một nơi."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={openOdoModal}
                className="cs-btn cs-btn-secondary"
              >
                Cập nhật số ODO
              </button>
              <Link
                to="/booking"
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#1F2933] px-5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                + Đặt lịch bảo dưỡng
              </Link>
            </div>
          </div>

          {loadError && (
            <div className="mt-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="cursor-pointer rounded-lg border border-red-300 bg-white px-3 py-1 font-bold"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* ===== 4 THẺ THỐNG KÊ ===== */}
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Link
                key={kpi.to}
                to={kpi.to}
                className="group flex min-h-[116px] cursor-pointer flex-col justify-between rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)] transition hover:border-[#D6A85F] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    {kpi.label}
                  </p>
                  <span className="text-sm text-[#B5BDC5] transition group-hover:translate-x-0.5 group-hover:text-[#D6A85F]">
                    →
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-[#20252B]">
                    {loading ? "…" : kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-[#66717C]">{loading ? " " : kpi.hint}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ===== LƯỚI 2 CỘT ===== */}
          <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
            {/* ---------- CỘT TRÁI ---------- */}
            <div className="space-y-6 xl:col-span-2">
              {/* Xe đang ở gara */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                {activeOrder ? (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600">
                            Xe đang được xử lý tại gara
                          </p>
                        </div>
                        <h2 className="mt-2 text-lg font-bold text-[#1F2933]">
                          {getVehicleName(activeOrder.vehicle)} ·{" "}
                          <span className="font-mono text-[#8F641B]">
                            {activeOrder.vehicle?.license_plate ?? "—"}
                          </span>
                        </h2>
                        <p className="mt-1 text-xs text-[#66717C]">
                          Phiếu <strong>{activeOrder.repair_order_code}</strong> · Tiếp nhận{" "}
                          {formatDate(activeOrder.received_at)} {formatTime(activeOrder.received_at?.slice(11))} ·{" "}
                          {repairStatusLabel[activeOrder.status] ?? activeOrder.status}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {activeOrder.status === "WAITING_APPROVAL" && (
                          <Link
                            to="/quotation"
                            className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                          >
                            Duyệt báo giá
                          </Link>
                        )}
                        <Link
                          to="/repair-status"
                          className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#1F2933] px-3.5 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          Theo dõi →
                        </Link>
                      </div>
                    </div>

                    <ol className="mt-7 grid grid-cols-5 gap-2">
                      {STEPS.map((step, idx) => {
                        const state =
                          step.n < currentStep || currentStep === 5
                            ? "done"
                            : step.n === currentStep
                              ? "active"
                              : "todo";
                        return (
                          <li key={step.n} className="relative flex flex-col items-center text-center">
                            {idx < STEPS.length - 1 && (
                              <span
                                className={`absolute left-1/2 top-4 h-0.5 w-full ${
                                  state === "done" ? "bg-emerald-400" : "bg-[#E1E4E6]"
                                }`}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => stepAction(step.n)}
                              className={`relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold transition hover:scale-110 ${
                                state === "done"
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : state === "active"
                                    ? "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100"
                                    : "border-[#E1E4E6] bg-white text-[#8A949E]"
                              }`}
                            >
                              {state === "done" ? "✓" : step.n}
                            </button>
                            <p
                              className={`mt-2 text-xs font-bold ${
                                state === "todo" ? "text-[#8A949E]" : "text-[#20252B]"
                              }`}
                            >
                              {step.title}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm font-bold text-[#20252B]">
                      {loading ? "Đang tải..." : "Hiện không có xe nào đang ở gara"}
                    </p>
                    {!loading && (
                      <>
                        <p className="mt-1 text-xs text-[#8A949E]">
                          Khi gara tiếp nhận xe của bạn, tiến độ sẽ hiển thị tại đây.
                        </p>
                        <Link
                          to="/booking"
                          className="mt-4 inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          Đặt lịch bảo dưỡng
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* Lịch sử dịch vụ */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div>
                  <h2 className="text-lg font-bold text-[#1F2933]">Lịch sử dịch vụ</h2>
                  <p className="mt-0.5 text-xs text-[#66717C]">
                    Các phiếu bảo dưỡng, sửa chữa đã hoàn tất và chi phí từng lần.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative sm:col-span-2">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Tìm mã phiếu, biển số, tên xe..."
                      className="h-10 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-8 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                    />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#8A949E] hover:text-[#20252B]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                  >
                    <option value="ALL">Tất cả xe</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {getVehicleName(v)} · {v.license_plate ?? "—"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 divide-y divide-[#EEF0F2] rounded-xl border border-[#E1E4E6]">
                  {loading ? (
                    <p className="p-10 text-center text-xs text-[#8A949E]">Đang tải lịch sử...</p>
                  ) : filteredHistory.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm font-semibold text-[#20252B]">
                        {history.length === 0 ? "Chưa có lịch sử dịch vụ" : "Không có phiếu phù hợp"}
                      </p>
                      <p className="mt-1 text-xs text-[#8A949E]">
                        {history.length === 0
                          ? "Sau khi hoàn tất dịch vụ đầu tiên, phiếu sẽ xuất hiện tại đây."
                          : "Thử đổi từ khóa hoặc bộ lọc xe."}
                      </p>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchKeyword("");
                            setVehicleFilter("ALL");
                          }}
                          className="cs-btn cs-btn-primary mt-4"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredHistory.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => void openOrderDetail(o)}
                        className="flex cursor-pointer flex-col gap-3 p-4 transition hover:bg-[#FAF8F5] md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md border border-[#E5B869]/50 bg-[#FAF8F5] px-2 py-0.5 font-mono font-bold text-[#8F641B]">
                              {o.vehicle?.license_plate ?? "—"}
                            </span>
                            <span className="font-semibold text-[#20252B]">{getVehicleName(o.vehicle)}</span>
                            {o.mileage_received != null && (
                              <span className="text-[#8A949E]">
                                · {Number(o.mileage_received).toLocaleString("vi-VN")} km
                              </span>
                            )}
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                              {repairStatusLabel[o.status] ?? o.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-[#66717C]">
                            Phiếu <strong>{o.repair_order_code}</strong> · Hoàn tất{" "}
                            {formatDate(o.completed_at ?? o.handed_over_at ?? o.received_at)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end md:gap-2">
                          <p className="text-base font-bold text-[#1F2933]">
                            {details[o.id]?.invoice ? formatMoney(orderTotal(o)) : "Chưa có hóa đơn"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openOrderDetail(o);
                              }}
                              className="cs-btn cs-btn-secondary"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(o.vehicle_id ? `/booking?vehicle_id=${o.vehicle_id}` : "/booking");
                              }}
                              className="cursor-pointer rounded-lg border border-[#E5B869]/50 bg-[#FAF8F5] px-3 py-1.5 text-xs font-bold text-[#8F641B] transition hover:bg-[#F3E8D2]"
                            >
                              Đặt lịch lại
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* ---------- CỘT PHẢI ---------- */}
            <aside className="space-y-6">
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1F2933]">Lịch hẹn sắp tới</h2>
                  <Link
                    to="/customer/appointments"
                    className="cursor-pointer text-xs font-bold text-[#8F641B] hover:underline"
                  >
                    Xem tất cả
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {loading ? (
                    <p className="text-xs text-[#8A949E]">Đang tải...</p>
                  ) : upcoming.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#E1E4E6] p-5 text-center">
                      <p className="text-xs font-semibold text-[#20252B]">Chưa có lịch hẹn nào</p>
                      <Link
                        to="/booking"
                        className="mt-3 inline-flex cursor-pointer rounded-lg bg-[#1F2933] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        Đặt lịch ngay
                      </Link>
                    </div>
                  ) : (
                    upcoming.slice(0, 3).map((a) => (
                      <Link
                        key={a.id}
                        to="/customer/appointments"
                        className="block cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition hover:border-[#D6A85F]"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#20252B]">
                            {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              a.status === "CONFIRMED"
                                ? "bg-[#F3E8D2] text-[#3A3020]"
                                : "bg-white text-[#66717C]"
                            }`}
                          >
                            {appointmentStatusLabel[a.status] ?? a.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[#66717C]">
                          {getVehicleName(a.vehicle)} · {a.vehicle?.license_plate ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8A949E]">
                          {requestTypeLabel[a.request_type] ?? a.request_type} · {a.appointment_code}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <h2 className="text-base font-bold text-[#1F2933]">Cần hỗ trợ?</h2>
                <p className="mt-0.5 text-xs leading-5 text-[#66717C]">
                  Liên hệ gara khi xe gặp sự cố hoặc cần tư vấn, báo giá.
                </p>

                <div className="mt-4 rounded-xl bg-[#1F2933] p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#E5B869]">
                    Hotline hỗ trợ kỹ thuật
                  </p>
                  <a
                    href={`tel:${HOTLINE_TEL}`}
                    className="mt-1 block cursor-pointer text-xl font-bold tracking-wider"
                  >
                    {HOTLINE_DISPLAY}
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyHotline()}
                    className="mt-2 cursor-pointer text-xs text-slate-300 underline underline-offset-2 transition hover:text-white"
                  >
                    Sao chép số
                  </button>
                </div>

                <Link
                  to="/contact"
                  className="mt-3 block cursor-pointer rounded-xl border border-[#E1E4E6] py-2.5 text-center text-xs font-bold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  Gửi yêu cầu hỗ trợ
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {/* ===== MODAL CHI TIẾT PHIẾU ===== */}
      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT PHIẾU DỊCH VỤ
                </p>
                <h3 className="text-lg font-extrabold text-[#1F2933]">
                  {selectedOrder?.repair_order_code}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {getVehicleName(selectedOrder?.vehicle)} ·{" "}
                  <span className="font-mono">{selectedOrder?.vehicle?.license_plate ?? "—"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <p className="py-10 text-center text-xs text-[#8A949E]">Đang tải chi tiết...</p>
            ) : detailError ? (
              <p className="my-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {detailError}
              </p>
            ) : (
              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4">
                  <div>
                    <p className="text-slate-400">Trạng thái</p>
                    <p className="mt-0.5 font-bold text-slate-800">
                      {repairStatusLabel[selectedOrder?.status ?? ""] ?? selectedOrder?.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Số km khi tiếp nhận</p>
                    <p className="mt-0.5 font-bold text-slate-800">
                      {selectedOrder?.mileage_received != null
                        ? `${Number(selectedOrder.mileage_received).toLocaleString("vi-VN")} km`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ngày tiếp nhận</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatDate(selectedOrder?.received_at)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ngày hoàn tất</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatDate(selectedOrder?.completed_at)}</p>
                  </div>
                </div>

                {selectedWorkItems.length > 0 && (
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-700">Hạng mục đã thực hiện</p>
                    <ul className="mt-2 space-y-1.5">
                      {selectedWorkItems.map((w) => (
                        <li key={w.id} className="flex items-center gap-2 text-slate-700">
                          <span className="font-bold text-emerald-600">✓</span>
                          <span>{w.description || "Hạng mục kỹ thuật"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedInvoice ? (
                  <div>
                    <p className="mb-2 font-bold uppercase tracking-wider text-slate-700">
                      Hóa đơn {selectedInvoice.invoice_code}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left">
                        <thead className="border-b border-slate-200 bg-[#FAF8F5] font-bold text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5">Nội dung</th>
                            <th className="px-3 py-2.5 text-center">SL</th>
                            <th className="px-3 py-2.5 text-right">Đơn giá</th>
                            <th className="px-3 py-2.5 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedInvoice.items ?? []).map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2.5 font-semibold text-slate-800">
                                {it.description || (it.item_type === "PART" ? "Phụ tùng" : "Dịch vụ")}
                              </td>
                              <td className="px-3 py-2.5 text-center">{Number(it.quantity)}</td>
                              <td className="px-3 py-2.5 text-right text-slate-600">{formatMoney(it.unit_price)}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                {formatMoney(it.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-slate-200 bg-[#FAF8F5] font-bold">
                          <tr>
                            <td colSpan={3} className="px-3 py-3 text-right text-slate-700">
                              Tổng cộng
                            </td>
                            <td className="px-3 py-3 text-right text-base text-[#1F2933]">
                              {formatMoney(selectedInvoice.total_amount)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-600">
                              Đã thanh toán
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-700">{formatMoney(paidAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-slate-500">
                    Phiếu này chưa có hóa đơn.
                  </p>
                )}

                {selectedOrder?.note && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                    <strong>Ghi chú:</strong> {selectedOrder.note}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Link
                to="/invoices"
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Trang hóa đơn
              </Link>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="cs-btn cs-btn-primary"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CẬP NHẬT ODO ===== */}
      {showOdoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-[#1F2933]">Cập nhật số ODO xe</h3>
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveOdo(e)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Chọn xe</label>
                <select
                  value={odoVehicleId}
                  onChange={(e) => {
                    setOdoVehicleId(e.target.value);
                    const v = vehicles.find((x) => String(x.id) === e.target.value);
                    setOdoValue(v?.mileage != null ? String(v.mileage) : "");
                  }}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#D6A85F]"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {getVehicleName(v)} · {v.license_plate ?? "—"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Số km hiện tại trên đồng hồ
                </label>
                <input
                  type="number"
                  min={0}
                  value={odoValue}
                  onChange={(e) => setOdoValue(e.target.value)}
                  placeholder="Ví dụ: 41500"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#D6A85F]"
                />
              </div>

              {odoError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {odoError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={odoSaving}
                  className="cs-btn cs-btn-primary"
                >
                  {odoSaving ? "Đang lưu..." : "Lưu số ODO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;
