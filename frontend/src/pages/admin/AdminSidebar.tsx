import { useAppFeedback } from "../../components/ui/feedbackContext";
import { useInAppShell } from "../../layouts/ShellContext";
import { logout } from "../auth/auth";

import { Link, useLocation } from "react-router-dom";
import BrandLogo from "../../components/common/BrandLogo";
import { getUserDisplayName } from "../../pages/auth/auth";

const menuItems = [
  {
    label: "Tổng quan",
    path: "/admin",
    icon: "⌂",
  },
  {
    label: "Tài khoản & nhân viên",
    path: "/admin/accounts",
    icon: "♙",
  },
  {
    label: "Khách hàng",
    path: "/admin/customers",
    icon: "◉",
  },
  {
    label: "Lịch hẹn",
    path: "/admin/appointments",
    icon: "▣",
  },
  {
    label: "Lịch làm việc",
    path: "/admin/working-hours",
    icon: "◷",
  },
  {
    label: "Dịch vụ",
    path: "/admin/services",
    icon: "◇",
  },
  {
    label: "Gói bảo dưỡng",
    path: "/admin/maintenance-packages",
    icon: "◈",
  },
  {
    label: "Kho vật tư",
    path: "/admin/inventory",
    icon: "▰",
  },
  {
    label: "Báo cáo",
    path: "/admin/reports",
    icon: "▤",
  },
];

function AdminSidebar() {
  const { confirm } = useAppFeedback();
  const inShell = useInAppShell();
  const location = useLocation();

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const handleLogout = async () => {
    const confirmed = await confirm({ title: "Đăng xuất", description: "Kết thúc phiên làm việc quản trị và quay về trang đăng nhập?", confirmText: "Đăng xuất" });

    if (!confirmed) return;

    void logout();
  };

  if (inShell) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] bg-[#1F2933] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <BrandLogo to="/admin" theme="dark" subtitle="Quản trị hệ thống" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[#AEB8C1]">
            QUẢN TRỊ HỆ THỐNG
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active =
                item.path === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition ${
                    active
                      ? "bg-[#F3E8D2] font-semibold text-[#20252B]"
                      : "font-medium text-[#D5D9DC] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#D6A85F]" />
                  )}

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition ${
                      active
                        ? "bg-[#D6A85F] text-[#3A3020]"
                        : "bg-white/10 text-[#AEB8C1] group-hover:bg-white/15 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1">{item.label}</span>

                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D6A85F] text-xs font-bold text-[#3A3020]">
                AD
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {getUserDisplayName(user)}
                </p>

                <p className="mt-1 text-xs text-[#AEB8C1]">
                  Quản trị viên
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-[#AEB8C1] transition hover:bg-white/10 hover:text-white"
          >
            <span>⌂</span>
            <span>Về trang chủ</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#D9AAAA] transition hover:bg-[#A24A4A]/20 hover:text-white"
          >
            <span>↪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;