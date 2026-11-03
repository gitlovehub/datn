import { useAppFeedback } from "../../components/ui/feedbackContext";
import AdminHubNav from "../../components/AdminHubNav";
import { useEffect, useState, type FormEvent } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type ServiceStatus = "ACTIVE" | "INACTIVE";

type Service = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  base_price: string;
  estimated_minutes: number | null;
  status: ServiceStatus;
};

type ServiceForm = {
  name: string;
  category: string;
  description: string;
  base_price: string;
  estimated_minutes: string;
  status: ServiceStatus;
};

type ServiceIndexResponse = {
  data: {
    data: Service[];
    current_page: number;
    last_page: number;
    total: number;
  };
};

type ServiceResponse = {
  data: Service;
};

const emptyForm: ServiceForm = {
  name: "",
  category: "",
  description: "",
  base_price: "",
  estimated_minutes: "",
  status: "ACTIVE",
};

const fieldClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1F2933] focus:ring-2 focus:ring-[#D6A85F]/20";

function formatPrice(price: string | number): string {
  const value = Number(price);

  if (!Number.isFinite(value)) return "Chưa có giá";

  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

function Services() {
  const { confirm } = useAppFeedback();
  const [services, setServices] = useState<Service[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"form" | "detail" | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page) });

    if (filters.search) query.set("search", filters.search);
    if (filters.category) query.set("category", filters.category);
    if (filters.status) query.set("status", filters.status);

    setIsLoading(true);
    setError("");

    fetchApi(`/admin/services?${query.toString()}`)
      .then((response: ServiceIndexResponse) => {
        if (!active) return;

        const result = response.data;

        setServices(Array.isArray(result.data) ? result.data : []);
        setLastPage(Math.max(1, Number(result.last_page) || 1));
        setTotal(Number(result.total) || 0);

        if (page > Math.max(1, Number(result.last_page) || 1)) {
          setPage(Math.max(1, Number(result.last_page) || 1));
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        setServices([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải danh sách dịch vụ.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, reloadKey]);

  const activeCount = services.filter(
    (service) => service.status === "ACTIVE",
  ).length;

  const inactiveCount = services.filter(
    (service) => service.status === "INACTIVE",
  ).length;

  const openCreateModal = () => {
    setSelectedService(null);
    setForm(emptyForm);
    setFormError("");
    setModal("form");
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setForm({
      name: service.name,
      category: service.category ?? "",
      description: service.description ?? "",
      base_price: String(service.base_price ?? ""),
      estimated_minutes: service.estimated_minutes?.toString() ?? "",
      status: service.status,
    });
    setFormError("");
    setModal("form");
  };

  const openDetailModal = async (service: Service) => {
    setError("");
    setNotice("");
    setSelectedService(service);
    setModal("detail");
    setIsLoadingDetail(true);

    try {
      const response: ServiceResponse = await fetchApi(
        `/admin/services/${service.id}`,
      );
      setSelectedService(response.data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thông tin dịch vụ.",
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }));
    setNotice("");
  };

  const clearFilters = () => {
    setSearchInput("");
    setPage(1);
    setFilters({ search: "", category: "", status: "" });
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const name = form.name.trim();
    const basePrice = Number(form.base_price);
    const estimatedMinutes = form.estimated_minutes
      ? Number(form.estimated_minutes)
      : null;

    if (!name) {
      setFormError("Vui lòng nhập tên dịch vụ.");
      return;
    }

    if (
      form.base_price.trim() === "" ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      setFormError("Giá dịch vụ phải là số hợp lệ và không âm.");
      return;
    }

    if (
      estimatedMinutes !== null &&
      (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)
    ) {
      setFormError("Thời gian phải là số nguyên lớn hơn 0.");
      return;
    }

    const payload = {
      name,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      base_price: basePrice,
      estimated_minutes: estimatedMinutes,
      status: form.status,
    };

    setIsSaving(true);

    try {
      await fetchApi(
        selectedService
          ? `/admin/services/${selectedService.id}`
          : "/admin/services",
        {
          method: selectedService ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      setModal(null);
      setPage(1);
      setSearchInput("");
      setFilters({ search: "", category: "", status: "" });
      setNotice(
        selectedService
          ? "Cập nhật dịch vụ thành công."
          : "Thêm dịch vụ thành công.",
      );
      setReloadKey((current) => current + 1);
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu dịch vụ.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (isDeleting) return;

    const confirmed = await confirm({ title: "Ẩn dịch vụ", description: `Dịch vụ “${service.name}” sẽ không còn xuất hiện trong danh mục hoạt động.`, confirmText: "Ẩn dịch vụ" });

    if (!confirmed) return;

    setError("");
    setNotice("");
    setIsDeleting(true);
    setDeletingId(service.id);

    try {
      await fetchApi(`/admin/services/${service.id}`, {
        method: "DELETE",
      });

      setNotice(`Đã xử lý yêu cầu ẩn dịch vụ "${service.name}".`);

      if (services.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể ẩn dịch vụ.",
      );
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#B68A43]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
              </p>

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                    AD
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Quản lý dịch vụ
                    </h1>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Quản lý thông tin, giá và trạng thái dịch vụ sửa chữa.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="cs-btn cs-btn-primary"
                >
                  + Thêm dịch vụ
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#66717C]">
                    Tổng dịch vụ
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#6D542A]">
                    T
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "—" : total}
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Tổng số kết quả theo bộ lọc
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#66717C]">
                    Đang hoạt động
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F3E8] text-sm font-bold text-[#397044]">
                    ✓
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "—" : activeCount}
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Trên trang đang hiển thị
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#66717C]">
                    Ngừng hoạt động
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F2F3] text-sm font-bold text-[#66717C]">
                    —
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "—" : inactiveCount}
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Trên trang đang hiển thị
                </p>
              </div>
            </div>

            <AdminHubNav />

            <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-sm font-bold">Tìm kiếm và lọc</h2>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Nhập thông tin hoặc chọn trạng thái để tìm dịch vụ.
                </p>
              </div>

              <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  type="search"
                  placeholder="Tên dịch vụ..."
                  className={fieldClass}
                />

                <input
                  value={filters.category}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }));
                  }}
                  type="text"
                  placeholder="Danh mục..."
                  className={fieldClass}
                />

                <select
                  value={filters.status}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="cs-btn cs-btn-primary flex-1"
                  >
                    Tìm kiếm
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                  >
                    Xóa lọc
                  </button>
                </div>
              </form>
            </section>

            {notice && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#D8E8D9] bg-[#F0F7F0] px-4 py-3 text-sm text-[#35633B]">
                <p>{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="font-bold"
                  aria-label="Đóng thông báo"
                >
                  ×
                </button>
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B68A43]">
                    SERVICE MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Danh sách dịch vụ
                  </h2>
                </div>

                <p className="text-xs text-[#8A949E]">
                  {total} kết quả
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="m-5 flex items-start justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="font-bold"
                    aria-label="Đóng thông báo lỗi"
                  >
                    ×
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-medium text-[#66717C]">
                    Đang tải dịch vụ...
                  </p>
                </div>
              ) : services.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-lg">
                    —
                  </div>
                  <p className="mt-4 text-sm font-semibold">
                    Không tìm thấy dịch vụ
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    Thử thay đổi từ khóa hoặc xóa bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-xs font-semibold hover:bg-[#F3F4F2]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {services.map((service, index) => (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-4 transition hover:border-[#D5D9DC] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                            {String((page - 1) * 10 + index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-bold">
                                {service.name}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  service.status === "ACTIVE"
                                    ? "bg-[#F3E8D2] text-[#3A3020]"
                                    : "bg-[#F1F2F3] text-[#66717C]"
                                }`}
                              >
                                {service.status === "ACTIVE"
                                  ? "Đang hoạt động"
                                  : "Ngừng hoạt động"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-[#8A949E]">
                              DV-{String(service.id).padStart(3, "0")}
                              {service.category ? ` · ${service.category}` : ""}
                            </p>

                            <p className="mt-2 max-w-md break-words text-xs leading-5 text-[#66717C]">
                              {service.description || "Chưa có mô tả."}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 xl:min-w-[330px]">
                          <div>
                            <p className="text-xs text-[#8A949E]">
                              GIÁ THAM KHẢO
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {formatPrice(service.base_price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              THỜI GIAN
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {service.estimated_minutes
                                ? `${service.estimated_minutes} phút`
                                : "Chưa xác định"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              MÃ DỊCH VỤ
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              DV-{String(service.id).padStart(3, "0")}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(service)}
                            disabled={isLoadingDetail}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:opacity-50"
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(service)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                          >
                            Chỉnh sửa
                          </button>

                          {service.status === "ACTIVE" && (
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => void handleDelete(service)}
                              className="cs-btn cs-btn-danger-outline"
                            >
                              {deletingId === service.id
                                ? "Đang xử lý..."
                                : "Ẩn dịch vụ"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[#EEF0F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-[#66717C]">
                  Trang {page} / {lastPage} · {total} dịch vụ
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:opacity-40"
                  >
                    Trước
                  </button>

                  <button
                    type="button"
                    disabled={page >= lastPage || isLoading}
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setModal(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-modal-title"
            className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            {modal === "form" ? (
              <>
                <h2 id="service-modal-title" className="mb-5 text-xl font-bold">
                  {selectedService ? "Cập nhật dịch vụ" : "Thêm dịch vụ"}
                </h2>

                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="space-y-4"
                >
                  <label className="block text-xs font-semibold">
                    Tên dịch vụ *
                    <input
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>

                  <label className="block text-xs font-semibold">
                    Danh mục
                    <input
                      maxLength={100}
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>

                  <label className="block text-xs font-semibold">
                    Mô tả
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold">
                      Giá tham khảo *
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={form.base_price}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            base_price: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>

                    <label className="block text-xs font-semibold">
                      Thời gian (phút)
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.estimated_minutes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            estimated_minutes: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>

                    <label className="block text-xs font-semibold">
                      Trạng thái
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status:
                              event.target.value === "INACTIVE"
                                ? "INACTIVE"
                                : "ACTIVE",
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      >
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Ngừng hoạt động</option>
                      </select>
                    </label>
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      disabled={isSaving}
                      className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="cs-btn cs-btn-primary"
                    >
                      {isSaving ? "Đang lưu..." : "Lưu dịch vụ"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 id="service-modal-title" className="mb-5 text-xl font-bold">
                  Chi tiết dịch vụ
                </h2>

                {isLoadingDetail ? (
                  <p className="py-8 text-center text-sm text-[#66717C]">
                    Đang tải thông tin...
                  </p>
                ) : selectedService ? (
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-xs text-[#8A949E]">Mã dịch vụ</dt>
                      <dd className="mt-1 font-semibold">
                        DV-{String(selectedService.id).padStart(3, "0")}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Tên dịch vụ</dt>
                      <dd className="mt-1 font-semibold">
                        {selectedService.name}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Danh mục</dt>
                      <dd className="mt-1">
                        {selectedService.category || "Chưa phân loại"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Mô tả</dt>
                      <dd className="mt-1 whitespace-pre-wrap">
                        {selectedService.description || "Chưa có mô tả."}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Giá tham khảo</dt>
                      <dd className="mt-1 font-semibold">
                        {formatPrice(selectedService.base_price)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Thời gian dự kiến</dt>
                      <dd className="mt-1">
                        {selectedService.estimated_minutes
                          ? `${selectedService.estimated_minutes} phút`
                          : "Chưa xác định"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#8A949E]">Trạng thái</dt>
                      <dd className="mt-1">
                        {selectedService.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Ngừng hoạt động"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="py-6 text-sm text-[#66717C]">
                    Không có thông tin dịch vụ.
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="cs-btn cs-btn-primary"
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Services;