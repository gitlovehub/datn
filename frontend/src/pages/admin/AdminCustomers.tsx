import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  cars: number;
  status: "Hoạt động" | "Tạm khóa";
};

const initialCustomers: Customer[] = [
  {
    id: "KH001",
    name: "Nguyễn Văn An",
    phone: "0901234567",
    email: "nguyenan@gmail.com",
    cars: 2,
    status: "Hoạt động",
  },
  {
    id: "KH002",
    name: "Trần Thị Bình",
    phone: "0912345678",
    email: "tranbinh@gmail.com",
    cars: 1,
    status: "Hoạt động",
  },
  {
    id: "KH003",
    name: "Lê Minh Cường",
    phone: "0987654321",
    email: "lecuong@gmail.com",
    cars: 3,
    status: "Tạm khóa",
  },
  {
    id: "KH004",
    name: "Phạm Thu Hà",
    phone: "0934567890",
    email: "phamha@gmail.com",
    cars: 1,
    status: "Hoạt động",
  },
];

function AdminCustomers() {
  const { confirm } = useAppFeedback();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [message, setMessage] = useState("");

  const activeCustomers = customers.filter(
    (customer) => customer.status === "Hoạt động",
  ).length;

  const lockedCustomers = customers.filter(
    (customer) => customer.status === "Tạm khóa",
  ).length;

  const totalCars = customers.reduce(
    (total, customer) => total + customer.cars,
    0,
  );

  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      customer.id.toLowerCase().includes(keyword) ||
      customer.name.toLowerCase().includes(keyword) ||
      customer.phone.includes(keyword) ||
      customer.email.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "Tất cả" || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (customer: Customer) => {
    const nextStatus =
      customer.status === "Hoạt động" ? "Tạm khóa" : "Hoạt động";

    const confirmed = await confirm({ title: nextStatus === "Tạm khóa" ? "Khóa khách hàng" : "Mở khóa khách hàng", description: `Xác nhận đổi trạng thái tài khoản khách hàng ${customer.name} sang “${nextStatus}”?`, variant: nextStatus === "Tạm khóa" ? "danger" : "info", confirmText: "Xác nhận thay đổi" });

    if (!confirmed) return;

    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? { ...item, status: nextStatus }
          : item,
      ),
    );

    setMessage(
      `${customer.name} đã được ${
        nextStatus === "Tạm khóa" ? "tạm khóa" : "mở khóa"
      }.`,
    );
  };

  const handleResetFilter = () => {
    setSearch("");
    setStatusFilter("Tất cả");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                QUẢN TRỊ HỆ THỐNG / KHÁCH HÀNG
              </p>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Quản lý khách hàng
              </h1>

              <p className="mt-2 text-xs text-[#66717C]">
                Theo dõi thông tin, số lượng xe và trạng thái khách hàng
                trong hệ thống.
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng khách hàng
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {customers.length}
                </p>
                <p className="mt-2 text-xs text-[#66717C]">
                  Khách hàng trong danh sách
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đang hoạt động
                </p>
                <p className="mt-4 text-2xl font-bold text-[#3F7047]">
                  {activeCustomers}
                </p>
                <p className="mt-2 text-xs text-[#66717C]">
                  Khách hàng đang hoạt động
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tạm khóa
                </p>
                <p className="mt-4 text-2xl font-bold text-[#A24A4A]">
                  {lockedCustomers}
                </p>
                <p className="mt-2 text-xs text-[#66717C]">
                  Khách hàng đang bị khóa
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng số xe
                </p>
                <p className="mt-4 text-2xl font-bold">{totalCars}</p>
                <p className="mt-2 text-xs text-[#66717C]">
                  Xe đã đăng ký trong danh sách
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-4 sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  DANH SÁCH
                </p>

                <h2 className="mt-1 text-base font-bold">
                  Khách hàng
                </h2>

                <p className="mt-1 text-xs text-[#8A949E]">
                  Hiển thị {filteredCustomers.length} / {customers.length}{" "}
                  khách hàng
                </p>
              </div>

              <div className="mb-5 flex flex-col gap-3 lg:flex-row">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setMessage("");
                  }}
                  placeholder="Tìm mã KH, tên, số điện thoại, email..."
                  className="w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] lg:flex-1"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setMessage("");
                  }}
                  className="rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] lg:w-[190px]"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Tạm khóa">Tạm khóa</option>
                </select>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="cs-btn cs-btn-secondary"
                >
                  Đặt lại
                </button>
              </div>

              {message && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#DCEBDD] bg-[#EEF7EF] px-4 py-3">
                  <p className="text-xs text-[#3F7047]">{message}</p>
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="text-xs font-semibold text-[#3F7047]"
                  >
                    Đóng
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] text-left">
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Mã KH
                      </th>
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Khách hàng
                      </th>
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Liên hệ
                      </th>
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Số xe
                      </th>
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Trạng thái
                      </th>
                      <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-[#F0F1EF] last:border-b-0 hover:bg-transparent cs-readable-row"
                      >
                        <td className="px-3 py-4 text-xs font-semibold">
                          {customer.id}
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-xs font-semibold">
                            {customer.name}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-xs text-[#66717C]">
                            {customer.phone}
                          </p>
                          <p className="mt-1 text-xs text-[#8A949E]">
                            {customer.email}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-xs text-[#66717C]">
                          {customer.cars} xe
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              customer.status === "Hoạt động"
                                ? "bg-[#EEF7EF] text-[#3F7047]"
                                : "bg-[#FDEEEE] text-[#A24A4A]"
                            }`}
                          >
                            {customer.status}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(customer)}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                              customer.status === "Hoạt động"
                                ? "border-[#F0D6D6] text-[#A24A4A] hover:bg-[#FDEEEE]"
                                : "border-[#DCEBDD] text-[#3F7047] hover:bg-[#EEF7EF]"
                            }`}
                          >
                            {customer.status === "Hoạt động"
                              ? "Khóa"
                              : "Mở khóa"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCustomers.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-[#66717C]">
                      Không tìm thấy khách hàng
                    </p>
                    <p className="mt-2 text-xs text-[#8A949E]">
                      Hãy thử từ khóa khác hoặc thay đổi bộ lọc.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilter}
                      className="cs-btn cs-btn-primary mt-4"
                    >
                      Xóa bộ lọc
                    </button>
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

export default AdminCustomers;
