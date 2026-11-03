import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { ApiError, apiRequest, getApiErrorMessage } from "../../lib/api";
import {
  getTodayDateString,
  isValidAppointmentDate,
  isValidAppointmentTime,
} from "../../lib/appointments";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | string;

type AppointmentVehicle = {
  license_plate?: string | null;
  variant?: string | null;
  year?: number | null;
  model?: {
    name?: string;
    brand?: { name?: string };
  } | null;
};

type AppointmentService = { id: number; name: string; base_price?: number | string };
type AppointmentPackage = {
  id: number;
  name: string;
  mileage_milestone?: number | null;
};

type Appointment = {
  id: number;
  appointment_code: string;
  appointment_date: string;
  appointment_time: string;
  request_type?: string;
  status: AppointmentStatus;
  note?: string | null;
  symptom_description?: string | null;
  cancel_reason?: string | null;
  vehicle?: AppointmentVehicle | null;
  services?: AppointmentService[];
  packages?: AppointmentPackage[];
};

type AppointmentPage = {
  data: Appointment[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

const inputClass =
  "w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-sm text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10";

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã duyệt",
  CANCELLED: "Đã hủy",
  CHECKED_IN: "Đã tiếp nhận",
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  CHECKED_IN: "bg-green-100 text-green-800",
};

function displayDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function getVehicleName(vehicle?: AppointmentVehicle | null): string {
  return [
    vehicle?.model?.brand?.name,
    vehicle?.model?.name,
    vehicle?.variant,
  ]
    .filter(Boolean)
    .join(" ") || "Chưa có thông tin xe";
}

function getAppointmentServices(appointment: Appointment): string {
  const names = [
    ...(appointment.packages ?? []).map((item) => item.name),
    ...(appointment.services ?? []).map((item) => item.name),
  ];
  return names.join(", ") || "Chưa có dịch vụ";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        statusClasses[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function AppointmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCustomerPage = location.pathname === "/customer/appointments";
  const navigationState = location.state as { successMessage?: string } | null;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(navigationState?.successMessage ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [editing, setEditing] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({
      page: String(page),
      per_page: "10",
    });
    if (status) query.set("status", status);

    apiRequest<AppointmentPage>(`/appointments?${query.toString()}`)
      .then((response) => {
        if (!active) return;
        setError("");
        setAppointments(response.data);
        setTotal(response.pagination.total);
        setLastPage(response.pagination.last_page);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          navigate("/login");
          return;
        }
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, status, reloadKey, navigate]);

  const openDetails = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailLoading(true);
    setOperationError("");
    setEditing(false);
    setCancelPrompt(false);
    try {
      const response = await apiRequest<{ data: Appointment }>(
        `/appointments/${appointment.id}`,
      );
      setSelectedAppointment(response.data);
      setEditDate(response.data.appointment_date.slice(0, 10));
      setEditTime(response.data.appointment_time.slice(0, 5));
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedAppointment(null);
    setEditing(false);
    setCancelPrompt(false);
    setOperationError("");
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAppointment) return;
    const validDate = isValidAppointmentDate(editDate);
    const validTime = isValidAppointmentTime(editTime);
    if (!validDate || !validTime) {
      setOperationError("Vui lòng chọn ngày hợp lệ và giờ từ 08:00 đến 17:30.");
      return;
    }

    setSaving(true);
    setOperationError("");
    try {
      const response = await apiRequest<{ data: Appointment }>(
        `/appointments/${selectedAppointment.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            appointment_date: editDate,
            appointment_time: editTime,
          }),
        },
      );
      setSelectedAppointment({ ...selectedAppointment, ...response.data });
      setEditing(false);
      setNotice("Đã cập nhật lịch hẹn.");
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAppointment) return;
    if (!cancelReason.trim()) {
      setOperationError("Vui lòng nhập lý do hủy lịch.");
      return;
    }

    setSaving(true);
    setOperationError("");
    try {
      await apiRequest(`/appointments/${selectedAppointment.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ cancel_reason: cancelReason.trim() }),
      });
      closeDetails();
      setNotice("Đã hủy lịch hẹn.");
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setOperationError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (nextStatus: string) => {
    setLoading(true);
    setError("");
    setStatus(nextStatus);
    setPage(1);
  };

  const changePage = (nextPage: number) => {
    setLoading(true);
    setError("");
    setPage(nextPage);
  };

  const appointmentRows = appointments.map((appointment, index) => (
    <tr
      key={appointment.id}
      className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]"
    >
      <td className="px-5 py-4 text-xs text-[#8A949E]">
        {(page - 1) * 10 + index + 1}
      </td>
      <td className="px-5 py-4 text-sm font-bold">{appointment.appointment_code}</td>
      <td className="px-5 py-4">
        <p className="text-sm font-semibold">{getVehicleName(appointment.vehicle)}</p>
        <p className="mt-1 text-xs text-[#8A949E]">
          {appointment.vehicle?.license_plate ?? "Chưa có biển số"}
        </p>
      </td>
      <td className="max-w-[260px] px-5 py-4 text-sm text-[#66717C]">
        {getAppointmentServices(appointment)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        {displayDate(appointment.appointment_date)}
        <span className="mt-1 block text-xs text-[#8A949E]">
          {appointment.appointment_time.slice(0, 5)}
        </span>
      </td>
      <td className="px-5 py-4"><StatusBadge status={appointment.status} /></td>
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => void openDetails(appointment)}
          className="cs-btn cs-btn-primary cs-btn-sm"
        >
          Xem chi tiết
        </button>
      </td>
    </tr>
  ));

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      {isCustomerPage ? (
        <>
          <CustomerHeader />
          <CustomerTopbar />
        </>
      ) : (
        <Header />
      )}

      <main className={isCustomerPage ? "lg:ml-[250px]" : ""}>
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 md:py-12">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / LỊCH HẸN
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1F2933]">
                Lịch hẹn của tôi
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#66717C]">
                Theo dõi, cập nhật hoặc hủy lịch hẹn bảo dưỡng của bạn.
              </p>
            </div>
            <Link
              to="/booking"
              className="w-fit rounded-xl bg-[#1F2933] px-5 py-3 text-sm font-semibold text-white hover:bg-[#151D24]"
            >
              Đặt lịch mới
            </Link>
          </div>

          {notice && (
            <div
              role="status"
              className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">
                ×
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold">Danh sách lịch hẹn</h2>
                <p className="mt-1 text-xs text-[#66717C]">{total} lịch hẹn</p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="status-filter" className="text-xs font-semibold">
                  Trạng thái
                </label>
                <select
                  id="status-filter"
                  value={status}
                  onChange={(event) => changeStatus(event.target.value)}
                  className={`${inputClass} w-auto min-w-[180px]`}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="CONFIRMED">Đã duyệt</option>
                  <option value="CANCELLED">Đã hủy</option>
                  <option value="CHECKED_IN">Đã tiếp nhận</option>
                </select>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            {loading ? (
              <p className="px-6 py-12 text-center text-sm text-[#66717C]">
                Đang tải lịch hẹn...
              </p>
            ) : appointments.length ? (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {appointments.map((appointment) => (
                    <article key={appointment.id} className="rounded-xl border border-[#E1E4E6] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{appointment.appointment_code}</p>
                          <p className="mt-1 text-xs text-[#66717C]">
                            {getVehicleName(appointment.vehicle)}
                          </p>
                          <p className="mt-1 text-xs text-[#8A949E]">
                            {appointment.vehicle?.license_plate ?? "Chưa có biển số"}
                          </p>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <p className="mt-3 text-sm">{getAppointmentServices(appointment)}</p>
                      <p className="mt-2 text-xs text-[#66717C]">
                        {displayDate(appointment.appointment_date)} · {appointment.appointment_time.slice(0, 5)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void openDetails(appointment)}
                        className="cs-btn cs-btn-primary cs-btn-sm mt-4 cs-btn-block"
                      >
                        Xem chi tiết
                      </button>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[950px] text-left">
                    <thead>
                      <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-xs font-bold uppercase tracking-wide text-[#8A949E]">
                        <th className="px-5 py-4">STT</th>
                        <th className="px-5 py-4">Mã lịch hẹn</th>
                        <th className="px-5 py-4">Xe</th>
                        <th className="px-5 py-4">Dịch vụ / gói</th>
                        <th className="px-5 py-4">Ngày, giờ</th>
                        <th className="px-5 py-4">Trạng thái</th>
                        <th className="px-5 py-4">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>{appointmentRows}</tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold">Không có lịch hẹn phù hợp</p>
                <p className="mt-2 text-xs text-[#8A949E]">
                  Thay đổi bộ lọc hoặc đặt một lịch hẹn mới.
                </p>
              </div>
            )}
          </section>

          <nav aria-label="Phân trang lịch hẹn" className="mt-5 flex items-center justify-between">
            <p className="text-xs text-[#66717C]">
              Trang {page} / {lastPage}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => changePage(Math.max(1, page - 1))}
                className="cs-btn cs-btn-secondary"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= lastPage || loading}
                onClick={() => changePage(Math.min(lastPage, page + 1))}
                className="cs-btn cs-btn-secondary"
              >
                Tiếp
              </button>
            </div>
          </nav>
        </div>
      </main>
      {!isCustomerPage && <Footer />}

      {selectedAppointment && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-detail-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT LỊCH HẸN
                </p>
                <h2 id="appointment-detail-title" className="mt-2 text-xl font-bold">
                  {selectedAppointment.appointment_code}
                </h2>
              </div>
              <button type="button" onClick={closeDetails} aria-label="Đóng" className="text-2xl leading-none text-[#66717C]">
                ×
              </button>
            </div>

            {detailLoading ? (
              <p className="py-10 text-center text-sm text-[#66717C]">Đang tải chi tiết...</p>
            ) : (
              <>
                {operationError && (
                  <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {operationError}
                  </div>
                )}
                <div className="mt-5 grid gap-4 rounded-xl bg-[#FAFAF9] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[#8A949E]">Trạng thái</p>
                    <div className="mt-2"><StatusBadge status={selectedAppointment.status} /></div>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A949E]">Ngày và giờ</p>
                    <p className="mt-2 text-sm font-semibold">
                      {displayDate(selectedAppointment.appointment_date)} · {selectedAppointment.appointment_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A949E]">Xe</p>
                    <p className="mt-2 text-sm font-semibold">{getVehicleName(selectedAppointment.vehicle)}</p>
                    <p className="mt-1 text-xs text-[#66717C]">
                      {selectedAppointment.vehicle?.license_plate ?? "Chưa có biển số"}
                      {selectedAppointment.vehicle?.year ? ` · ${selectedAppointment.vehicle.year}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A949E]">Loại yêu cầu</p>
                    <p className="mt-2 text-sm font-semibold">
                      {selectedAppointment.request_type ?? "Bảo dưỡng"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-bold">Dịch vụ / gói bảo dưỡng</h3>
                  <ul className="mt-2 space-y-2">
                    {(selectedAppointment.packages ?? []).map((item) => (
                      <li key={`package-${item.id}`} className="rounded-lg border border-[#E1E4E6] px-3 py-2 text-sm">
                        Gói: {item.name}
                        {item.mileage_milestone ? ` · ${Number(item.mileage_milestone).toLocaleString("vi-VN")} km` : ""}
                      </li>
                    ))}
                    {(selectedAppointment.services ?? []).map((item) => (
                      <li key={`service-${item.id}`} className="rounded-lg border border-[#E1E4E6] px-3 py-2 text-sm">
                        Dịch vụ: {item.name}
                      </li>
                    ))}
                    {!selectedAppointment.packages?.length && !selectedAppointment.services?.length && (
                      <li className="text-sm text-[#66717C]">Chưa có dịch vụ hoặc gói đính kèm.</li>
                    )}
                  </ul>
                </div>

                {(selectedAppointment.note || selectedAppointment.symptom_description) && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold">Ghi chú</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#66717C]">
                      {selectedAppointment.note || selectedAppointment.symptom_description}
                    </p>
                  </div>
                )}
                {selectedAppointment.cancel_reason && (
                  <p className="mt-4 text-sm text-red-700">
                    Lý do hủy: {selectedAppointment.cancel_reason}
                  </p>
                )}

                {editing && selectedAppointment.status === "PENDING" && (
                  <form onSubmit={handleUpdate} className="mt-6 space-y-4 border-t border-[#E1E4E6] pt-5">
                    <h3 className="text-sm font-bold">Đổi ngày, giờ hẹn</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold">
                        Ngày hẹn
                        <input
                          type="date"
                          required
                          min={getTodayDateString()}
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                          className={`${inputClass} mt-2`}
                        />
                      </label>
                      <label className="text-xs font-semibold">
                        Giờ hẹn
                        <select
                          required
                          value={editTime}
                          onChange={(event) => setEditTime(event.target.value)}
                          className={`${inputClass} mt-2`}
                        >
                          {Array.from({ length: 20 }, (_, index) => {
                            const minutes = 8 * 60 + index * 30;
                            const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
                            return <option key={time} value={time}>{time}</option>;
                          })}
                        </select>
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">
                        Đóng
                      </button>
                      <button type="submit" disabled={saving} className="cs-btn cs-btn-primary">
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  </form>
                )}

                {cancelPrompt && (
                  <form onSubmit={handleCancel} className="mt-6 space-y-3 border-t border-[#E1E4E6] pt-5">
                    <label htmlFor="cancel-reason" className="block text-sm font-bold">
                      Xác nhận hủy lịch — vui lòng nhập lý do
                    </label>
                    <textarea
                      id="cancel-reason"
                      required
                      maxLength={500}
                      rows={3}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      className={inputClass}
                      placeholder="Lý do hủy lịch"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setCancelPrompt(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">
                        Không hủy
                      </button>
                      <button type="submit" disabled={saving} className="cs-btn cs-btn-danger">
                        {saving ? "Đang hủy..." : "Xác nhận hủy"}
                      </button>
                    </div>
                  </form>
                )}

                {!editing && !cancelPrompt && (
                  <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#E1E4E6] pt-5">
                    {selectedAppointment.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => {
                          setOperationError("");
                          setEditing(true);
                        }}
                        className="cs-btn cs-btn-secondary"
                      >
                        Đổi giờ / Sửa lịch
                      </button>
                    )}
                    {["PENDING", "CONFIRMED"].includes(selectedAppointment.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOperationError("");
                          setCancelReason("");
                          setCancelPrompt(true);
                        }}
                        className="cs-btn cs-btn-danger-outline"
                      >
                        Hủy lịch hẹn
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AppointmentsPage;
