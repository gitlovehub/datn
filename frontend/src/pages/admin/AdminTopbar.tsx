import { useInAppShell } from "../../layouts/ShellContext";

import { Link, useLocation } from "react-router-dom";
import RoleAccountMenu from "../../components/RoleAccountMenu";

const pageNames: Record<string, string> = {
  "/admin": "Tổng quan hệ thống",
  "/admin/accounts": "Tài khoản & nhân viên",
  "/admin/customers": "Quản lý khách hàng",
  "/admin/appointments": "Quản lý lịch hẹn",
  "/admin/services": "Quản lý dịch vụ",
  "/admin/maintenance-packages": "Gói bảo dưỡng",
  "/admin/inventory": "Kho vật tư",
  "/admin/reports": "Báo cáo & thống kê",
};

function AdminTopbar() {
  const inShell = useInAppShell();
  const location = useLocation();

  const pageName =
    pageNames[location.pathname] ||
    Object.entries(pageNames).find(
      ([path]) =>
        path !== "/admin" &&
        location.pathname.startsWith(`${path}/`),
    )?.[1] ||
    "Không gian quản trị";

  if (inShell) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E1E4E6] bg-white">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
            QUẢN TRỊ HỆ THỐNG
          </p>

          <h1 className="mt-1 truncate text-sm font-bold text-[#20252B] sm:text-base">
            {pageName}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="hidden rounded-xl px-3 py-2 text-xs font-medium text-[#66717C] transition hover:bg-[#F7F7F5] hover:text-[#20252B] sm:block"
          >
            Trang chủ
          </Link>

          <RoleAccountMenu />
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
