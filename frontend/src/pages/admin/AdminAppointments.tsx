import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type Appointment = {
  recordId: number;
  id: string;
  time: string;
  customer: string;
  phone: string;
  plate: string;
  service: string;
  status: "Chờ xác nhận" | "Đã xác nhận" | "Đã tiếp nhận" | "Đã hủy";
};

type ApiAppointment = {
  id: number;
  appointment_code: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  customer?: { full_name?: string; phone?: string } | null;
  vehicle?: { license_plate?: string | null } | null;
  services?: { name: string }[];
  packages?: { name: string }[];
};

const statuses: Appointment["status"][] = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đã tiếp nhận",
  "Đã hủy",
];

function formatStatus(status: string): Appointment["status"] {
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đã tiếp nhận";
  if (status === "CANCELLED") return "Đã hủy";
  return "Chờ xác nhận";
}

function mapAppointment(item: ApiAppointment): Appointment {
  const serviceNames = [...(item.services ?? []), ...(item.packages ?? [])]
    .map((entry) => entry.name)
    .join(", ");

  const date = new Date(
    `${item.appointment_date}T00:00:00`,
  ).toLocaleDateString("vi-VN");

  return {
    recordId: item.id,
    id: item.appointment_code,
    time: `${date} · ${item.appointment_time.slice(0, 5)}`,
    customer: item.customer?.full_name || "Khách hàng",
    phone: item.customer?.phone || "",
    plate: item.vehicle?.license_plate || "Chưa có biển số",
    service: serviceNames || "Chưa chọn dịch vụ",
    status: formatStatus(item.status),
  };
}

