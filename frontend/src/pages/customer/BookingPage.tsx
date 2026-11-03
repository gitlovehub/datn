import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { ApiError, apiRequest, getApiErrorMessage } from "../../lib/api";
import {
  getTodayDateString,
  isValidAppointmentDate,
  isValidAppointmentTime,
} from "../../lib/appointments";

type Vehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  model?: { name: string; brand?: { name: string } } | null;
};

type Service = {
  id: number;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
};

type MaintenancePackage = {
  id: number;
  name: string;
  description?: string | null;
  mileage_milestone?: number | null;
  price?: number | string | null;
};

type ApiList<T> = T[] | { data: T[] };
type BookingFields = {
  vehicleId: string;
  appointmentDate: string;
  appointmentTime: string;
  note: string;
};

const inputClass =
  "w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-sm text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10";

function getItems<T>(response: ApiList<T>): T[] {
  return Array.isArray(response) ? response : response.data;
}

function formatPrice(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "";
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

function BookingPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors: formErrors },
  } = useForm<BookingFields>({
    defaultValues: {
      vehicleId: "",
      appointmentDate: "",
      appointmentTime: "",
      note: "",
    },
  });
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [packageIds, setPackageIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ data: Vehicle[] }>("/me/vehicles"),
      apiRequest<ApiList<Service>>("/services"),
      apiRequest<ApiList<MaintenancePackage>>("/maintenance-packages"),
    ])
      .then(([vehicleResponse, serviceResponse, packageResponse]) => {
        if (!active) return;
        setVehicles(vehicleResponse.data);
        setServices(getItems(serviceResponse));
        setPackages(getItems(packageResponse));
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
  }, [navigate]);

  const toggleId = (
    ids: number[],
    setIds: (nextIds: number[]) => void,
    id: number,
  ) => {
    setIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  const note = useWatch({ control, name: "note" });
  const handleBookingSubmit = async (values: BookingFields) => {
    setError("");
    setFieldError("");

    const validDate = isValidAppointmentDate(values.appointmentDate);
    const validTime = isValidAppointmentTime(values.appointmentTime);

    if (!values.vehicleId) {
      setFieldError("Vui lòng chọn xe cần làm dịch vụ.");
      return;
    }
    if (!serviceIds.length && !packageIds.length) {
      setFieldError("Vui lòng chọn ít nhất một dịch vụ hoặc gói bảo dưỡng.");
      return;
    }
    if (!validDate) {
      setFieldError("Ngày hẹn không hợp lệ hoặc đã ở trong quá khứ.");
      return;
    }
    if (!validTime) {
      setFieldError("Vui lòng chọn giờ hẹn từ 08:00 đến 17:30.");
      return;
    }
    if (values.note.length > 500) {
      setFieldError("Ghi chú không được vượt quá 500 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest<{
        data: { id: number; appointment_code: string };
      }>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: Number(values.vehicleId),
          appointment_date: values.appointmentDate,
          appointment_time: values.appointmentTime,
          request_type: "MAINTENANCE",
          note: values.note.trim() || null,
          service_ids: serviceIds,
          package_ids: packageIds,
        }),
      });
      navigate("/appointments", {
        state: {
          successMessage: `Đặt lịch thành công. Mã lịch hẹn: ${response.data.appointment_code}`,
        },
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />
      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / ĐẶT LỊCH
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1F2933]">
            Đặt lịch bảo dưỡng
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66717C]">
            Chọn xe, dịch vụ và thời gian phù hợp để gửi yêu cầu đặt lịch.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(handleBookingSubmit)}
          className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.05)]"
        >
          <div className="border-b border-[#E1E4E6] px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
              BOOKING
            </p>
            <h2 className="mt-1 text-base font-bold">Thông tin đặt lịch</h2>
          </div>

          <div className="space-y-7 p-5 sm:p-7">
            {error && (
              <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {fieldError && (
              <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {fieldError}
              </div>
            )}

            <div>
              <label htmlFor="vehicle" className="mb-2 block text-sm font-semibold">
                Chọn xe
              </label>
              <select
                id="vehicle"
                {...register("vehicleId", { required: "Vui lòng chọn xe cần làm dịch vụ." })}
                className={inputClass}
                disabled={loading}
              >
                <option value="">
                  {loading ? "Đang tải xe..." : "Chọn xe của bạn"}
                </option>
                {vehicles.map((vehicle) => {
                  const name = [
                    vehicle.model?.brand?.name,
                    vehicle.model?.name,
                    vehicle.variant,
                    vehicle.year,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <option key={vehicle.id} value={vehicle.id}>
                      {name || "Xe"}
                      {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
                    </option>
                  );
                })}
              </select>
              {formErrors.vehicleId && (
                <p className="mt-2 text-xs text-red-600">{formErrors.vehicleId.message}</p>
              )}
              {!loading && vehicles.length === 0 && !error && (
                <p className="mt-2 text-xs text-amber-700">
                  Bạn chưa có xe đăng ký. Vui lòng thêm xe trước khi đặt lịch.
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Gói bảo dưỡng</legend>
              {loading ? (
                <p className="text-sm text-[#66717C]">Đang tải gói bảo dưỡng...</p>
              ) : packages.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {packages.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F]"
                    >
                      <input
                        type="checkbox"
                        checked={packageIds.includes(item.id)}
                        onChange={() => toggleId(packageIds, setPackageIds, item.id)}
                        className="mt-1 accent-[#1F2933]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{item.name}</span>
                        {item.description && (
                          <span className="mt-1 block text-xs leading-5 text-[#66717C]">
                            {item.description}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-[#8A949E]">
                          {item.mileage_milestone
                            ? `${Number(item.mileage_milestone).toLocaleString("vi-VN")} km`
                            : ""}
                          {item.price != null ? ` · ${formatPrice(item.price)}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#66717C]">Hiện chưa có gói bảo dưỡng.</p>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Dịch vụ lẻ</legend>
              {loading ? (
                <p className="text-sm text-[#66717C]">Đang tải dịch vụ...</p>
              ) : services.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F]"
                    >
                      <input
                        type="checkbox"
                        checked={serviceIds.includes(item.id)}
                        onChange={() => toggleId(serviceIds, setServiceIds, item.id)}
                        className="mt-1 accent-[#1F2933]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{item.name}</span>
                        {item.description && (
                          <span className="mt-1 block text-xs leading-5 text-[#66717C]">
                            {item.description}
                          </span>
                        )}
                        {item.base_price != null && (
                          <span className="mt-1 block text-xs text-[#8A949E]">
                            {formatPrice(item.base_price)}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#66717C]">Hiện chưa có dịch vụ.</p>
              )}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="appointment-date" className="mb-2 block text-sm font-semibold">
                  Ngày hẹn
                </label>
                <input
                  id="appointment-date"
                  type="date"
                  min={getTodayDateString()}
                  {...register("appointmentDate", { required: "Vui lòng chọn ngày hẹn." })}
                  className={inputClass}
                />
                {formErrors.appointmentDate && (
                  <p className="mt-2 text-xs text-red-600">{formErrors.appointmentDate.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="appointment-time" className="mb-2 block text-sm font-semibold">
                  Giờ hẹn
                </label>
                <select
                  id="appointment-time"
                  {...register("appointmentTime", { required: "Vui lòng chọn giờ hẹn." })}
                  className={inputClass}
                >
                  <option value="">Chọn giờ (08:00–17:30)</option>
                  {Array.from({ length: 20 }, (_, index) => {
                    const minutes = 8 * 60 + index * 30;
                    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
                    return <option key={time} value={time}>{time}</option>;
                  })}
                </select>
                {formErrors.appointmentTime && (
                  <p className="mt-2 text-xs text-red-600">{formErrors.appointmentTime.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="booking-note" className="mb-2 block text-sm font-semibold">
                Ghi chú
              </label>
              <textarea
                id="booking-note"
                rows={4}
                maxLength={500}
                {...register("note")}
                placeholder="Mô tả tình trạng xe hoặc yêu cầu đặc biệt (nếu có)"
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1 text-right text-xs text-[#8A949E]">{note.length}/500</p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E1E4E6] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#66717C]">
                Garage làm việc từ 08:00 đến 17:30. Lịch hẹn sẽ ở trạng thái chờ duyệt.
              </p>
              <button
                type="submit"
                disabled={loading || submitting || vehicles.length === 0}
                className="rounded-xl bg-[#1F2933] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Đang gửi..." : "Xác nhận đặt lịch"}
              </button>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

export default BookingPage;
