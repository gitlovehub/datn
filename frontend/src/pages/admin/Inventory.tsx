import AdminHubNav from "../../components/AdminHubNav";
import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type PartStatus = "Còn hàng" | "Sắp hết" | "Hết hàng";

type Part = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  status: PartStatus;
};

const initialParts: Part[] = [
  {
    id: "PT-001",
    name: "Dầu động cơ 5W-30",
    category: "Dầu nhớt",
    quantity: 24,
    unit: "Chai",
    price: 450000,
    status: "Còn hàng",
  },
  {
    id: "PT-002",
    name: "Má phanh trước Toyota",
    category: "Hệ thống phanh",
    quantity: 8,
    unit: "Bộ",
    price: 1200000,
    status: "Sắp hết",
  },
  {
    id: "PT-003",
    name: "Lọc dầu động cơ",
    category: "Bộ lọc",
    quantity: 32,
    unit: "Cái",
    price: 180000,
    status: "Còn hàng",
  },
  {
    id: "PT-004",
    name: "Gas điều hòa R134a",
    category: "Điều hòa",
    quantity: 3,
    unit: "Bình",
    price: 650000,
    status: "Sắp hết",
  },
];

const categories = [
  "Dầu nhớt",
  "Hệ thống phanh",
  "Bộ lọc",
  "Điều hòa",
];

function getPartStatus(quantity: number): PartStatus {
  if (quantity <= 0) return "Hết hàng";
  if (quantity <= 10) return "Sắp hết";
  return "Còn hàng";
}

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")} đ`;
}

