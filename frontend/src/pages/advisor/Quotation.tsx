import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useMemo, useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

type QuotationItem = {
  id: string;
  customer: string;
  phone: string;
  car: string;
  service: string;
  date: string;
  amount: number;
  status: string;
};

const initialQuotations: QuotationItem[] = [
  {
    id: "BG-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    service: "Bảo dưỡng định kỳ",
    date: "03/10/2026",
    amount: 3850000,
    status: "Chờ duyệt",
  },
  {
    id: "BG-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    service: "Kiểm tra và thay má phanh",
    date: "03/10/2026",
    amount: 2450000,
    status: "Đã duyệt",
  },
  {
    id: "BG-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    service: "Sửa chữa điều hòa",
    date: "02/10/2026",
    amount: 4200000,
    status: "Đã gửi",
  },
];

const statuses = ["Chờ duyệt", "Đã gửi", "Đã duyệt"];

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

const emptyForm = {
  customer: "",
  phone: "",
  car: "",
  service: "",
  date: new Date().toLocaleDateString("vi-VN"),
  amount: "",
  status: "Chờ duyệt",
};

function formatMoney(amount: number) {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function Quotation() {
  const { confirm } = useAppFeedback();
  const [quotations, setQuotations] =
    useState<QuotationItem[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const filteredQuotations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return quotations.filter((quotation) => {
      const matchSearch = [
        quotation.id,
        quotation.customer,
        quotation.phone,
        quotation.car,
        quotation.service,
      ].some((value) => value.toLowerCase().includes(keyword));

      return matchSearch && (!status || quotation.status === status);
    });
  }, [quotations, search, status]);

  const waitingCount = quotations.filter(
    (quotation) => quotation.status === "Chờ duyệt",
  ).length;

  const approvedCount = quotations.filter(
    (quotation) => quotation.status === "Đã duyệt",
  ).length;

  const totalAmount = quotations.reduce(
    (sum, quotation) => sum + quotation.amount,
    0,
  );

  const getStatusClass = (value: string) => {
    if (value === "Đã duyệt") {
      return "bg-[#EEF7F0] text-[#39734A]";
    }

    if (value === "Chờ duyệt") {
      return "bg-[#F5F1E8] text-[#876D35]";
    }

    return "bg-[#EEF0F2] text-[#5F6871]";
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (quotation: QuotationItem) => {
    setEditingId(quotation.id);
    setForm({
      customer: quotation.customer,
      phone: quotation.phone,
      car: quotation.car,
      service: quotation.service,
      date: quotation.date,
      amount: String(quotation.amount),
      status: quotation.status,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const amount = Number(form.amount);

    if (
      !form.customer.trim() ||
      !form.phone.trim() ||
      !form.car.trim() ||
      !form.service.trim() ||
      !form.date.trim()
    ) {
      setFormError("Vui lòng nhập đầy đủ thông tin báo giá.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Tổng tiền phải lớn hơn 0.");
      return;
    }

    if (editingId) {
      setQuotations((current) =>
        current.map((quotation) =>
          quotation.id === editingId
            ? { ...quotation, ...form, amount }
            : quotation,
        ),
      );
    } else {
      const nextNumber =
        quotations.reduce((max, quotation) => {
          const number = Number(quotation.id.replace("BG-", ""));
          return Number.isNaN(number) ? max : Math.max(max, number);
        }, 0) + 1;

      const newQuotation: QuotationItem = {
        id: `BG-${String(nextNumber).padStart(3, "0")}`,
        ...form,
        amount,
      };

      setQuotations((current) => [newQuotation, ...current]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = async (quotation: QuotationItem) => {
    if (!await confirm({ title: "Xóa báo giá", description: `Xóa báo giá #${quotation.id} khỏi danh sách hiện tại?`, variant: "danger", confirmText: "Xóa báo giá" })) {
      return;
    }

    setQuotations((current) =>
      current.filter((item) => item.id !== quotation.id),
    );

    if (selectedQuotation?.id === quotation.id) {
      setSelectedQuotation(null);
    }
  };

  const updateStatus = (id: string, value: string) => {
    setQuotations((current) =>
      current.map((quotation) =>
        quotation.id === id ? { ...quotation, status: value } : quotation,
      ),
    );

    setSelectedQuotation((current) =>
      current?.id === id ? { ...current, status: value } : current,
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9299]">
                GARA / BÁO GIÁ
              </p>

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Quản lý báo giá
                  </h2>
                  <p className="mt-1 text-[12px] text-[#8A9299]">
                    Tạo, theo dõi và quản lý báo giá dịch vụ sửa chữa cho khách
                    hàng.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Tạo báo giá
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "TỔNG BÁO GIÁ",
                  value: quotations.length,
                  description: "Báo giá trong danh sách",
                },
                {
                  label: "CHỜ DUYỆT",
                  value: waitingCount,
                  description: "Chờ khách hàng duyệt",
                },
                {
                  label: "ĐÃ DUYỆT",
                  value: approvedCount,
                  description: "Báo giá đã được duyệt",
                },
                {
                  label: "TỔNG GIÁ TRỊ",
                  value:
                    totalAmount >= 1000000
                      ? `${(totalAmount / 1000000).toLocaleString("vi-VN", {
                          maximumFractionDigits: 2,
                        })}M`
                      : formatMoney(totalAmount),
                  description: "Tổng giá trị báo giá",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-4 transition hover:-translate-y-1 hover:border-[#D6A85F]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8A9299]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[22px] font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-[#8A9299]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold">
                  Tìm kiếm báo giá
                </p>
                <p className="mt-1 text-xs text-[#8A9299]">
                  Tìm theo khách hàng, biển số, mã báo giá hoặc dịch vụ.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Khách hàng, biển số hoặc mã báo giá..."
                  className={inputClass}
                />

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả trạng thái</option>
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
                    setStatus("");
                  }}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-3 border-b border-[#E1E4E6] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[13px] font-semibold">
                    Danh sách báo giá
                  </p>
                  <p className="mt-1 text-xs text-[#8A9299]">
                    Báo giá dịch vụ dành cho khách hàng
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-xs font-semibold text-[#66717C]">
                  {filteredQuotations.length} báo giá
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      {[
                        "MÃ BÁO GIÁ",
                        "KHÁCH HÀNG",
                        "XE",
                        "DỊCH VỤ",
                        "NGÀY TẠO",
                        "TỔNG TIỀN",
                        "TRẠNG THÁI",
                        "THAO TÁC",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-xs font-semibold text-[#8A9299]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr
                        key={quotation.id}
                        className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold">
                            {quotation.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-semibold">
                            {quotation.customer}
                          </p>
                          <p className="mt-1 text-xs text-[#8A9299]">
                            {quotation.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[12px]">
                          {quotation.car}
                        </td>

                        <td className="px-5 py-4 text-[12px]">
                          {quotation.service}
                        </td>

                        <td className="px-5 py-4 text-[12px]">
                          {quotation.date}
                        </td>

                        <td className="px-5 py-4 text-[12px] font-bold">
                          {formatMoney(quotation.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={quotation.status}
                            onChange={(event) =>
                              updateStatus(quotation.id, event.target.value)
                            }
                            className={`rounded-lg border-0 px-3 py-2 text-xs font-semibold outline-none ${getStatusClass(quotation.status)}`}
                          >
                            {statuses.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedQuotation(quotation)}
                              className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-xs font-semibold hover:border-[#D6A85F]"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(quotation)}
                              className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-xs font-semibold hover:border-[#D6A85F]"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(quotation)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredQuotations.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold">
                    Không tìm thấy báo giá
                  </p>
                  <p className="mt-1 text-xs text-[#8A9299]">
                    Thử thay đổi từ khóa hoặc trạng thái.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs font-semibold">Quy trình báo giá</p>
              <p className="mt-1 text-xs leading-5 text-[#7B858F]">
                Cố vấn tạo báo giá dựa trên tình trạng xe, gửi cho khách hàng
                và theo dõi trạng thái phê duyệt trước khi thực hiện sửa chữa.
              </p>
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
                  {editingId ? "Cập nhật báo giá" : "Tạo báo giá mới"}
                </h3>
                <p className="mt-1 text-xs text-[#8A9299]">
                  Nhập thông tin khách hàng và chi phí dịch vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold">
                  Tên khách hàng *
                  <input
                    required
                    value={form.customer}
                    onChange={(event) =>
                      setForm({ ...form, customer: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập tên khách hàng"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Số điện thoại *
                  <input
                    required
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập số điện thoại"
                  />
                </label>

                <label className="text-xs font-semibold sm:col-span-2">
                  Xe và biển số *
                  <input
                    required
                    value={form.car}
                    onChange={(event) =>
                      setForm({ ...form, car: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Toyota Camry - 30A-12345"
                  />
                </label>

                <label className="text-xs font-semibold sm:col-span-2">
                  Dịch vụ *
                  <input
                    required
                    value={form.service}
                    onChange={(event) =>
                      setForm({ ...form, service: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Tên dịch vụ sửa chữa"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Ngày tạo *
                  <input
                    required
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="dd/mm/yyyy"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Tổng tiền (VNĐ) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1000"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="3850000"
                  />
                </label>

                <label className="text-xs font-semibold sm:col-span-2">
                  Trạng thái
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#EEF0F2] pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
                >
                  {editingId ? "Lưu thay đổi" : "Tạo báo giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedQuotation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A9299]">
                  CHI TIẾT BÁO GIÁ
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  {selectedQuotation.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuotation(null)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-4 p-6">
              {[
                ["Khách hàng", selectedQuotation.customer],
                ["Số điện thoại", selectedQuotation.phone],
                ["Xe", selectedQuotation.car],
                ["Dịch vụ", selectedQuotation.service],
                ["Ngày tạo", selectedQuotation.date],
                ["Tổng tiền", formatMoney(selectedQuotation.amount)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-[#EEF0F2] pb-3"
                >
                  <span className="text-xs text-[#8A9299]">{label}</span>
                  <span className="text-right text-xs font-semibold">
                    {value}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#8A9299]">Trạng thái</span>
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${getStatusClass(selectedQuotation.status)}`}
                >
                  {selectedQuotation.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  openEditModal(selectedQuotation);
                  setSelectedQuotation(null);
                }}
                className="w-full rounded-xl bg-[#1F2933] px-4 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
              >
                Chỉnh sửa báo giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Quotation;
