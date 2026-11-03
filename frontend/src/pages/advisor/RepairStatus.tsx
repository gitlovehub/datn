import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useMemo, useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

type Repair = {
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
  technician: string;
  startDate: string;
  status: string;
};

const initialRepairs: Repair[] = [
  {
    id: "SC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    technician: "Trần Văn Nam",
    startDate: "24/06/2026",
    status: "Đang sửa chữa",
  },
  {
    id: "SC-002",
    customer: "Phùng Đức Anh",
    car: "Honda City",
    plate: "30F-678.90",
    service: "Kiểm tra tổng quát",
    technician: "Lê Minh Tuấn",
    startDate: "25/06/2026",
    status: "Chờ sửa chữa",
  },
  {
    id: "SC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "29A-456.78",
    service: "Thay dầu động cơ",
    technician: "Nguyễn Văn Hùng",
    startDate: "26/06/2026",
    status: "Đã hoàn thành",
  },
];

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

const statuses = ["Chờ sửa chữa", "Đang sửa chữa", "Đã hoàn thành"];

const emptyForm = {
  customer: "",
  car: "",
  plate: "",
  service: "",
  technician: "",
  startDate: new Date().toLocaleDateString("vi-VN"),
  status: "Chờ sửa chữa",
};

function RepairStatus() {
  const { confirm } = useAppFeedback();
  const [repairs, setRepairs] = useState<Repair[]>(initialRepairs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const filteredRepairs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return repairs.filter((repair) => {
      const matchSearch = [
        repair.id,
        repair.customer,
        repair.plate,
        repair.car,
        repair.technician,
        repair.service,
      ].some((value) => value.toLowerCase().includes(keyword));

      return matchSearch && (!status || repair.status === status);
    });
  }, [repairs, search, status]);

  const completedCount = repairs.filter(
    (repair) => repair.status === "Đã hoàn thành",
  ).length;

  const repairingCount = repairs.filter(
    (repair) => repair.status === "Đang sửa chữa",
  ).length;

  const waitingCount = repairs.filter(
    (repair) => repair.status === "Chờ sửa chữa",
  ).length;

  const getStatusClass = (value: string) => {
    if (value === "Đã hoàn thành") {
      return "bg-[#EEF7F0] text-[#39734A]";
    }

    if (value === "Đang sửa chữa") {
      return "bg-[#F3E8D2] text-[#5B4630]";
    }

    return "bg-[#F3F4F2] text-[#66717C]";
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (repair: Repair) => {
    setEditingId(repair.id);
    setForm({
      customer: repair.customer,
      car: repair.car,
      plate: repair.plate,
      service: repair.service,
      technician: repair.technician,
      startDate: repair.startDate,
      status: repair.status,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (
      !form.customer.trim() ||
      !form.car.trim() ||
      !form.plate.trim() ||
      !form.service.trim() ||
      !form.technician.trim() ||
      !form.startDate.trim()
    ) {
      setFormError("Vui lòng nhập đầy đủ thông tin phiếu sửa chữa.");
      return;
    }

    if (editingId) {
      setRepairs((current) =>
        current.map((repair) =>
          repair.id === editingId
            ? { ...repair, ...form }
            : repair,
        ),
      );
    } else {
      const nextNumber =
        repairs.reduce((max, repair) => {
          const number = Number(repair.id.replace("SC-", ""));
          return Number.isNaN(number) ? max : Math.max(max, number);
        }, 0) + 1;

      const newRepair: Repair = {
        id: `SC-${String(nextNumber).padStart(3, "0")}`,
        ...form,
      };

      setRepairs((current) => [newRepair, ...current]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = async (repair: Repair) => {
    if (!await confirm({ title: "Xóa phiếu", description: `Bạn có chắc muốn xóa phiếu #${repair.id}?`, variant: "danger", confirmText: "Xóa phiếu" })) {
      return;
    }

    setRepairs((current) =>
      current.filter((item) => item.id !== repair.id),
    );

    if (selectedRepair?.id === repair.id) {
      setSelectedRepair(null);
    }
  };

  const updateStatus = (id: string, value: string) => {
    setRepairs((current) =>
      current.map((repair) =>
        repair.id === id ? { ...repair, status: value } : repair,
      ),
    );

    setSelectedRepair((current) =>
      current?.id === id ? { ...current, status: value } : current,
    );
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
                GARA / SỬA CHỮA
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Trạng thái sửa chữa
                  </h2>
                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Theo dõi và cập nhật tiến độ sửa chữa xe của khách hàng.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Tạo phiếu sửa chữa
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "PHIẾU SỬA CHỮA",
                  value: repairs.length,
                  description: "Tổng số phiếu",
                },
                {
                  label: "ĐANG SỬA",
                  value: repairingCount,
                  description: "Đang xử lý tại gara",
                },
                {
                  label: "HOÀN THÀNH",
                  value: completedCount,
                  description: "Đã hoàn tất sửa chữa",
                },
                {
                  label: "CHỜ SỬA",
                  value: waitingCount,
                  description: "Chưa bắt đầu sửa chữa",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:-translate-y-1 hover:border-[#D6A85F]"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-[24px] font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="mb-5">
                <p className="text-[13px] font-semibold">
                  Tìm kiếm phiếu sửa chữa
                </p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Tìm theo mã phiếu, khách hàng, biển số hoặc kỹ thuật viên.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mã phiếu, khách hàng, biển số..."
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
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold">
                    Danh sách phiếu sửa chữa
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    Theo dõi tiến độ xử lý xe
                  </p>
                </div>
                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-xs font-semibold text-[#66717C]">
                  {filteredRepairs.length} phiếu
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      {[
                        "MÃ PHIẾU",
                        "KHÁCH HÀNG",
                        "XE",
                        "DỊCH VỤ",
                        "KỸ THUẬT VIÊN",
                        "NGÀY NHẬN",
                        "TRẠNG THÁI",
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
                    {filteredRepairs.map((repair) => (
                      <tr
                        key={repair.id}
                        className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-xs font-bold">
                            {repair.id}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold">
                          {repair.customer}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold">
                            {repair.car}
                          </p>
                          <p className="mt-1 text-xs text-[#8A949E]">
                            {repair.plate}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {repair.service}
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {repair.technician}
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {repair.startDate}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={repair.status}
                            onChange={(event) =>
                              updateStatus(repair.id, event.target.value)
                            }
                            className={`rounded-lg border-0 px-3 py-2 text-xs font-semibold outline-none ${getStatusClass(repair.status)}`}
                          >
                            {statuses.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRepair(repair)}
                              className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-xs font-semibold hover:border-[#D6A85F]"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(repair)}
                              className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-xs font-semibold hover:border-[#D6A85F]"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(repair)}
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

              {filteredRepairs.length === 0 && (
                <div className="px-5 py-14 text-center">
                  <p className="text-[12px] font-semibold">
                    Không tìm thấy phiếu sửa chữa
                  </p>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    Thử thay đổi từ khóa hoặc trạng thái.
                  </p>
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
                  {editingId ? "Cập nhật phiếu sửa chữa" : "Tạo phiếu sửa chữa"}
                </h3>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Điền thông tin xe và tiến độ sửa chữa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#66717C] hover:bg-[#F3F4F2]"
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
                  Tên xe *
                  <input
                    required
                    value={form.car}
                    onChange={(event) =>
                      setForm({ ...form, car: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Ví dụ: Toyota Vios"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Biển số *
                  <input
                    required
                    value={form.plate}
                    onChange={(event) =>
                      setForm({ ...form, plate: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="30A-123.45"
                  />
                </label>

                <label className="text-xs font-semibold">
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
                  Kỹ thuật viên *
                  <input
                    required
                    value={form.technician}
                    onChange={(event) =>
                      setForm({ ...form, technician: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Tên kỹ thuật viên"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Ngày nhận xe *
                  <input
                    required
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="dd/mm/yyyy"
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
                  {editingId ? "Lưu thay đổi" : "Tạo phiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRepair && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A949E]">
                  CHI TIẾT PHIẾU
                </p>
                <h3 className="mt-1 text-lg font-bold">{selectedRepair.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepair(null)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-4 p-6">
              {[
                ["Khách hàng", selectedRepair.customer],
                ["Xe", selectedRepair.car],
                ["Biển số", selectedRepair.plate],
                ["Dịch vụ", selectedRepair.service],
                ["Kỹ thuật viên", selectedRepair.technician],
                ["Ngày nhận", selectedRepair.startDate],
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

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#8A949E]">Trạng thái</span>
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${getStatusClass(selectedRepair.status)}`}
                >
                  {selectedRepair.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  openEditModal(selectedRepair);
                  setSelectedRepair(null);
                }}
                className="w-full rounded-xl bg-[#1F2933] px-4 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
              >
                Chỉnh sửa phiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairStatus;
