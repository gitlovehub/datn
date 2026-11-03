import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  cancelAdvisorAppointment,
  checkInAdvisorAppointment,
  markNoShowAdvisorAppointment,
  confirmAdvisorAppointment,
  getAdvisorAppointment,
  getAdvisorAppointments,
  type AppointmentStatus,
} from "../../services/advisorAppointmentService";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
};

type VehicleBrand = {
  id: number;
  name: string;
};

type VehicleModel = {
  id: number;
  brand?: VehicleBrand;
};

type Vehicle = {
  id: number;
  license_plate: string;
  model_id: number;
  variant?: string;
  year?: number;
  model?: VehicleModel;
};

type Service = {
  id: number;
  name: string;
  base_price?: number;
};

type MaintenancePackage = {
  id: number;
  name: string;
  mileage_milestone?: number;
};

type Appointment = {
  id: number;
  appointment_code: string;
  customer?: Customer;
  vehicle?: Vehicle;
  services?: Service[];
  packages?: MaintenancePackage[];
  appointment_date: string;
  appointment_time: string;
  request_type?: string;
  symptom_description?: string;
  note?: string;
  status: AppointmentStatus;
  cancel_reason?: string;
};

type AppointmentResponse = {
  success: boolean;
  data: Appointment[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

type ApiError = {
  status?: number;
  message?: string;
};

const statusOptions: {
  value: "" | AppointmentStatus;
  label: string;
}[] = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "CHECKED_IN", label: "Đã tiếp nhận" },
  { value: "NO_SHOW", label: "Không đến" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function getStatusText(status: AppointmentStatus) {
  if (status === "PENDING") return "Chờ xác nhận";
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đã tiếp nhận";
  if (status === "NO_SHOW") return "Không đến";
  return "Đã hủy";
}

function getStatusClass(status: AppointmentStatus) {
  if (status === "PENDING") return "cs-status-pending";
  if (status === "CONFIRMED") return "cs-status-confirmed";
  if (status === "CHECKED_IN") return "cs-status-checked";
  if (status === "NO_SHOW") return "cs-status-pending";
  return "cs-status-cancelled";
}

function formatDate(date: string) {
  if (!date) return "-";
  const parts = date.split("-");
  if (parts.length !== 3) {
    return date;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getVehicleName(vehicle?: Vehicle) {
  if (!vehicle) return "Chưa có thông tin";
  const brand = vehicle.model?.brand?.name || "";
  const variant = vehicle.variant || "";
  const name = `${brand} ${variant}`.trim();
  return name || "Xe của khách";
}

function getServiceName(appointment: Appointment) {
  const services = appointment.services || [];
  const packages = appointment.packages || [];

  const serviceNames = services.map((service) => service.name);
  const packageNames = packages.map((item) => item.name);
  const names = [...serviceNames, ...packageNames];

  if (names.length === 0) {
    return appointment.request_type || "Chưa xác định";
  }

  return names.join(", ");
}

function getAppointmentCustomer(appointment: Appointment) {
  return appointment.customer?.full_name || "Khách hàng";
}

function getAppointmentPhone(appointment: Appointment) {
  return appointment.customer?.phone || "-";
}

function getAppointmentPlate(appointment: Appointment) {
  return appointment.vehicle?.license_plate || "-";
}

function Appointments() {
  const navigate = useNavigate();
  const { confirm, notify } = useAppFeedback();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [date, setDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAppointment && !cancelAppointment) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedAppointment(null); setCancelAppointment(null); }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedAppointment, cancelAppointment]);

  const itemsPerPage = 15;
  const showToast = (message: string, type: "success" | "error" = "success") => notify(message, type);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response = (await getAdvisorAppointments({
        page: currentPage,
        per_page: itemsPerPage,
        status,
        date,
        search: search.trim(),
      })) as AppointmentResponse;

      setAppointments(response.data || []);
      setTotalAppointments(response.pagination?.total || 0);
      setTotalPages(response.pagination?.last_page || 1);
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error?.status === 401) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setAppointments([]);
      setTotalAppointments(0);
      setTotalPages(1);

      showToast(
        error?.message || "Không thể tải danh sách lịch hẹn.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [currentPage, status, date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
      loadAppointments();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  const handleStatusTab = (value: "" | AppointmentStatus) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setDate("");
    setCurrentPage(1);
  };

  const handleConfirm = async (appointment: Appointment) => {
    const approved = await confirm({
      title: "Xác minh lịch hẹn với khách",
      reference: appointment.appointment_code,
      phone: appointment.customer?.phone,
      description: `Hãy liên hệ ${getAppointmentCustomer(appointment)} qua số ${getAppointmentPhone(appointment)} để kiểm tra nhu cầu dịch vụ và khung giờ ${formatDate(appointment.appointment_date)} lúc ${appointment.appointment_time}. Chỉ xác nhận khi khách đồng ý. Nếu không liên hệ được, hãy quay lại và giữ lịch ở trạng thái chờ.`,
      confirmText: "Khách đã đồng ý – Xác nhận lịch",
      cancelText: "Chưa liên hệ được / Để sau",
      checklist: [
        "Tôi đã liên hệ trực tiếp với khách hàng và xác minh đúng xe, dịch vụ, ngày giờ.",
        "Khách hàng đã đồng ý với lịch hẹn; gara có thể tiếp nhận theo lịch.",
      ],
    });
    if (!approved) return;
    const id = appointment.id;
    try {
      setLoadingAction(`confirm-${id}`);
      const response = await confirmAdvisorAppointment(id);
      showToast(response?.message || "Xác nhận lịch hẹn thành công.");
      await loadAppointments();
    } catch (err: unknown) {
      const error = err as ApiError;
      showToast(
        error?.message || "Không thể xác nhận lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckIn = async (appointment: Appointment) => {
    const approved = await confirm({
      title: "Xác nhận xe đã đến gara",
      reference: appointment.appointment_code,
      description: `Chỉ check-in khi khách đã thực sự đến gara và cố vấn đã đối chiếu xe ${getAppointmentPlate(appointment)} với lịch hẹn. Không thực hiện khi chỉ mới gọi điện xác nhận.`,
      confirmText: "Xác nhận xe đã đến",
      checklist: [
        "Khách hàng đã có mặt tại gara cùng phương tiện.",
        "Tôi đã đối chiếu biển số và thông tin lịch hẹn trước khi tiếp nhận.",
      ],
    });
    if (!approved) return;
    const id = appointment.id;
    try {
      setLoadingAction(`checkin-${id}`);
      const response = await checkInAdvisorAppointment(id);
      showToast(response?.message || "Tiếp nhận xe thành công.");
      await loadAppointments();
      navigate(`/advisor/reception?appointment=${id}`);
    } catch (err: unknown) {
      const error = err as ApiError;
      showToast(
        error?.message || "Không thể tiếp nhận xe.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  /** Đã quá giờ hẹn: hiện nút "Không đến"; backend còn kiểm tra thêm thời gian chờ khách đến muộn. */
  const isPastAppointmentTime = (appointment: Appointment) =>
    new Date(`${appointment.appointment_date.slice(0, 10)}T${appointment.appointment_time.slice(0, 8)}`).getTime() < Date.now();

  const handleNoShow = async (appointment: Appointment) => {
    const approved = await confirm({
      title: "Đánh dấu khách không đến",
      reference: appointment.appointment_code,
      description: `Khách không đến theo lịch ${getAppointmentPlate(appointment)}. Suất của lịch sẽ được trả lại; lịch không thể tiếp nhận sau khi đánh dấu.`,
      confirmText: "Khách không đến",
      variant: "warning",
      checklist: ["Đã liên hệ khách nhưng khách không đến hoặc báo không đến."],
    });
    if (!approved) return;
    try {
      setLoadingAction(`noshow-${appointment.id}`);
      const response = await markNoShowAdvisorAppointment(appointment.id);
      showToast(response?.message || "Đã đánh dấu khách không đến.");
      await loadAppointments();
    } catch (err: unknown) {
      showToast((err as ApiError)?.message || "Không thể đánh dấu không đến.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenDetail = async (appointment: Appointment) => {
    try {
      setSelectedAppointment(appointment);
      setLoadingDetail(true);

      const response = await getAdvisorAppointment(appointment.id);
      if (response?.data) {
        setSelectedAppointment(response.data);
      }
    } catch (err: unknown) {
      const error = err as ApiError;
      showToast(
        error?.message || "Không thể tải chi tiết lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelAppointment || cancelReason.trim() === "") {
      return;
    }

    try {
      setLoadingAction(`cancel-${cancelAppointment.id}`);
      const response = await cancelAdvisorAppointment(
        cancelAppointment.id,
        cancelReason.trim()
      );

      showToast(response?.message || "Đã từ chối lịch hẹn.");
      setCancelAppointment(null);
      setCancelReason("");
      await loadAppointments();
    } catch (err: unknown) {
      const error = err as ApiError;
      showToast(
        error?.message || "Không thể từ chối lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const currentPageStart =
    totalAppointments === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const currentPageEnd = Math.min(
    currentPage * itemsPerPage,
    totalAppointments
  );

  const statusCounts = useMemo(() => {
    return {
      pending: appointments.filter((item) => item.status === "PENDING").length,
      confirmed: appointments.filter((item) => item.status === "CONFIRMED").length,
      checkedIn: appointments.filter((item) => item.status === "CHECKED_IN").length,
      cancelled: appointments.filter((item) => item.status === "CANCELLED").length,
    };
  }, [appointments]);

  return (
    <div className="cs-appointment-page min-h-screen bg-cs-bg text-cs-text">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
            {/* TIÊU ĐỀ */}
            <div className="mb-8">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-cs-muted">
                Gara / Lịch hẹn
              </p>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Quản lý lịch hẹn
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs text-slate-500">
                  Theo dõi, xác nhận và tiếp nhận lịch hẹn của khách hàng tại xưởng.
                </p>
              </div>
            </div>

            {/* THỐNG KÊ NHANH */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-cs-muted">
                    Lịch hẹn
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {totalAppointments}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Tổng số lịch hẹn
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Chờ xác nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.pending}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Cần xử lý
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Đã xác nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.confirmed}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Chờ tiếp nhận
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Đã tiếp nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.checkedIn}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Xe đã vào gara
                </p>
              </div>
            </div>

            {/* BỘ LỌC */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900">
                  Bộ lọc lịch hẹn
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tìm theo khách hàng, xe, mã lịch hẹn hoặc ngày tiếp nhận.
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tên khách, số điện thoại, biển số, mã lịch..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="w-full xl:w-48">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Ngày tiếp nhận
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="cs-btn cs-btn-secondary"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => handleStatusTab(item.value)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      status === item.value
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Danh sách lịch hẹn
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Quản lý thông tin và tiến độ tiếp nhận xe.
                  </p>
                </div>

                <span className="w-fit rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {totalAppointments} lịch hẹn
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3.5">Mã</th>
                        <th className="px-5 py-3.5">Khách hàng</th>
                        <th className="px-5 py-3.5">Xe</th>
                        <th className="px-5 py-3.5">Dịch vụ</th>
                        <th className="px-5 py-3.5">Thời gian</th>
                        <th className="px-5 py-3.5">Trạng thái</th>
                        <th className="px-5 py-3.5">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {appointments.map((appointment) => {
                        const isConfirming =
                          loadingAction === `confirm-${appointment.id}`;
                        const isCheckingIn =
                          loadingAction === `checkin-${appointment.id}`;

                        return (
                          <tr
                            key={appointment.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                              {appointment.appointment_code}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {getAppointmentCustomer(appointment)}
                              </p>
                              <p className="mt-0.5 text-slate-400">
                                {getAppointmentPhone(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {getVehicleName(appointment.vehicle)}
                              </p>
                              <p className="mt-0.5 font-mono text-slate-500">
                                {getAppointmentPlate(appointment)}
                              </p>
                            </td>

                            <td className="max-w-[200px] px-5 py-4 text-slate-600">
                              <p className="line-clamp-2 leading-relaxed">
                                {getServiceName(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {formatDate(appointment.appointment_date)}
                              </p>
                              <p className="mt-0.5 font-mono text-slate-500">
                                {appointment.appointment_time}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  appointment.status
                                )}`}
                              >
                                {getStatusText(appointment.status)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(appointment)}
                                  className="cs-unified-btn cs-unified-secondary"
                                >
                                  Chi tiết
                                </button>

                                {appointment.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isConfirming}
                                      onClick={() => handleConfirm(appointment)}
                                      className="cs-unified-btn cs-unified-primary"
                                    >
                                      {isConfirming ? "Đang xử lý..." : "Xác nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}
                                      className="cs-unified-btn cs-unified-secondary"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}

                                {appointment.status === "CHECKED_IN" && (
                                  <button type="button" onClick={() => navigate(`/advisor/reception?appointment=${appointment.id}`)}
                                    className="cs-unified-btn cs-unified-secondary">
                                    Tạo / xem phiếu
                                  </button>
                                )}

                                {appointment.status === "CONFIRMED" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isCheckingIn}
                                      onClick={() => handleCheckIn(appointment)}
                                      className="cs-unified-btn cs-unified-primary"
                                    >
                                      {isCheckingIn ? "Đang xử lý..." : "Tiếp nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}
                                      className="cs-unified-btn cs-unified-secondary"
                                    >
                                      Từ chối
                                    </button>

                                    {isPastAppointmentTime(appointment) && (
                                      <button
                                        type="button"
                                        disabled={loadingAction === `noshow-${appointment.id}`}
                                        onClick={() => handleNoShow(appointment)}
                                        className="cs-btn cs-btn-danger-outline"
                                      >
                                        Không đến
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    Không có lịch hẹn
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                    Không tìm thấy lịch hẹn phù hợp với bộ lọc hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="cs-btn cs-btn-secondary mt-4"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}

              {!loading && totalAppointments > 0 && (
                <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-slate-500">
                    Hiển thị {currentPageStart} - {currentPageEnd} trong{" "}
                    {totalAppointments} lịch hẹn
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      className="cs-btn cs-btn-secondary cs-btn-sm"
                    >
                      Trước
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            currentPage === page
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      className="cs-btn cs-btn-secondary cs-btn-sm"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Chi tiết lịch theo tokens của role; không đặt chữ trắng trên nền xám sáng. */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm" onMouseDown={event => { if (event.currentTarget === event.target) setSelectedAppointment(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="advisor-appointment-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-cs-border bg-cs-surface text-cs-text shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-cs-border bg-cs-surface px-6 py-5">
              <div><h2 id="advisor-appointment-title" className="text-lg font-extrabold">Chi tiết lịch hẹn</h2><p className="mt-1 font-mono text-xs text-cs-muted">{selectedAppointment.appointment_code}</p></div>
              <button type="button" aria-label="Đóng chi tiết" onClick={() => setSelectedAppointment(null)} className="cs-unified-btn cs-unified-secondary min-w-0 px-3">✕</button>
            </header>
            {loadingDetail ? <div className="p-6 text-sm text-cs-muted">Đang tải chi tiết lịch hẹn...</div> : <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {[
                ["Khách hàng", getAppointmentCustomer(selectedAppointment), getAppointmentPhone(selectedAppointment)],
                ["Xe / Biển số", getVehicleName(selectedAppointment.vehicle), getAppointmentPlate(selectedAppointment)],
                ["Ngày hẹn", formatDate(selectedAppointment.appointment_date), selectedAppointment.appointment_time],
              ].map(([label,value,extra]) => <div key={label} className="cs-info-panel min-w-0 p-4"><p className="text-xs font-bold uppercase tracking-wide text-cs-muted">{label}</p><p className="mt-2 break-words text-sm font-bold text-cs-text">{value}</p><p className="mt-1 break-all text-xs text-cs-muted">{extra}</p>{label === "Khách hàng" && selectedAppointment.customer?.email && <p className="mt-1 break-all text-xs text-cs-muted">{selectedAppointment.customer.email}</p>}</div>)}
              <div className="cs-info-panel p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-cs-muted">Trạng thái</p><span className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${getStatusClass(selectedAppointment.status)}`}>{getStatusText(selectedAppointment.status)}</span></div>
              <div className="cs-info-panel p-4 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-cs-muted">Dịch vụ đã chọn</p><p className="mt-2 text-sm text-cs-text">{getServiceName(selectedAppointment)}</p></div>
              {(selectedAppointment.symptom_description || selectedAppointment.note) && <div className="cs-info-panel p-4 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-cs-muted">Yêu cầu / Ghi chú</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-cs-text">{selectedAppointment.symptom_description}{selectedAppointment.symptom_description && selectedAppointment.note ? " · " : ""}{selectedAppointment.note}</p></div>}
              {selectedAppointment.cancel_reason && <div className="cs-info-panel p-4 sm:col-span-2"><p className="text-xs font-bold text-red-400">Lý do hủy</p><p className="mt-2 text-sm text-cs-text">{selectedAppointment.cancel_reason}</p></div>}
            </div>}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cs-border px-6 py-4"><p className="text-xs text-cs-muted">Thông tin từ hệ thống gara</p><button className="cs-unified-btn cs-unified-secondary" onClick={() => setSelectedAppointment(null)}>Đóng</button></footer>
          </section>
        </div>
      )}

      {/* MODAL TỪ CHỐI */}
      {cancelAppointment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cs-border bg-cs-surface text-cs-text shadow-xl">
            <div className="flex items-start justify-between border-b border-cs-border px-6 py-4">
              <div>
                <p className="text-base font-bold text-cs-text">
                  Từ chối lịch hẹn
                </p>
                <p className="text-xs text-cs-muted">
                  {cancelAppointment.appointment_code} -{" "}
                  {getAppointmentCustomer(cancelAppointment)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-cs-muted transition hover:bg-cs-surface-2 hover:text-cs-text"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                <p className="text-xs font-semibold text-rose-400">Lưu ý</p>
                <p className="mt-0.5 text-xs text-cs-text">
                  Vui lòng nhập lý do cụ thể để khách hàng nắm rõ nguyên nhân lịch hẹn bị từ chối.
                </p>
              </div>

              <label className="mt-4 block text-xs font-semibold text-cs-text">
                Lý do từ chối
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối lịch hẹn..."
                className="mt-1.5 w-full resize-none rounded-xl border border-cs-border bg-cs-surface-2 p-3 text-sm text-cs-text placeholder:text-cs-muted outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-cs-border px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="cs-btn cs-btn-secondary"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={
                  cancelReason.trim() === "" ||
                  loadingAction === `cancel-${cancelAppointment.id}`
                }
                onClick={handleCancel}
                className="cs-btn cs-btn-danger"
              >
                {loadingAction === `cancel-${cancelAppointment.id}`
                  ? "Đang xử lý..."
                  : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default Appointments;