function Inventory() {
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả danh mục");
  const [selectedStatus, setSelectedStatus] = useState("Tất cả trạng thái");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "detail" | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: categories[0],
    quantity: "0",
    unit: "Cái",
    price: "0",
  });

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesKeyword = `${part.id} ${part.name}`
        .toLowerCase()
        .includes(keyword.trim().toLowerCase());

      const matchesCategory =
        selectedCategory === "Tất cả danh mục" ||
        part.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "Tất cả trạng thái" ||
        part.status === selectedStatus;

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [parts, keyword, selectedCategory, selectedStatus]);

  const lowStockCount = parts.filter(
    (part) => part.status === "Sắp hết",
  ).length;
  const outOfStockCount = parts.filter(
    (part) => part.status === "Hết hàng",
  ).length;
  const activeStockCount = parts.filter(
    (part) => part.status === "Còn hàng",
  ).length;

  function openAddModal() {
    setSelectedPart(null);
    setForm({
      name: "",
      category: categories[0],
      quantity: "0",
      unit: "Cái",
      price: "0",
    });
    setMessage("");
    setModal("add");
  }

  function openEditModal(part: Part) {
    setSelectedPart(part);
    setForm({
      name: part.name,
      category: part.category,
      quantity: String(part.quantity),
      unit: part.unit,
      price: String(part.price),
    });
    setMessage("");
    setModal("edit");
  }

  function handleSave() {
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    const name = form.name.trim();
    const unit = form.unit.trim();

    if (
      !name ||
      !unit ||
      form.quantity.trim() === "" ||
      form.price.trim() === "" ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity < 0 ||
      price < 0
    ) {
      setMessage("Vui lòng nhập đầy đủ thông tin hợp lệ.");
      return;
    }

    if (modal === "add") {
      const nextNumber =
        Math.max(
          0,
          ...parts.map((part) => Number(part.id.replace("PT-", "")) || 0),
        ) + 1;

      const newPart: Part = {
        id: `PT-${String(nextNumber).padStart(3, "0")}`,
        name,
        category: form.category,
        quantity,
        unit,
        price,
        status: getPartStatus(quantity),
      };

      setParts((current) => [...current, newPart]);
      setKeyword("");
      setSelectedCategory("Tất cả danh mục");
      setSelectedStatus("Tất cả trạng thái");
      setMessage("Đã thêm phụ tùng mới.");
    } else if (modal === "edit" && selectedPart) {
      setParts((current) =>
        current.map((part) =>
          part.id === selectedPart.id
            ? {
                ...part,
                name,
                category: form.category,
                quantity,
                unit,
                price,
                status: getPartStatus(quantity),
              }
            : part,
        ),
      );
      setMessage("Đã cập nhật thông tin phụ tùng.");
    }

    setModal(null);
    setSelectedPart(null);
  }

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

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  PT
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Phụ tùng & tồn kho
                  </h1>
                  <p className="mt-1 text-xs text-[#66717C]">
                    Quản lý phụ tùng, số lượng và tình trạng tồn kho của gara.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddModal}
                  className="cs-btn cs-btn-primary"
                >
                  + Nhập phụ tùng
                </button>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 text-sm text-[#20252B]"
              >
                {message}
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="ml-3 font-semibold text-[#8A949E] hover:text-[#20252B]"
                >
                  Đóng
                </button>
              </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Tổng phụ tùng",
                  value: parts.length,
                  description: "Mặt hàng trong kho",
                },
                {
                  label: "Còn hàng",
                  value: activeStockCount,
                  description: "Mặt hàng đủ số lượng",
                },
                {
                  label: "Sắp hết",
                  value: lowStockCount,
                  description: "Cần nhập thêm",
                },
                {
                  label: "Hết hàng",
                  value: outOfStockCount,
                  description: "Cần bổ sung ngay",
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

            <AdminHubNav />

            <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  GARA / PHỤ TÙNG & TỒN KHO
                </p>
                <h2 className="mt-1 text-base font-bold">
                  Tìm kiếm phụ tùng
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tên hoặc mã phụ tùng..."
                  className="min-w-0 rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#D6A85F]"
                />

                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-w-0 rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#D6A85F]"
                >
                  <option>Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="min-w-0 rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#D6A85F]"
                >
                  <option>Tất cả trạng thái</option>
                  <option>Còn hàng</option>
                  <option>Sắp hết</option>
                  <option>Hết hàng</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setSelectedCategory("Tất cả danh mục");
                    setSelectedStatus("Tất cả trạng thái");
                  }}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-5 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    INVENTORY MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Danh sách phụ tùng
                  </h2>
                </div>
                <p className="text-xs text-[#8A949E]">
                  {filteredParts.length} / {parts.length} mặt hàng
                </p>
              </div>

              {filteredParts.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold">
                    Không tìm thấy phụ tùng
                  </p>
                  <p className="mt-2 text-xs text-[#8A949E]">
                    Thử thay đổi từ khóa hoặc điều kiện lọc.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4 sm:p-5">
                  {filteredParts.map((part, index) => (
                    <article
                      key={part.id}
                      className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-4 transition hover:border-[#D5D9DC] sm:p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">{part.name}</p>
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  part.status === "Còn hàng"
                                    ? "bg-[#E6F2E8] text-[#28643B]"
                                    : part.status === "Sắp hết"
                                      ? "bg-[#F8EBD3] text-[#8A5A13]"
                                      : "bg-[#FBE5E5] text-[#A12B2B]"
                                }`}
                              >
                                {part.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#8A949E]">
                              {part.id} · {part.category}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:min-w-[480px]">
                          <div>
                            <p className="text-xs text-[#8A949E]">
                              SỐ LƯỢNG
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {part.quantity} {part.unit}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              ĐƠN GIÁ
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {formatPrice(part.price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              DANH MỤC
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {part.category}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#8A949E]">
                              MÃ PHỤ TÙNG
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {part.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 xl:shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPart(part);
                              setModal("detail");
                            }}
                            className="flex-1 rounded-xl border border-[#D9DDE1] bg-white px-3 py-2.5 text-xs font-semibold transition hover:bg-[#F3F4F2] sm:flex-none"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(part)}
                            className="cs-btn cs-btn-primary flex-1 sm:flex-none"
                          >
                            Cập nhật
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  QUẢN LÝ KHO
                </p>
                <h2
                  id="inventory-modal-title"
                  className="mt-2 text-xl font-bold"
                >
                  {modal === "add"
                    ? "Nhập phụ tùng"
                    : modal === "edit"
                      ? "Cập nhật phụ tùng"
                      : "Chi tiết phụ tùng"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Đóng"
                className="rounded-lg px-3 py-2 text-lg text-[#66717C] hover:bg-[#F3F4F2]"
              >
                ×
              </button>
            </div>

            {modal === "detail" && selectedPart ? (
              <div className="space-y-4">
                {[
                  ["Mã phụ tùng", selectedPart.id],
                  ["Tên phụ tùng", selectedPart.name],
                  ["Danh mục", selectedPart.category],
                  ["Số lượng", `${selectedPart.quantity} ${selectedPart.unit}`],
                  ["Đơn giá", formatPrice(selectedPart.price)],
                  ["Trạng thái", selectedPart.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-[#EEF0F2] pb-3"
                  >
                    <span className="text-xs text-[#8A949E]">{label}</span>
                    <span className="text-right text-xs font-semibold">
                      {value}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openEditModal(selectedPart)}
                  className="cs-btn cs-btn-primary mt-3 cs-btn-block"
                >
                  Cập nhật phụ tùng
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Tên phụ tùng
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Nhập tên phụ tùng"
                    className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-sm outline-none focus:border-[#D6A85F]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Danh mục
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none focus:border-[#D6A85F]"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Số lượng
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm({ ...form, quantity: event.target.value })
                      }
                      className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-sm outline-none focus:border-[#D6A85F]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Đơn vị
                    </label>
                    <input
                      value={form.unit}
                      onChange={(event) =>
                        setForm({ ...form, unit: event.target.value })
                      }
                      placeholder="Cái, Bộ..."
                      className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-sm outline-none focus:border-[#D6A85F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Đơn giá (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-sm outline-none focus:border-[#D6A85F]"
                  />
                </div>

                {message && (
                  <p role="alert" className="text-xs text-red-600">
                    {message}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs font-semibold hover:bg-[#F3F4F2]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="cs-btn cs-btn-primary flex-1"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Inventory;