import AdminHubNav from "../../components/AdminHubNav";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type Report = {
  title: string;
  value: string;
  description: string;
  change: string;
};

type ServiceReport = {
  name: string;
  quantity: number;
  revenue: number;
};

const monthlyReports: Record<string, Report[]> = {
  "2026-10": [
    {
      title: "Doanh thu tháng",
      value: "185.500.000 đ",
      description: "Tổng doanh thu dịch vụ trong tháng.",
      change: "+12,5%",
    },
    {
      title: "Lịch hẹn",
      value: "128",
      description: "Tổng số lịch hẹn trong tháng.",
      change: "+8,2%",
    },
    {
      title: "Phiếu sửa chữa",
      value: "96",
      description: "Số phiếu sửa chữa đã tiếp nhận.",
      change: "+15,4%",
    },
    {
      title: "Khách hàng",
      value: "74",
      description: "Khách hàng đã sử dụng dịch vụ.",
      change: "+6,8%",
    },
  ],
  "2026-09": [
    {
      title: "Doanh thu tháng",
      value: "164.900.000 đ",
      description: "Tổng doanh thu dịch vụ trong tháng.",
      change: "+9,1%",
    },
    {
      title: "Lịch hẹn",
      value: "118",
      description: "Tổng số lịch hẹn trong tháng.",
      change: "+5,4%",
    },
    {
      title: "Phiếu sửa chữa",
      value: "83",
      description: "Số phiếu sửa chữa đã tiếp nhận.",
      change: "+10,2%",
    },
    {
      title: "Khách hàng",
      value: "69",
      description: "Khách hàng đã sử dụng dịch vụ.",
      change: "+4,5%",
    },
  ],
  "2026-08": [
    {
      title: "Doanh thu tháng",
      value: "151.200.000 đ",
      description: "Tổng doanh thu dịch vụ trong tháng.",
      change: "+7,3%",
    },
    {
      title: "Lịch hẹn",
      value: "105",
      description: "Tổng số lịch hẹn trong tháng.",
      change: "+6,1%",
    },
    {
      title: "Phiếu sửa chữa",
      value: "75",
      description: "Số phiếu sửa chữa đã tiếp nhận.",
      change: "+8,6%",
    },
    {
      title: "Khách hàng",
      value: "63",
      description: "Khách hàng đã sử dụng dịch vụ.",
      change: "+3,7%",
    },
  ],
};

const monthlyServiceReports: Record<string, ServiceReport[]> = {
  "2026-10": [
    { name: "Bảo dưỡng định kỳ", quantity: 42, revenue: 63000000 },
    { name: "Kiểm tra phanh", quantity: 28, revenue: 35000000 },
    { name: "Sửa chữa điều hòa", quantity: 16, revenue: 48500000 },
    { name: "Thay dầu động cơ", quantity: 34, revenue: 22000000 },
  ],
  "2026-09": [
    { name: "Bảo dưỡng định kỳ", quantity: 38, revenue: 57000000 },
    { name: "Kiểm tra phanh", quantity: 24, revenue: 30000000 },
    { name: "Sửa chữa điều hòa", quantity: 14, revenue: 42000000 },
    { name: "Thay dầu động cơ", quantity: 31, revenue: 20500000 },
  ],
  "2026-08": [
    { name: "Bảo dưỡng định kỳ", quantity: 35, revenue: 52500000 },
    { name: "Kiểm tra phanh", quantity: 22, revenue: 27500000 },
    { name: "Sửa chữa điều hòa", quantity: 12, revenue: 36000000 },
    { name: "Thay dầu động cơ", quantity: 28, revenue: 18000000 },
  ],
};

const moneyFormatter = new Intl.NumberFormat("vi-VN");

function formatPrice(value: number) {
  return `${moneyFormatter.format(value)} đ`;
}

function Reports() {
  const [selectedMonth, setSelectedMonth] = useState("2026-10");

  const reports = monthlyReports[selectedMonth] ?? [];
  const serviceReports = monthlyServiceReports[selectedMonth] ?? [];

  const totalServiceRevenue = useMemo(
    () => serviceReports.reduce((sum, service) => sum + service.revenue, 0),
    [serviceReports],
  );

  const totalServiceQuantity = useMemo(
    () => serviceReports.reduce((sum, service) => sum + service.quantity, 0),
    [serviceReports],
  );

  const maxRevenue = Math.max(
    ...serviceReports.map((service) => service.revenue),
    1,
  );

  const maxQuantity = Math.max(
    ...serviceReports.map((service) => service.quantity),
    1,
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
                    BC
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Báo cáo & thống kê
                    </h1>

                    <p className="mt-1 text-xs text-[#66717C]">
                      Theo dõi doanh thu, lịch hẹn và hoạt động của gara.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs font-semibold transition hover:bg-[#F3F4F2]"
                >
                  In báo cáo
                </button>
              </div>
            </div>

            <AdminHubNav />

            <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARA / BÁO CÁO
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Tổng quan hoạt động
                  </h2>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    Chọn kỳ báo cáo để xem số liệu tương ứng.
                  </p>
                </div>

                <label className="block text-xs font-semibold">
                  Kỳ báo cáo
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] sm:w-48"
                  >
                    <option value="2026-10">Tháng 10/2026</option>
                    <option value="2026-09">Tháng 09/2026</option>
                    <option value="2026-08">Tháng 08/2026</option>
                  </select>
                </label>
              </div>
            </section>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {reports.map((report) => (
                <article
                  key={report.title}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                    {report.title}
                  </p>

                  <p className="mt-4 break-words text-2xl font-bold">
                    {report.value}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs leading-4 text-[#8A949E]">
                      {report.description}
                    </p>

                    <span className="rounded-full bg-[#F3E8D2] px-2.5 py-1 text-xs font-semibold text-[#3A3020]">
                      {report.change}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  TỔNG HỢP DỊCH VỤ
                </p>
                <p className="mt-4 text-xs text-[#66717C]">
                  Tổng doanh thu của các dịch vụ trong danh sách thống kê
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatPrice(totalServiceRevenue)}
                </p>
              </article>

              <article className="rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  LƯỢT SỬ DỤNG
                </p>
                <p className="mt-4 text-xs text-[#66717C]">
                  Tổng lượt sử dụng của các dịch vụ trong danh sách thống kê
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {new Intl.NumberFormat("vi-VN").format(totalServiceQuantity)}
                </p>
              </article>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E1E4E6] bg-white">
                <div className="border-b border-[#EEF0F2] px-5 py-5 sm:px-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    SERVICE REPORT
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Hiệu quả theo dịch vụ
                  </h2>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    So sánh doanh thu của từng dịch vụ.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  {serviceReports.map((service) => (
                    <div key={service.name}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold">
                            {service.name}
                          </p>
                          <p className="mt-1 text-xs text-[#8A949E]">
                            {service.quantity} lượt sử dụng
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-bold">
                          {formatPrice(service.revenue)}
                        </p>
                      </div>

                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]"
                        aria-label={`Doanh thu ${service.name}`}
                      >
                        <div
                          className="h-full rounded-full bg-[#D6A85F] transition-all"
                          style={{
                            width: `${(service.revenue / maxRevenue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E1E4E6] bg-white">
                <div className="border-b border-[#EEF0F2] px-5 py-5 sm:px-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARAGE OVERVIEW
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Tần suất sử dụng dịch vụ
                  </h2>
                  <p className="mt-1 text-xs text-[#8A949E]">
                    So sánh số lượt sử dụng trong kỳ được chọn.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  {serviceReports.map((service) => (
                    <div key={service.name}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold">
                          {service.name}
                        </p>
                        <p className="text-xs font-bold">
                          {service.quantity} lượt
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                        <div
                          className="h-full rounded-full bg-[#1F2933] transition-all"
                          style={{
                            width: `${(service.quantity / maxQuantity) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl bg-[#F7F7F5] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      LƯU Ý
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#66717C]">
                      Các số liệu trên là dữ liệu mẫu phục vụ giao diện. Cần
                      kết nối API báo cáo để sử dụng số liệu thực tế từ backend.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/admin/appointments"
                className="text-xs font-semibold text-[#66717C] transition hover:text-[#20252B]"
              >
                Quản lý lịch hẹn →
              </Link>
              <Link
                to="/admin/inventory"
                className="text-xs font-semibold text-[#66717C] transition hover:text-[#20252B]"
              >
                Quản lý kho vật tư →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Reports;