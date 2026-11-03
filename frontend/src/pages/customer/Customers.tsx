import { useState } from "react";
import { Link } from "react-router-dom";
import { getUserDisplayName } from "../auth/auth";

function Customers() {
  const [address, setAddress] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const customers = [
    {
      id: 1,
      name: "Nguyễn Tiến Hiền",
      phone: "0901234567",
      email: "nguyentienhien@gmail.com",
      address: "Cầu Giấy, Hà Nội",
    },
    {
      id: 2,
      name: "Phùng Đức Anh",
      phone: "0912345678",
      email: "phungducanh@gmail.com",
      address: "Cổ Nhuế, Hà Nội",
    },
    {
      id: 3,
      name: "Bùi Việt",
      phone: "0987654321",
      email: "buiviet@gmail.com",
      address: "Đống Đa, Hà Nội",
    },
  ];

  const filteredCustomers = customers.filter((customer) => {
    return address === "" || customer.address === address;
  });

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">

      {/* HEADER */}
      <header className="border-b border-[#e1e4e7] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">

          {/* LOGO */}
          <Link to="/customers" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-xs font-bold text-white">
              CS
            </div>

            <div>
              <p className="text-[14px] font-bold">
                CarService
              </p>

              <p className="text-xs text-[#8a949e]">
                Quản lý dịch vụ ô tô
              </p>
            </div>
          </Link>

          {/* ACCOUNT */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9ecef] text-xs font-bold">
              NV
            </div>

            <div>
              <p className="text-[12px] font-semibold">
                {getUserDisplayName(user)}
              </p>

              <p className="text-xs text-[#8a949e]">
                Tài khoản · Cố vấn dịch vụ
              </p>
            </div>

            <span className="ml-1 text-[14px] text-[#7b858f]">
              ⌄
            </span>
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="mx-auto max-w-[1200px] px-6 pt-6">

        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-5">

          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              KHÔNG GIAN LÀM VIỆC
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-xs font-bold text-white">
                CV
              </div>

              <div>
                <p className="text-[13px] font-bold">
                  Cố vấn dịch vụ
                </p>

                <p className="text-xs text-[#8a949e]">
                  Giao diện nội bộ
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              CHỨC NĂNG
            </p>

            <div className="flex flex-wrap gap-2">

              <Link
                to="/customers"
                className="rounded-lg bg-[#20252b] px-4 py-2.5 text-xs font-semibold text-white"
              >
                Khách hàng
              </Link>

              <Link
                to="/customer-cars"
                className="rounded-lg border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs font-medium hover:bg-[#f5f5f5]"
              >
                Xe của khách
              </Link>

              <Link
                to="/appointments"
                className="rounded-lg border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs font-medium hover:bg-[#f5f5f5]"
              >
                Lịch hẹn
              </Link>

              <Link
                to="/repair-status"
                className="rounded-lg border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs font-medium hover:bg-[#f5f5f5]"
              >
                Phiếu sửa chữa
              </Link>

              <Link
                to="/quotation"
                className="rounded-lg border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs font-medium hover:bg-[#f5f5f5]"
              >
                Báo giá
              </Link>

              <button
                type="button"
                className="rounded-lg border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs font-medium hover:bg-[#f5f5f5]"
              >
                MỞ CHECKLIST REVIEW & TEST
              </button>

            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <main className="pb-10">

          {/* TITLE */}
          <div className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[#8a949e]">
              GARA / KHÁCH HÀNG
            </p>

            <h1 className="text-[28px] font-bold">
              Quản lý khách hàng
            </h1>

            <p className="mt-2 text-[12px] text-[#7b858f]">
              Tìm kiếm và quản lý thông tin khách hàng tại gara.
            </p>
          </div>

          {/* ADD CUSTOMER */}
          <div className="mb-8 flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Thêm khách hàng
            </button>
          </div>

          {/* SEARCH */}
          <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">

            <h2 className="mb-4 text-[15px] font-bold">
              Tìm kiếm khách hàng
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <select
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
              >
                <option value="">
                  Tất cả địa chỉ
                </option>

                <option value="Cầu Giấy, Hà Nội">
                  Cầu Giấy, Hà Nội
                </option>

                <option value="Cổ Nhuế, Hà Nội">
                  Cổ Nhuế, Hà Nội
                </option>

                <option value="Đống Đa, Hà Nội">
                  Đống Đa, Hà Nội
                </option>
              </select>

              <button
                type="button"
                className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
              >
                Tìm kiếm
              </button>

            </div>

            <p className="mt-4 text-xs text-[#8a949e]">
              Có thể tìm kiếm nhanh theo số điện thoại của khách hàng.
            </p>
          </div>

          {/* CUSTOMER TABLE */}
          <div className="rounded-xl border border-[#e1e4e7] bg-white">

            <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">

              <h2 className="text-[15px] font-bold">
                Danh sách khách hàng
              </h2>

              <span className="text-xs text-[#8a949e]">
                {filteredCustomers.length} khách hàng
              </span>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b border-[#e1e4e7] text-xs uppercase text-[#8a949e]">

                    <th className="px-6 py-4">
                      STT
                    </th>

                    <th className="px-6 py-4">
                      Khách hàng
                    </th>

                    <th className="px-6 py-4">
                      Số điện thoại
                    </th>

                    <th className="px-6 py-4">
                      Email
                    </th>

                    <th className="px-6 py-4">
                      Địa chỉ
                    </th>

                    <th className="px-6 py-4">
                      Thao tác
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredCustomers.map((customer, index) => (

                    <tr
                      key={customer.id}
                      className="border-b border-[#eef0f2] last:border-b-0"
                    >

                      <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                        {index + 1}
                      </td>

                      <td className="px-6 py-5 text-[12px] font-semibold">
                        {customer.name}
                      </td>

                      <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                        {customer.phone}
                      </td>

                      <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                        {customer.email}
                      </td>

                      <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                        {customer.address}
                      </td>

                      <td className="px-6 py-5">

                        <Link
                          to="/customer-cars"
                          className="inline-block rounded-md bg-[#20252b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#111519]"
                        >
                          Xe
                        </Link>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-8 text-center text-xs text-[#8a949e]">
            © CarService · Quản lý dịch vụ ô tô
          </div>

        </main>
      </div>
    </div>
  );
}

export default Customers;