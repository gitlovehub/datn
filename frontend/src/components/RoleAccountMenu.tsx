import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getRoleManagementPage,
  getUserDisplayName,
  logout,
} from "../pages/auth/auth";

const getInitials = (name?: string) => {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function RoleAccountMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  
  const [user, setUser] = useState(() => {
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

  const managementPage = getRoleManagementPage(user?.role);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2 transition sm:px-3 ${
          open
            ? "border-[#D6A85F] bg-[#F7F7F5]"
            : "border-[#E1E4E6] bg-white hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
        }`}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={getUserDisplayName(user)}
            className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#D6A85F]/50 shadow-xs"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F2933] text-xs font-bold text-[#D6A85F]">
            {getInitials(getUserDisplayName(user))}
          </div>
        )}

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-[#20252B]">
            {getUserDisplayName(user)}
          </p>

          <p className="mt-0.5 text-xs text-[#8A949E]">
            {user?.role || "Khách hàng"}
          </p>
        </div>

        <span
          className={`hidden text-xs text-[#8A949E] transition sm:block ${
            open ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_16px_40px_rgba(31,41,51,0.12)]">
          <div className="border-b border-[#E1E4E6] px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              TÀI KHOẢN
            </p>
          </div>

          <div className="p-2">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D6A85F] text-[12px] text-[#3A3020]">
                ⌂
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Trang chủ
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Trở về trang chính
                </p>
              </div>
            </Link>

            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className={`mt-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/account"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[12px] text-[#3A3020]">
                ◉
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Thông tin tài khoản
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Xem thông tin tài khoản
                </p>
              </div>
            </Link>

            {managementPage ? (
              <Link
                to={managementPage.path}
                onClick={() => setOpen(false)}
                className={`mt-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                  location.pathname === managementPage.path
                    ? "bg-[#F3E8D2]"
                    : "hover:bg-[#F7F7F5]"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F2933] text-[13px] text-white">
                  ▦
                </span>

                <div>
                  <p className="text-[12px] font-semibold text-[#20252B]">
                    {managementPage.label}
                  </p>

                  <p className="mt-0.5 text-xs text-[#8A949E]">
                    {user?.role === "CUSTOMER"
                      ? "Lịch sử bảo dưỡng & theo dõi xe"
                      : "Quay lại khu vực làm việc"}
                  </p>
                </div>
              </Link>
            ) : (
              <>
            <Link
              to="/booking"
              onClick={() => setOpen(false)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/booking"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px] text-[#3A3020]">
                +
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Đặt lịch
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Tạo lịch hẹn mới
                </p>
              </div>
            </Link>

            <Link
              to="/customer/appointments"
              onClick={() => setOpen(false)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/customer/appointments"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px] text-[#3A3020]">
                ▣
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Lịch hẹn
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Theo dõi lịch hẹn
                </p>
              </div>
            </Link>

            <Link
              to="/customer/cars"
              onClick={() => setOpen(false)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/customer/cars"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px] text-[#3A3020]">
                🚗
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Xe của tôi
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Quản lý phương tiện
                </p>
              </div>
            </Link>
              </>
            )}
          </div>

          <div className="border-t border-[#E1E4E6] p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F2] text-[13px] text-[#3A3020]">
                ↪
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Đăng xuất
                </p>

                <p className="mt-0.5 text-xs text-[#8A949E]">
                  Thoát khỏi tài khoản
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleAccountMenu;