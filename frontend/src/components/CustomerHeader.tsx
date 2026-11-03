import { useInAppShell } from "../layouts/ShellContext";

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getUserDisplayName,
  getUserInitials,
  logout,
  type AuthUserInfo,
} from "../pages/auth/auth";
import BrandLogo from "./common/BrandLogo";

const menuItems = [
  {
    label: "Tổng quan",
    path: "/customer/dashboard",
    icon: "⊞",
  },
  {
    label: "Đặt lịch",
    path: "/booking",
    icon: "＋",
  },
  {
    label: "Lịch hẹn",
    path: "/customer/appointments",
    icon: "▣",
  },
  {
    label: "Xe của tôi",
    path: "/customer/cars",
    icon: "▰",
  },
  {
    label: "Báo giá",
    path: "/quotation",
    icon: "◇",
  },
  {
    label: "Thanh toán",
    path: "/payment",
    icon: "₫",
  },
  {
    label: "Hóa đơn",
    path: "/invoices",
    icon: "▤",
  },
  {
    label: "Đánh giá",
    path: "/reviews",
    icon: "★",
  },
  {
    label: "Tài khoản",
    path: "/account",
    icon: "◉",
  },
];

function CustomerHeader() {
  const inShell = useInAppShell();
  const location = useLocation();

  const [user, setUser] = useState<AuthUserInfo>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  if (inShell) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] border-r border-[#313B45] bg-[#1F2933] text-white lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#3C4650] px-6 py-5">
          <BrandLogo theme="dark" subtitle="Khu vực khách hàng" />
        </div>

        <div className="px-4 py-5">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8F9AA4]">
            MENU KHÁCH HÀNG
          </p>

          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => {
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium transition ${
                    active
                      ? "bg-[#D6A85F] text-[#1F2933]"
                      : "text-[#C6CDD3] hover:bg-[#313B45] hover:text-white"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs">
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5">
          <div className="rounded-2xl border border-[#3C4650] bg-[#29333D] p-4">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={getUserDisplayName(user)}
                  className="h-9 w-9 shrink-0 rounded-full border border-[#D6A85F]/60 object-cover shadow-xs"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D6A85F] text-xs font-bold text-[#1F2933]">
                  {getUserInitials(user)}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white">
                  {getUserDisplayName(user)}
                </p>

                <p className="mt-0.5 text-xs text-[#AEB8C1]">
                  Khách hàng
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Link
                to="/"
                className="flex flex-1 items-center justify-center rounded-xl border border-[#4A5661] py-2 text-xs font-medium text-[#D5DBE0] transition hover:bg-[#313B45] hover:text-white"
              >
                Trang chủ
              </Link>

              <button
                type="button"
                onClick={logout}
                className="cs-btn cs-btn-danger-outline flex-1"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default CustomerHeader;
