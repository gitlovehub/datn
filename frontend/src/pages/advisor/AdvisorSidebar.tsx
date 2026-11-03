import { useInAppShell } from "../../layouts/ShellContext";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "../../components/common/BrandLogo";

const menuItems = [
  {
    label: "Khách hàng",
    path: "/advisor/customers",
    icon: "♙",
  },
  {
    label: "Xe khách hàng",
    path: "/advisor/customer-cars",
    icon: "▰",
  },
  {
    label: "Lịch hẹn",
    path: "/advisor/appointments",
    icon: "▣",
  },
  {
    label: "Trạng thái sửa chữa",
    path: "/advisor/repair-status",
    icon: "↻",
  },
  {
    label: "Báo giá",
    path: "/advisor/quotation",
    icon: "◇",
  },
];

function AdvisorSidebar() {
  const inShell = useInAppShell();
  const location = useLocation();
  const username = localStorage.getItem("username") || "Cố vấn";

  if (inShell) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] bg-[#1F2933] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <BrandLogo to="/advisor/appointments" theme="dark" subtitle="Cố vấn dịch vụ" />
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8F9AA4]">
            QUẢN LÝ
          </p>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] transition duration-200 ${
                    active
                      ? "bg-[#F3E8D2] font-semibold text-[#20252B] shadow-[0_6px_18px_rgba(0,0,0,0.08)]"
                      : "font-medium text-[#D5D9DC] hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#D6A85F]" />
                  )}

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] transition duration-200 ${
                      active
                        ? "bg-[#D6A85F] text-[#3A3020]"
                        : "bg-white/10 text-[#AEB8C1] group-hover:bg-white/15 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="truncate">{item.label}</span>

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#D6A85F]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 rounded-2xl border border-white/5 bg-white/10 p-3 transition duration-300 hover:bg-white/[0.13]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E8D2] text-xs font-bold text-[#3A3020]">
                CV
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {username}
                </p>

                <p className="mt-0.5 text-xs text-[#AEB8C1]">
                  Cố vấn dịch vụ
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-[#AEB8C1] transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
          >
            <span className="transition duration-200 group-hover:-translate-x-0.5">
              ←
            </span>

            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default AdvisorSidebar;