function AdminAppointments() {
  const { confirm } = useAppFeedback();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadAppointments = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await fetchApi("/advisor/appointments?per_page=100");
      setAppointments((response?.data ?? []).map(mapAppointment));
      setError("");
      return true;
    } catch (requestError) {
      if ((requestError as { status?: number })?.status === 401) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return false;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách lịch hẹn.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = [
      appointment.id,
      appointment.customer,
      appointment.phone,
      appointment.plate,
      appointment.service,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));

    const matchesStatus =
      status === "Tất cả" || appointment.status === status;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = appointments.filter(
    (item) => item.status === "Chờ xác nhận",
  ).length;

  const confirmedCount = appointments.filter(
    (item) => item.status === "Đã xác nhận",
  ).length;

  const checkedInCount = appointments.filter(
    (item) => item.status === "Đã tiếp nhận",
  ).length;

  const cancelledCount = appointments.filter(
    (item) => item.status === "Đã hủy",
  ).length;

  const handleStatusChange = async (
    appointment: Appointment,
    newStatus: Appointment["status"],
  ) => {
    if (updatingId !== null) return;

    if (newStatus === "Đã hủy" && !await confirm({ title: "Xác nhận hủy lịch hẹn", description: `Bạn sắp hủy lịch #${appointment.id}. Hãy kiểm tra lại thông tin và quyền thực hiện.`, variant: "danger", confirmText: "Hủy lịch" })) return;

    setUpdatingId(appointment.recordId);
    setError("");
    setMessage("");

    const endpoint =
      newStatus === "Đã xác nhận"
        ? `/advisor/appointments/${appointment.recordId}/confirm`
        : newStatus === "Đã tiếp nhận"
          ? `/advisor/appointments/${appointment.recordId}/check-in`
          : `/advisor/appointments/${appointment.recordId}/cancel`;

    try {
      await fetchApi(endpoint, {
        method: "POST",
        ...(newStatus === "Đã hủy"
          ? {
              body: JSON.stringify({
                cancel_reason: "Admin hủy lịch hẹn",
              }),
            }
          : {}),
      });

      const refreshed = await loadAppointments();

      if (refreshed) {
        setMessage(`Đã cập nhật lịch hẹn ${appointment.id}.`);
      } else {
        setMessage(
          "Thao tác đã gửi thành công, nhưng chưa thể tải lại danh sách.",
        );
      }
    } catch (requestError) {
      if ((requestError as { status?: number })?.status === 401) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật lịch hẹn.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (appointmentStatus: Appointment["status"]) => {
    if (appointmentStatus === "Chờ xác nhận") {
      return "bg-[#FFF6E6] text-[#9A6B22]";
    }

    if (appointmentStatus === "Đã xác nhận") {
      return "bg-[#EEF4FA] text-[#46627A]";
    }

    if (appointmentStatus === "Đã tiếp nhận") {
      return "bg-[#EEF7EF] text-[#3F7047]";
    }

    return "bg-[#FDEEEE] text-[#A24A4A]";
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                  QUẢN TRỊ HỆ THỐNG / LỊCH HẸN
                </p>

                <h1 className="text-3xl font-bold tracking-tight">
                  Quản lý lịch hẹn
                </h1>

                <p className="mt-2 text-xs text-[#66717C]">
                  Theo dõi và quản lý lịch hẹn của khách hàng trong toàn hệ thống.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadAppointments()}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{loading ? "Đang tải..." : "↻ Tải lại danh sách"}</span>
              </button>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Tổng lịch hẹn",
                  value: appointments.length,
                  description: "Lịch hẹn trong danh sách",
                },
                {
                  label: "Chờ xác nhận",
                  value: pendingCount,
                  description: "Đang chờ xử lý",
                },
                {
                  label: "Đã tiếp nhận",
                  value: checkedInCount,
                  description: "Đã tiếp nhận tại gara",
                },
                {
                  label: "Đã hủy",
                  value: cancelledCount,
                  description: "Lịch hẹn đã hủy",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                    {item.label}
                  </p>
                  <p className="mt-4 text-2xl font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đã xác nhận
                </p>
                <p className="mt-3 text-2xl font-bold">{confirmedCount}</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Chờ khách hàng đến gara
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Kết quả hiện tại
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {filteredAppointments.length}
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Lịch hẹn phù hợp với tìm kiếm và bộ lọc
                </p>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#D9E8D8] bg-[#F0F7EF] px-4 py-3 text-xs text-[#315B35]"
              >
                <p>{message}</p>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="font-bold"
                >
                  Đóng
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:flex-row sm:items-center"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void loadAppointments()}
                  disabled={loading}
                  className="shrink-0 font-semibold underline underline-offset-4 disabled:opacity-50"
                >
                  Thử tải lại
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    DANH SÁCH
                  </p>

                  <h2 className="mt-1 text-base font-bold">
                    Lịch hẹn toàn hệ thống
                  </h2>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm mã, tên, SĐT, biển số..."
                    className="w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-2.5 text-xs outline-none transition focus:border-[#D6A85F] sm:w-[270px]"
                  />

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 py-2.5 text-xs outline-none focus:border-[#D6A85F]"
                  >
                    <option value="Tất cả">Tất cả trạng thái</option>
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatus("Tất cả");
                    }}
                    className="cs-btn cs-btn-secondary"
                  >
                    Xóa lọc
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#8A949E]">
                  Hiển thị {filteredAppointments.length} / {appointments.length} lịch hẹn
                </p>

                {updatingId !== null && (
                  <p className="text-xs font-semibold text-[#9A6B22]">
                    Đang cập nhật lịch hẹn...
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] text-left">
                      {[
                        "Mã lịch",
                        "Thời gian",
                        "Khách hàng",
                        "Xe",
                        "Dịch vụ",
                        "Trạng thái",
                        "Thao tác",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppointments.map((appointment) => {
                      const isUpdating = updatingId === appointment.recordId;

                      return (
                        <tr
                          key={appointment.recordId}
                          className="border-b border-[#F0F1EF] last:border-b-0 hover:bg-transparent cs-readable-row"
                        >
                          <td className="px-3 py-4 text-xs font-semibold">
                            {appointment.id}
                          </td>

                          <td className="px-3 py-4 text-xs text-[#66717C]">
                            {appointment.time}
                          </td>

                          <td className="px-3 py-4">
                            <p className="text-xs font-semibold">
                              {appointment.customer}
                            </p>
                            <p className="mt-1 text-xs text-[#8A949E]">
                              {appointment.phone || "Chưa có số điện thoại"}
                            </p>
                          </td>

                          <td className="px-3 py-4">
                            <span className="text-xs font-semibold">
                              {appointment.plate}
                            </span>
                          </td>

                          <td className="max-w-[200px] px-3 py-4 text-xs text-[#66717C]">
                            {appointment.service}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(appointment.status)}`}
                            >
                              {appointment.status}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            {appointment.status === "Chờ xác nhận" && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={updatingId !== null}
                                  onClick={() =>
                                    void handleStatusChange(
                                      appointment,
                                      "Đã xác nhận",
                                    )
                                  }
                                  className="rounded-xl bg-[#1F2933] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating ? "Đang xử lý..." : "Duyệt"}
                                </button>

                                <button
                                  type="button"
                                  disabled={updatingId !== null}
                                  onClick={() =>
                                    void handleStatusChange(
                                      appointment,
                                      "Đã hủy",
                                    )
                                  }
                                  className="rounded-xl border border-[#E1E4E6] px-3 py-2 text-xs font-semibold text-[#A24A4A] transition hover:bg-[#FDEEEE] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Hủy
                                </button>
                              </div>
                            )}

                            {appointment.status === "Đã xác nhận" && (
                              <button
                                type="button"
                                disabled={updatingId !== null}
                                onClick={() =>
                                  void handleStatusChange(
                                    appointment,
                                    "Đã tiếp nhận",
                                  )
                                }
                                className="whitespace-nowrap rounded-xl border border-[#E1E4E6] px-3 py-2 text-xs font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating ? "Đang xử lý..." : "Tiếp nhận"}
                              </button>
                            )}

                            {appointment.status === "Đã tiếp nhận" && (
                              <span className="text-xs font-medium text-[#8A949E]">
                                Đã tiếp nhận
                              </span>
                            )}

                            {appointment.status === "Đã hủy" && (
                              <span className="text-xs font-medium text-[#8A949E]">
                                Đã kết thúc
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {loading && appointments.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-[#20252B]">
                      Đang tải lịch hẹn...
                    </p>
                    <p className="mt-2 text-xs text-[#8A949E]">
                      Vui lòng chờ trong giây lát.
                    </p>
                  </div>
                )}

                {!loading && filteredAppointments.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-[#20252B]">
                      Không tìm thấy lịch hẹn
                    </p>
                    <p className="mt-2 text-xs text-[#8A949E]">
                      Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminAppointments;
