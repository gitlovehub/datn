import { useAppFeedback } from "../../components/ui/feedbackContext";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type PackageStatus = "ACTIVE" | "INACTIVE";

type PackageService = {
  id: number;
  name: string;
  base_price: string;
  category?: string | null;
  pivot?: { quantity: number };
};

type PackagePart = {
  id: number;
  sku: string;
  name: string;
  sell_price: string;
  pivot?: { quantity: number };
};

type VehicleModelRef = {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
};

type MaintenancePackage = {
  id: number;
  vehicle_model_id: number | null;
  name: string;
  mileage_milestone: number | null;
  month_milestone: number | null;
  description: string | null;
  status: PackageStatus;
  price: number;
  estimated_price: number;
  vehicle_model: VehicleModelRef | null;
  services: PackageService[];
  parts: PackagePart[];
};

type PackageServiceRef = {
  id: number;
  name: string;
  category: string | null;
  base_price: string;
};

type PackagePartRef = {
  id: number;
  sku: string;
  name: string;
  sell_price: string;
};

type PackageIndexResponse = {
  data: {
    data: MaintenancePackage[];
    current_page: number;
    last_page: number;
    total: number;
  };
};

type PackageResponse = {
  data: MaintenancePackage;
};

type SelectedService = {
  service_id: number;
  quantity: number;
};

type SelectedPart = {
  part_id: number;
  quantity: number;
};

type PackageForm = {
  name: string;
  vehicle_model_id: string;
  mileage_milestone: string;
  month_milestone: string;
  description: string;
  status: PackageStatus;
  services: SelectedService[];
  parts: SelectedPart[];
};

const emptyForm: PackageForm = {
  name: "",
  vehicle_model_id: "",
  mileage_milestone: "",
  month_milestone: "",
  description: "",
  status: "ACTIVE",
  services: [],
  parts: [],
};

const fieldClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/15";

function formatPrice(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;
}

function modelLabel(model: VehicleModelRef | null): string {
  if (!model) return "Dùng chung";
  return model.brand ? `${model.brand.name} ${model.name}` : model.name;
}

function collectVehicleModels(
  packages: MaintenancePackage[],
): VehicleModelRef[] {
  const seen = new Map<number, VehicleModelRef>();

  packages.forEach((pkg) => {
    if (pkg.vehicle_model) {
      seen.set(pkg.vehicle_model.id, pkg.vehicle_model);
    }
  });

  return Array.from(seen.values()).sort((a, b) =>
    modelLabel(a).localeCompare(modelLabel(b), "vi"),
  );
}

function collectParts(packages: MaintenancePackage[]): PackagePartRef[] {
  const seen = new Map<number, PackagePartRef>();

  packages.forEach((pkg) => {
    pkg.parts.forEach((part) => {
      seen.set(part.id, {
        id: part.id,
        sku: part.sku,
        name: part.name,
        sell_price: part.sell_price,
      });
    });
  });

  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );
}

function withServiceToggled(
  form: PackageForm,
  serviceId: number,
): PackageForm {
  const exists = form.services.some(
    (item) => item.service_id === serviceId,
  );

  return {
    ...form,
    services: exists
      ? form.services.filter((item) => item.service_id !== serviceId)
      : [...form.services, { service_id: serviceId, quantity: 1 }],
  };
}

function withServiceQuantity(
  form: PackageForm,
  serviceId: number,
  quantity: number,
): PackageForm {
  return {
    ...form,
    services: form.services.map((item) =>
      item.service_id === serviceId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item,
    ),
  };
}

function withPartToggled(form: PackageForm, partId: number): PackageForm {
  const exists = form.parts.some((item) => item.part_id === partId);

  return {
    ...form,
    parts: exists
      ? form.parts.filter((item) => item.part_id !== partId)
      : [...form.parts, { part_id: partId, quantity: 1 }],
  };
}

function withPartQuantity(
  form: PackageForm,
  partId: number,
  quantity: number,
): PackageForm {
  return {
    ...form,
    parts: form.parts.map((item) =>
      item.part_id === partId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item,
    ),
  };
}

