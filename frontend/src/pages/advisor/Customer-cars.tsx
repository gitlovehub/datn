import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  createAdvisorVehicle,
  deleteAdvisorVehicle,
  getAdvisorVehicles,
  updateAdvisorVehicle,
  type AdvisorVehicle,
  type AdvisorVehicleInput,
} from "../../services/advisorVehicleService";
import {
  getAdvisorCustomers,
  type AdvisorCustomer,
} from "../../services/customerApi";

type VehicleForm = {
  customer_id: string;
  model_id: string;
  license_plate: string;
  variant: string;
  year: string;
  mileage: string;
  vin: string;
  note: string;
};

const emptyForm: VehicleForm = {
  customer_id: "",
  model_id: "",
  license_plate: "",
  variant: "",
  year: "",
  mileage: "",
  vin: "",
  note: "",
};

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

function CustomerCars() {
  const { confirm } = useAppFeedback();
  const [cars, setCars] = useState<AdvisorVehicle[]>([]);
  const [customers, setCustomers] = useState<AdvisorCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<AdvisorVehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const loadCars = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdvisorVehicles({ search, page });
      setCars(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách xe khách hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await getAdvisorCustomers({ page: 1 });
      setCustomers(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách khách hàng.",
      );
    }
  }, []);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          cars
            .map((car) => car.model?.brand?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    [cars],
  );

  const filteredCars = useMemo(
    () =>
      cars.filter((car) => {
        const carBrand = car.model?.brand?.name ?? "";
        return !brand || carBrand === brand;
      }),
    [cars, brand],
  );

  const openCreateModal = () => {
    setEditingCar(null);
    setForm(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (car: AdvisorVehicle) => {
    setEditingCar(car);
    setForm({
      customer_id: String(car.customer_id),
      model_id: String(car.model_id),
      license_plate: car.license_plate ?? "",
      variant: car.variant ?? "",
      year: car.year != null ? String(car.year) : "",
      mileage: car.mileage != null ? String(car.mileage) : "",
      vin: car.vin ?? "",
      note: car.note ?? "",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingCar(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalError("");

    const customerId = Number(form.customer_id);
    const modelId = Number(form.model_id);
    const year = form.year.trim() ? Number(form.year) : null;
    const mileage = form.mileage.trim() ? Number(form.mileage) : null;

    if (!customerId || !modelId) {
      setModalError("Vui lòng chọn khách hàng và nhập model ID hợp lệ.");
      return;
    }

    if (
      (year !== null &&
        (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) ||
      (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
    ) {
      setModalError("Năm sản xuất hoặc số km không hợp lệ.");
      return;
    }

    const data: AdvisorVehicleInput = {
      customer_id: customerId,
      model_id: modelId,
      license_plate: form.license_plate.trim() || null,
      variant: form.variant.trim() || null,
      year,
      mileage,
      vin: form.vin.trim() || null,
      note: form.note.trim() || null,
    };

    setSaving(true);

    try {
      if (editingCar) {
        await updateAdvisorVehicle(editingCar.id, data);
      } else {
        await createAdvisorVehicle(data);
      }

      setIsModalOpen(false);
      setEditingCar(null);
      setForm(emptyForm);
      await loadCars();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Không thể lưu thông tin xe.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (car: AdvisorVehicle) => {
    const plate = car.license_plate || `#${car.id}`;

    if (!await confirm({ title: "Xác nhận xóa xe", description: `Bạn có chắc muốn xóa xe biển số ${plate}? Hãy đảm bảo xe không có lịch hẹn đang xử lý.`, variant: "danger", confirmText: "Xóa xe" })) return;

    setDeletingId(car.id);
    setError("");

    try {
      await deleteAdvisorVehicle(car.id);

      if (cars.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadCars();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa xe.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8A949E]">
                GARA / XE KHÁCH HÀNG
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Quản lý xe khách hàng
                  </h2>
                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Theo dõi và cập nhật thông tin xe thuộc khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="cs-btn cs-btn-primary"
                >
                  + Thêm xe
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG SỐ XE
                </p>
                <p className="mt-3 text-[24px] font-bold">{total}</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Tổng số xe từ hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KẾT QUẢ
                </p>
                <p className="mt-3 text-[24px] font-bold">
                  {filteredCars.length}
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Xe ở trang hiện tại
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  VAI TRÒ
                </p>
                <p className="mt-3 text-[14px] font-bold">Cố vấn dịch vụ</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="mb-5">
                <p className="text-[13px] font-semibold">Tìm kiếm xe</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Tìm theo biển số, VIN hoặc phiên bản xe.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadCars();
                  }}
                  placeholder="Nhập biển số, VIN hoặc phiên bản..."
                  className={inputClass}
                />

                <select
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả hãng xe</option>
                  {brands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void loadCars()}
                  className="cs-btn cs-btn-primary"
                >
                  Tìm kiếm
                </button>
              </div>

              {(search || brand) && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setBrand("");
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-[#66717C] hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold">
                    Danh sách xe khách hàng
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    Dữ liệu được tải từ hệ thống
                  </p>
                </div>
                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-xs font-semibold text-[#66717C]">
                  {total} xe
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      {[
                        "STT",
                        "BIỂN SỐ",
                        "KHÁCH HÀNG",
                        "HÃNG / MẪU XE",
                        "NĂM SX",
                        "SỐ KM",
                        "THAO TÁC",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-xs font-bold text-[#8A949E]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-[12px] text-[#8A949E]"
                        >
                          Đang tải danh sách xe...
                        </td>
                      </tr>
                    ) : filteredCars.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-[12px] text-[#8A949E]"
                        >
                          Không tìm thấy xe phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCars.map((car, index) => (
                        <tr
                          key={car.id}
                          className="border-b border-[#EEF0F2] last:border-0 hover:bg-transparent cs-readable-row"
                        >
                          <td className="px-5 py-4 text-xs text-[#66717C]">
                            {(page - 1) * 10 + index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-xs font-bold">
                              {car.license_plate || "Chưa có biển số"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold">
                              {car.customer?.full_name ||
                                car.customer?.name ||
                                "Chưa có thông tin"}
                            </p>
                            <p className="mt-1 text-xs text-[#8A949E]">
                              {car.customer?.phone || car.customer?.email || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold">
                              {car.model?.brand?.name || "Chưa xác định"}
                            </p>
                            <p className="mt-1 text-xs text-[#8A949E]">
                              {car.model?.name || car.variant || "Chưa xác định"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#66717C]">
                            {car.year || "—"}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#66717C]">
                            {car.mileage != null
                              ? `${car.mileage.toLocaleString("vi-VN")} km`
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/advisor/appointments"
                                className="cs-btn cs-btn-secondary cs-btn-sm"
                              >
                                Lịch hẹn
                              </Link>

                              <button
                                type="button"
                                onClick={() => openEditModal(car)}
                                className="cs-btn cs-btn-secondary cs-btn-sm"
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                disabled={deletingId === car.id}
                                onClick={() => void handleDelete(car)}
                                className="cs-btn cs-btn-danger-outline cs-btn-sm"
                              >
                                {deletingId === car.id ? "Đang xóa..." : "Xóa"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-[#EEF0F2] px-5 py-4">
                  <p className="text-xs text-[#8A949E]">
                    Trang {page} / {lastPage}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                      className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      Trang trước
                    </button>
                    <button
                      type="button"
                      disabled={page >= lastPage}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <h3 className="text-lg font-bold">
                  {editingCar ? "Cập nhật thông tin xe" : "Thêm xe khách hàng"}
                </h3>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Nhập thông tin theo dữ liệu hợp lệ trong hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-sm text-[#66717C] hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {modalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Khách hàng *
                  <select
                    required
                    value={form.customer_id}
                    onChange={(event) =>
                      setForm({ ...form, customer_id: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                  >
                    <option value="">Chọn khách hàng</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} - {customer.phone}
                      </option>
                    ))}
                    {editingCar &&
                      !customers.some(
                        (customer) => customer.id === editingCar.customer_id,
                      ) && (
                        <option value={editingCar.customer_id}>
                          {editingCar.customer?.full_name ||
                            editingCar.customer?.name ||
                            `Khách hàng #${editingCar.customer_id}`}
                        </option>
                      )}
                  </select>
                </label>

                <label className="block text-xs font-semibold">
                  Model ID *
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.model_id}
                    onChange={(event) =>
                      setForm({ ...form, model_id: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập ID mẫu xe hợp lệ"
                  />
                  <span className="mt-1 block font-normal text-[#8A949E]">
                    {editingCar
                      ? `Mẫu xe hiện tại: ${editingCar.model?.name || `#${editingCar.model_id}`}`
                      : "Dùng ID mẫu xe đã có trong database."}
                  </span>
                </label>

                <label className="block text-xs font-semibold">
                  Biển số
                  <input
                    value={form.license_plate}
                    onChange={(event) =>
                      setForm({ ...form, license_plate: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="30A-123.45"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Phiên bản xe
                  <input
                    value={form.variant}
                    onChange={(event) =>
                      setForm({ ...form, variant: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Ví dụ: 1.5G"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Năm sản xuất
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(event) =>
                      setForm({ ...form, year: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="2024"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Số km hiện tại
                  <input
                    type="number"
                    min="0"
                    value={form.mileage}
                    onChange={(event) =>
                      setForm({ ...form, mileage: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="15000"
                  />
                </label>

                <label className="block text-xs font-semibold sm:col-span-2">
                  Số VIN
                  <input
                    value={form.vin}
                    onChange={(event) =>
                      setForm({ ...form, vin: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập số VIN nếu có"
                  />
                </label>

                <label className="block text-xs font-semibold sm:col-span-2">
                  Ghi chú
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Thông tin bổ sung về xe..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#EEF0F2] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cs-btn cs-btn-primary"
                >
                  {saving ? "Đang lưu..." : editingCar ? "Lưu thay đổi" : "Thêm xe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerCars;
