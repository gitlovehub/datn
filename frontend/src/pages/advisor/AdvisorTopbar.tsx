import { useInAppShell } from "../../layouts/ShellContext";
import { Link, useLocation } from "react-router-dom";
import RoleAccountMenu from "../../components/RoleAccountMenu";

const pageNames: Record<string, string> = {
  "/advisor/customers": "Khách hàng",
  "/advisor/customer-cars": "Xe khách hàng",
  "/advisor/appointments": "Lịch hẹn",
  "/advisor/repair-status": "Trạng thái sửa chữa",
  "/advisor/quotation": "Báo giá",
};

function AdvisorTopbar() {
  const inShell = useInAppShell();
  const location = useLocation();

  const pageName = pageNames[location.pathname] ?? "Không gian làm việc";

  if (inShell) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E1E4E6] bg-white lg:ml-[250px]">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
            CỐ VẤN DỊCH VỤ
          </p>

          <h1 className="mt-1.5 truncate text-[16px] font-bold text-[#20252B]">
            {pageName}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="hidden rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#E1E4E6] hover:bg-[#F7F7F5] hover:text-[#20252B] sm:block"
          >
            Trang chủ
          </Link>

          <RoleAccountMenu />
        </div>
      </div>
    </header>
  );
}

export default AdvisorTopbar;