function MaintenancePackages() {
  const { confirm } = useAppFeedback();
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    vehicle_model_id: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"form" | "detail" | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<MaintenancePackage | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [formError, setFormError] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [models, setModels] = useState<VehicleModelRef[]>([]);
  const [services, setServices] = useState<PackageServiceRef[]>([]);
  const [parts, setParts] = useState<PackagePartRef[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const loadCatalog = useCallback(async () => {
    setCatalogError("");

    try {
      const [serviceResponse, firstPage] = await Promise.all([
        fetchApi("/services") as Promise<PackageServiceRef[]>,
        fetchApi(
          "/admin/maintenance-packages?page=1",
        ) as Promise<PackageIndexResponse>,
      ]);

      const allPackages = [...firstPage.data.data];

      for (
        let currentPage = 2;
        currentPage <= firstPage.data.last_page;
        currentPage += 1
      ) {
        const response = (await fetchApi(
          `/admin/maintenance-packages?page=${currentPage}`,
        )) as PackageIndexResponse;

        allPackages.push(...response.data.data);
      }

      setServices(serviceResponse);
      setModels(collectVehicleModels(allPackages));
      setParts(collectParts(allPackages));
    } catch (requestError: unknown) {
      setCatalogError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh mục dịch vụ và phụ tùng.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialCatalog() {
      try {
        const [serviceResponse, firstPage] = await Promise.all([
          fetchApi("/services") as Promise<PackageServiceRef[]>,
          fetchApi(
            "/admin/maintenance-packages?page=1",
          ) as Promise<PackageIndexResponse>,
        ]);

        const allPackages = [...firstPage.data.data];

        for (
          let currentPage = 2;
          currentPage <= firstPage.data.last_page;
          currentPage += 1
        ) {
          const response = (await fetchApi(
            `/admin/maintenance-packages?page=${currentPage}`,
          )) as PackageIndexResponse;

          allPackages.push(...response.data.data);
        }

        if (!active) return;

        setServices(serviceResponse);
        setModels(collectVehicleModels(allPackages));
        setParts(collectParts(allPackages));
      } catch (requestError: unknown) {
        if (active) {
          setCatalogError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh mục dịch vụ và phụ tùng.",
          );
        }
      }
    }

    void loadInitialCatalog();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const query = new URLSearchParams({ page: String(page) });

    if (filters.search) query.set("search", filters.search);
    if (filters.status) query.set("status", filters.status);
    if (filters.vehicle_model_id) {
      query.set("vehicle_model_id", filters.vehicle_model_id);
    }

    setIsLoading(true);
    setError("");

    fetchApi(`/admin/maintenance-packages?${query.toString()}`)
      .then((response: PackageIndexResponse) => {
        if (!active) return;

        setPackages(response.data.data);
        setPage(response.data.current_page);
        setLastPage(Math.max(1, response.data.last_page));
        setTotal(response.data.total);
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải danh sách gói bảo dưỡng.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, reloadKey]);

  const filteredServices = useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase();

    if (!keyword) return services;

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(keyword) ||
        (service.category ?? "").toLowerCase().includes(keyword),
    );
  }, [services, serviceSearch]);

  const filteredParts = useMemo(() => {
    const keyword = partSearch.trim().toLowerCase();

    if (!keyword) return parts;

    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(keyword) ||
        part.sku.toLowerCase().includes(keyword),
    );
  }, [parts, partSearch]);

  const openCreateModal = () => {
    setSelectedPackage(null);
    setForm({ ...emptyForm });
    setServiceSearch("");
    setPartSearch("");
    setFormError("");
    setModal("form");
  };

  const openEditModal = (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setForm({
      name: pkg.name,
      vehicle_model_id: pkg.vehicle_model_id?.toString() ?? "",
      mileage_milestone: pkg.mileage_milestone?.toString() ?? "",
      month_milestone: pkg.month_milestone?.toString() ?? "",
      description: pkg.description ?? "",
      status: pkg.status,
      services: pkg.services.map((service) => ({
        service_id: service.id,
        quantity: Math.max(1, service.pivot?.quantity ?? 1),
      })),
      parts: pkg.parts.map((part) => ({
        part_id: part.id,
        quantity: Math.max(1, part.pivot?.quantity ?? 1),
      })),
    });
    setServiceSearch("");
    setPartSearch("");
    setFormError("");
    setModal("form");
  };

  const openDetailModal = async (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setModal("detail");
    setIsLoadingDetail(true);
    setError("");

    try {
      const response = (await fetchApi(
        `/admin/maintenance-packages/${pkg.id}`,
      )) as PackageResponse;

      setSelectedPackage(response.data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thông tin gói bảo dưỡng.",
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
  };

  const resetFilters = () => {
    setSearchInput("");
    setPage(1);
    setFilters({
      search: "",
      status: "",
      vehicle_model_id: "",
    });
  };

  const toggleService = (serviceId: number) => {
    setForm((current) => withServiceToggled(current, serviceId));
  };

  const setServiceQuantity = (serviceId: number, quantity: number) => {
    setForm((current) => withServiceQuantity(current, serviceId, quantity));
  };

  const togglePart = (partId: number) => {
    setForm((current) => withPartToggled(current, partId));
  };

  const setPartQuantity = (partId: number, quantity: number) => {
    setForm((current) => withPartQuantity(current, partId, quantity));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const mileage = form.mileage_milestone.trim();
    const month = form.month_milestone.trim();

    if (!form.name.trim()) {
      setFormError("Vui lòng nhập tên gói bảo dưỡng.");
      return;
    }

    if (
      (mileage && (!Number.isInteger(Number(mileage)) || Number(mileage) <= 0)) ||
      (month && (!Number.isInteger(Number(month)) || Number(month) <= 0))
    ) {
      setFormError("Mốc km và mốc tháng phải là số nguyên lớn hơn 0.");
      return;
    }

    if (
      form.services.some(
        (item) =>
          !Number.isInteger(item.quantity) || item.quantity < 1,
      ) ||
      form.parts.some(
        (item) =>
          !Number.isInteger(item.quantity) || item.quantity < 1,
      )
    ) {
      setFormError("Số lượng dịch vụ và phụ tùng phải từ 1 trở lên.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      vehicle_model_id: form.vehicle_model_id
        ? Number(form.vehicle_model_id)
        : null,
      mileage_milestone: mileage ? Number(mileage) : null,
      month_milestone: month ? Number(month) : null,
      description: form.description.trim() || null,
      status: form.status,
      services: form.services,
      parts: form.parts,
    };

    setIsSaving(true);

    try {
      await fetchApi(
        selectedPackage
          ? `/admin/maintenance-packages/${selectedPackage.id}`
          : "/admin/maintenance-packages",
        {
          method: selectedPackage ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      setModal(null);
      setNotice(
        selectedPackage
          ? "Cập nhật gói bảo dưỡng thành công."
          : "Thêm gói bảo dưỡng thành công.",
      );
      setPage(1);
      setReloadKey((current) => current + 1);
      void loadCatalog();
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu gói bảo dưỡng.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pkg: MaintenancePackage) => {
    if (!await confirm({ title: "Ẩn gói bảo dưỡng", description: `Gói “${pkg.name}” sẽ không còn được hiển thị để khách chọn.`, confirmText: "Ẩn gói" })) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await fetchApi(`/admin/maintenance-packages/${pkg.id}`, {
        method: "DELETE",
      });

      setNotice(`Đã xử lý yêu cầu ẩn gói "${pkg.name}".`);

      if (packages.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }

      void loadCatalog();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể ẩn gói bảo dưỡng.",
      );
    }
  };

  const activeCount = packages.filter(
    (pkg) => pkg.status === "ACTIVE",
  ).length;
  const inactiveCount = packages.filter(
    (pkg) => pkg.status === "INACTIVE",
  ).length;
  const serviceCount = packages.reduce(
    (sum, pkg) => sum + pkg.services.length,
    0,
  );
  const partCount = packages.reduce(
    (sum, pkg) => sum + pkg.parts.length,
    0,
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                    GB
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Gói bảo dưỡng
                    </h1>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Quản lý gói bảo dưỡng, dịch vụ và phụ tùng đi kèm.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="cs-btn cs-btn-primary"
                >
                  + Thêm gói bảo dưỡng
                </button>
              </div>
            </div>

            {notice && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#D9E9DC] bg-[#EDF7EF] px-4 py-3 text-sm text-[#28643B]"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="font-semibold"
                >
                  Đóng
                </button>
              </div>
            )}

            {catalogError && (
              <div className="mb-5 rounded-xl border border-[#E1E4E6] bg-white p-4">
                <p className="text-sm text-[#66717C]">{catalogError}</p>
                <button
                  type="button"
                  onClick={() => void loadCatalog()}
                  className="mt-3 text-xs font-semibold text-[#20252B] underline"
                >
                  Tải lại danh mục
                </button>
              </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Tổng gói bảo dưỡng",
                  value: total,
                  description: "Theo kết quả từ hệ thống",
                },
                {
                  label: "Đang hoạt động",
                  value: activeCount,
                  description: "Trên trang hiện tại",
                },
                {
                  label: "Ngừng hoạt động",
                  value: inactiveCount,
                  description: "Trên trang hiện tại",
                },
                {
                  label: "Dịch vụ & phụ tùng",
                  value: serviceCount + partCount,
                  description: `${serviceCount} dịch vụ · ${partCount} phụ tùng trên trang`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                    {item.label}
                  </p>
                  <p className="mt-4 text-2xl font-bold">
                    {new Intl.NumberFormat("vi-VN").format(item.value)}
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  GARA / QUẢN LÝ BẢO DƯỠNG
                </p>
                <h2 className="mt-1 text-base font-bold">
                  Tìm kiếm và lọc gói
                </h2>
              </div>

              <form
                onSubmit={handleSearch}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  type="search"
                  placeholder="Tên gói bảo dưỡng..."
                  className={fieldClass}
                />

                <select
                  value={filters.vehicle_model_id}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      vehicle_model_id: event.target.value,
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">Tất cả dòng xe</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {modelLabel(model)}
                    </option>
                  ))}
                </select>

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
                    onClick={resetFilters}
                    className="rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                  >
                    Xóa lọc
                  </button>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    MAINTENANCE PACKAGES
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Danh sách gói bảo dưỡng
                  </h2>
                </div>
                <p className="text-xs text-[#8A949E]">
                  {total} kết quả
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="m-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
                >
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((current) => current + 1)}
                    className="mt-2 font-semibold underline"
                  >
                    Thử tải lại
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold">
                    Đang tải gói bảo dưỡng...
                  </p>
                  <p className="mt-2 text-xs text-[#8A949E]">
                    Vui lòng chờ trong giây lát.
                  </p>
                </div>
              ) : packages.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold">
                    Không tìm thấy gói bảo dưỡng
                  </p>
                  <p className="mt-2 text-xs text-[#8A949E]">
                    Hãy thay đổi điều kiện lọc hoặc thêm gói mới.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="cs-btn cs-btn-primary mt-5"
                  >
                    + Thêm gói bảo dưỡng
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {packages.map((pkg, index) => (
                    <article
                      key={pkg.id}
                      className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-4 transition hover:border-[#D5D9DC] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                            {String((page - 1) * 10 + index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold">
                                {pkg.name}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  pkg.status === "ACTIVE"
                                    ? "bg-[#E6F2E8] text-[#28643B]"
                                    : "bg-[#F3F4F2] text-[#66717C]"
                                }`}
                              >
                                {pkg.status === "ACTIVE"
                                  ? "Đang hoạt động"
                                  : "Ngừng hoạt động"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-[#8A949E]">
                              GB-{String(pkg.id).padStart(3, "0")} ·{" "}
                              {modelLabel(pkg.vehicle_model)}
                            </p>

                            <p className="mt-2 max-w-md text-xs leading-5 text-[#66717C]">
                              {pkg.description || "Chưa có mô tả."}
                            </p>

                            <p className="mt-2 text-xs text-[#8A949E]">
                              {pkg.services.length} dịch vụ ·{" "}
                              {pkg.parts.length} phụ tùng
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:min-w-[340px]">
                          <div>
                            <p className="text-xs text-[#8A949E]">
                              GIÁ ƯỚC TÍNH
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {formatPrice(pkg.price ?? pkg.estimated_price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              MỐC KM
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {pkg.mileage_milestone
                                ? `${new Intl.NumberFormat("vi-VN").format(pkg.mileage_milestone)} km`
                                : "Không đặt"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              MỐC THÁNG
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {pkg.month_milestone
                                ? `${pkg.month_milestone} tháng`
                                : "Không đặt"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:shrink-0">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(pkg)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(pkg)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                          >
                            Chỉnh sửa
                          </button>

                          {pkg.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(pkg)}
                              className="cs-btn cs-btn-danger-outline"
                            >
                              Ẩn gói
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
                  Trang {page} / {lastPage} · Tổng {total} gói
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || isLoading}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= lastPage || isLoading}
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tiếp →
                  </button>
                </div>
              </div>
            </section>

            <div className="mt-6">
              <Link
                to="/admin/services"
                className="text-xs font-semibold text-[#66717C] transition hover:text-[#20252B]"
              >
                ← Quản lý danh mục dịch vụ
              </Link>
            </div>
          </div>
        </main>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setModal(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-modal-title"
            className="my-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-7"
          >
            {modal === "form" ? (
              <>
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    QUẢN LÝ BẢO DƯỠNG
                  </p>
                  <h2
                    id="package-modal-title"
                    className="mt-2 text-xl font-bold"
                  >
                    {selectedPackage
                      ? "Cập nhật gói bảo dưỡng"
                      : "Thêm gói bảo dưỡng"}
                  </h2>
                </div>

                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="space-y-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold">
                      Tên gói bảo dưỡng *
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
                        placeholder="Nhập tên gói"
                      />
                    </label>

                    <label className="block text-xs font-semibold">
                      Dòng xe
                      <select
                        value={form.vehicle_model_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            vehicle_model_id: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      >
                        <option value="">Dùng chung cho mọi dòng xe</option>
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {modelLabel(model)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold">
                      Mốc km
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.mileage_milestone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            mileage_milestone: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                        placeholder="Ví dụ: 5000"
                      />
                    </label>

                    <label className="block text-xs font-semibold">
                      Mốc tháng
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.month_milestone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            month_milestone: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                        placeholder="Ví dụ: 6"
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

                  <label className="block text-xs font-semibold">
                    Mô tả
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                      placeholder="Mô tả nội dung bảo dưỡng..."
                    />
                  </label>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#E1E4E6] p-4">
                      <div className="mb-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold">Dịch vụ</p>
                          <span className="rounded-full bg-[#F3E8D2] px-2.5 py-1 text-xs font-semibold">
                            {form.services.length} đã chọn
                          </span>
                        </div>
                        <input
                          value={serviceSearch}
                          onChange={(event) =>
                            setServiceSearch(event.target.value)
                          }
                          placeholder="Tìm dịch vụ..."
                          className="w-full rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs outline-none focus:border-[#D6A85F]"
                        />
                      </div>

                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {filteredServices.map((service) => {
                          const selected = form.services.find(
                            (item) => item.service_id === service.id,
                          );

                          return (
                            <div
                              key={service.id}
                              className="rounded-xl bg-[#FAFAF8] p-3"
                            >
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selected)}
                                  onChange={() => toggleService(service.id)}
                                  className="mt-0.5 accent-[#1F2933]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-semibold">
                                    {service.name}
                                  </span>
                                  {service.category && (
                                    <span className="mt-1 block text-xs text-[#8A949E]">
                                      {service.category}
                                    </span>
                                  )}
                                  <span className="mt-1 block text-xs text-[#66717C]">
                                    {formatPrice(service.base_price)}
                                  </span>
                                </span>
                              </label>

                              {selected && (
                                <div className="mt-3 flex items-center justify-between border-t border-[#E5E8EA] pt-3">
                                  <label
                                    htmlFor={`service-quantity-${service.id}`}
                                    className="text-xs text-[#66717C]"
                                  >
                                    Số lượng
                                  </label>
                                  <input
                                    id={`service-quantity-${service.id}`}
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={selected.quantity}
                                    onChange={(event) =>
                                      setServiceQuantity(
                                        service.id,
                                        Number(event.target.value),
                                      )
                                    }
                                    className="w-20 rounded-lg border border-[#D9DDE1] px-2 py-1.5 text-xs outline-none focus:border-[#D6A85F]"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {filteredServices.length === 0 && (
                          <p className="py-5 text-center text-xs text-[#8A949E]">
                            Không tìm thấy dịch vụ.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] p-4">
                      <div className="mb-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold">Phụ tùng</p>
                          <span className="rounded-full bg-[#F3E8D2] px-2.5 py-1 text-xs font-semibold">
                            {form.parts.length} đã chọn
                          </span>
                        </div>
                        <input
                          value={partSearch}
                          onChange={(event) => setPartSearch(event.target.value)}
                          placeholder="Tìm phụ tùng..."
                          className="w-full rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs outline-none focus:border-[#D6A85F]"
                        />
                      </div>

                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {filteredParts.map((part) => {
                          const selected = form.parts.find(
                            (item) => item.part_id === part.id,
                          );

                          return (
                            <div
                              key={part.id}
                              className="rounded-xl bg-[#FAFAF8] p-3"
                            >
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selected)}
                                  onChange={() => togglePart(part.id)}
                                  className="mt-0.5 accent-[#1F2933]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-semibold">
                                    {part.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-[#8A949E]">
                                    {part.sku}
                                  </span>
                                  <span className="mt-1 block text-xs text-[#66717C]">
                                    {formatPrice(part.sell_price)}
                                  </span>
                                </span>
                              </label>

                              {selected && (
                                <div className="mt-3 flex items-center justify-between border-t border-[#E5E8EA] pt-3">
                                  <label
                                    htmlFor={`part-quantity-${part.id}`}
                                    className="text-xs text-[#66717C]"
                                  >
                                    Số lượng
                                  </label>
                                  <input
                                    id={`part-quantity-${part.id}`}
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={selected.quantity}
                                    onChange={(event) =>
                                      setPartQuantity(
                                        part.id,
                                        Number(event.target.value),
                                      )
                                    }
                                    className="w-20 rounded-lg border border-[#D9DDE1] px-2 py-1.5 text-xs outline-none focus:border-[#D6A85F]"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {filteredParts.length === 0 && (
                          <p className="py-5 text-center text-xs text-[#8A949E]">
                            Không tìm thấy phụ tùng.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 border-t border-[#EEF0F2] pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      disabled={isSaving}
                      className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2] disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving
                        ? "Đang lưu..."
                        : selectedPackage
                          ? "Lưu thay đổi"
                          : "Tạo gói bảo dưỡng"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    THÔNG TIN CHI TIẾT
                  </p>
                  <h2
                    id="package-modal-title"
                    className="mt-2 text-xl font-bold"
                  >
                    Gói bảo dưỡng
                  </h2>
                </div>

                {isLoadingDetail ? (
                  <p className="py-10 text-center text-sm text-[#66717C]">
                    Đang tải thông tin...
                  </p>
                ) : selectedPackage ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 rounded-2xl bg-[#FAFAF8] p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#8A949E]">Tên gói</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedPackage.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">Dòng xe</p>
                        <p className="mt-1 text-sm font-semibold">
                          {modelLabel(selectedPackage.vehicle_model)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">
                          Giá ước tính
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatPrice(
                            selectedPackage.price ??
                              selectedPackage.estimated_price,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">Trạng thái</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedPackage.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : "Ngừng hoạt động"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">Mốc km</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedPackage.mileage_milestone
                            ? `${new Intl.NumberFormat("vi-VN").format(selectedPackage.mileage_milestone)} km`
                            : "Không đặt"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">Mốc tháng</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedPackage.month_milestone
                            ? `${selectedPackage.month_milestone} tháng`
                            : "Không đặt"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold">Mô tả</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#66717C]">
                        {selectedPackage.description || "Chưa có mô tả."}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold">
                        Dịch vụ ({selectedPackage.services.length})
                      </p>
                      <div className="space-y-2">
                        {selectedPackage.services.map((service) => (
                          <div
                            key={service.id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-[#E5E8EA] p-3 sm:flex-row sm:items-center"
                          >
                            <span className="text-xs font-semibold">
                              {service.name}
                            </span>
                            <span className="text-xs text-[#66717C]">
                              SL {service.pivot?.quantity ?? 1} ·{" "}
                              {formatPrice(service.base_price)}
                            </span>
                          </div>
                        ))}
                        {selectedPackage.services.length === 0 && (
                          <p className="text-xs text-[#8A949E]">
                            Chưa gắn dịch vụ.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold">
                        Phụ tùng ({selectedPackage.parts.length})
                      </p>
                      <div className="space-y-2">
                        {selectedPackage.parts.map((part) => (
                          <div
                            key={part.id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-[#E5E8EA] p-3 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="text-xs font-semibold">
                                {part.name}
                              </p>
                              <p className="mt-1 text-xs text-[#8A949E]">
                                {part.sku}
                              </p>
                            </div>
                            <span className="text-xs text-[#66717C]">
                              SL {part.pivot?.quantity ?? 1} ·{" "}
                              {formatPrice(part.sell_price)}
                            </span>
                          </div>
                        ))}
                        {selectedPackage.parts.length === 0 && (
                          <p className="text-xs text-[#8A949E]">
                            Chưa gắn phụ tùng.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-sm text-[#66717C]">
                    Không có thông tin gói bảo dưỡng.
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#EEF0F2] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold hover:bg-[#F3F4F2]"
                  >
                    Đóng
                  </button>
                  {selectedPackage && !isLoadingDetail && (
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedPackage)}
                      className="cs-btn cs-btn-primary"
                    >
                      Chỉnh sửa gói
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default MaintenancePackages;