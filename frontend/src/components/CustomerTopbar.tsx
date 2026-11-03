import { useInAppShell } from "../layouts/ShellContext";
import { Link, useLocation } from "react-router-dom";
import RoleAccountMenu from "./RoleAccountMenu";

function CustomerTopbar() {
  const inShell = useInAppShell();
  const location = useLocation();

  const pageNames: Record<string, string> = {
    "/customer/dashboard": "Dashboard tổng quan",
    "/customer/appointments": "Lịch hẹn",
    "/customer/cars": "Xe của tôi",
    "/quotation": "Báo giá",
    "/payment": "Thanh toán",
    "/invoices": "Hóa đơn",
    "/reviews": "Đánh giá",
    "/account": "Tài khoản",
    "/repair-status": "Theo dõi sửa chữa",
  };

  const currentPage =
    pageNames[location.pathname] || "Khu vực khách hàng";

  if (inShell) return null;

  return (
    <header className="sticky top-0 z-40 flex h-[76px] items-center border-b border-[#E1E4E6] bg-white">
      <Link
        to="/"
        className="ml-4 flex cursor-pointer items-center gap-2 rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-xs font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B] lg:ml-6"
      >
        <span>←</span>
        Trang chủ
      </Link>

      <div className="ml-6 flex min-w-0 items-center gap-5 lg:ml-[274px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              CARSERVICE
            </p>
          </div>

          <p className="mt-1 text-[13px] font-bold text-[#20252B]">
            {currentPage}
          </p>
        </div>
      </div>

      <div className="ml-auto mr-6">
        <RoleAccountMenu />
      </div>
    </header>
  );
}

export default CustomerTopbar;