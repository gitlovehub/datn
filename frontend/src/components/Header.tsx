import { useInAppShell } from "../layouts/ShellContext";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchApi } from "../services/api";
import {
  getRoleManagementPage,
  getUserDisplayName,
  getUserInitials,
  logout,
  type AuthUserInfo,
} from "../pages/auth/auth";
import BrandLogo from "./common/BrandLogo";

const navItems = [
  { label: "Trang chủ", path: "/" },
  { label: "Dịch vụ", path: "/services" },
  { label: "Đặt lịch", path: "/booking" },
  { label: "Lịch hẹn", path: "/appointments" },
  { label: "Xe của tôi", path: "/cars" },
];

function Header() {
  const inShell = useInAppShell();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );
  const [user, setUser] = useState<AuthUserInfo>(null);

  const managementPage = getRoleManagementPage(user?.role);

  useEffect(() => {
    let active = true;

    const checkLogin = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        setUser(null);
        return;
      }

      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser && active) {
          setUser(JSON.parse(storedUser));
        }

        const response = await fetchApi("/me");

        if (active && response?.account) {
          setUser(response.account);
          localStorage.setItem("user", JSON.stringify(response.account));
        }
      } catch {
        const storedUser = localStorage.getItem("user");

        if (active && storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }
      }
    };

    const syncUser = () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };

    void checkLogin();

    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);

    return () => {
      active = false;
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    if (path === "/appointments") {
      return [
        "/appointments",
        "/customer/appointments",
      ].includes(location.pathname);
    }

    if (path === "/cars") {
      return ["/cars", "/customer/cars"].includes(location.pathname);
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const navLinkClass = (active: boolean) =>
    `rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
      active
        ? "bg-[#F5E8D0] text-[#1F2933]"
        : "text-[#58636E] hover:bg-[#F7F7F5] hover:text-[#1F2933]"
    }`;

  const handleLogout = () => {
    setOpen(false);
    setMobileOpen(false);
    logout();
  };

  const renderNavigation = (mobile = false) => (
    <nav
      className={
        mobile
          ? "flex flex-col gap-1 border-t border-[#E5E7EB] px-5 py-3 lg:hidden"
          : "hidden items-center gap-1.5 lg:flex"
      }
    >
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          aria-current={isActive(item.path) ? "page" : undefined}
          className={
            mobile
              ? `rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive(item.path)
                    ? "bg-[#F5E8D0] text-[#1F2933]"
                    : "text-[#58636E] hover:bg-[#F7F7F5] hover:text-[#1F2933]"
                }`
              : navLinkClass(isActive(item.path))
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  if (inShell) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E1E4E6] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="CarService - Trang chủ">
          <BrandLogo className="py-1" />
        </Link>

        {renderNavigation()}

        <div className="flex shrink-0 items-center gap-2">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D9DEE2] bg-white px-3 text-xs font-semibold text-[#1F2933] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] sm:px-4"
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#D6A85F] px-3 text-xs font-semibold text-[#1F2933] shadow-sm transition hover:bg-[#C3974F] sm:px-4"
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="cs-btn cs-btn-secondary"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={getUserDisplayName(user)}
                    className="h-8 w-8 rounded-xl border border-[#D6A85F]/40 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-[#D6A85F]">
                    {getUserInitials(user)}
                  </div>
                )}

                <div className="hidden text-left sm:block">
                  <p className="max-w-[120px] truncate text-xs font-semibold text-[#1F2933]">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs text-[#7A838C]">
                    {user?.role || "Khách hàng"}
                  </p>
                </div>

                <svg
                  className={`h-4 w-4 text-[#7A838C] transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m19 9-7 7-7-7"
                  />
                </svg>
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2.5 w-64 rounded-2xl border border-[#E1E4E6] bg-white p-2 shadow-xl shadow-slate-900/10"
                >
                  <div className="border-b border-[#EEF0F2] px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A949E]">
                      Tài khoản người dùng
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#1F2933]">
                      {user?.email || getUserDisplayName(user)}
                    </p>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <Link
                      role="menuitem"
                      to="/"
                      className="flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-[#58636E] transition hover:bg-[#F7F7F5] hover:text-[#1F2933]"
                    >
                      Trang chủ
                    </Link>

                    {managementPage && (
                      <Link
                        role="menuitem"
                        to={managementPage.path}
                        className="flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-[#58636E] transition hover:bg-[#F7F7F5] hover:text-[#1F2933]"
                      >
                        {managementPage.label}
                      </Link>
                    )}

                    <Link
                      role="menuitem"
                      to="/account"
                      className="flex items-center rounded-xl px-3 py-2.5 text-xs font-medium text-[#58636E] transition hover:bg-[#F7F7F5] hover:text-[#1F2933]"
                    >
                      Thông tin tài khoản
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-[#EEF0F2]" />

                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((previous) => !previous)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            className="cs-btn cs-btn-secondary lg:hidden"
          >
            {mobileOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#E1E4E6] bg-white">
          {renderNavigation(true)}

          {!isLoggedIn && (
            <div className="flex gap-2 px-5 pb-4 lg:hidden">
              <Link
                to="/login"
                className="flex flex-1 items-center justify-center rounded-xl border border-[#D9DEE2] px-4 py-3 text-sm font-semibold text-[#1F2933] transition hover:bg-[#F7F7F5]"
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="flex flex-1 items-center justify-center rounded-xl bg-[#D6A85F] px-4 py-3 text-sm font-semibold text-[#1F2933] transition hover:bg-[#C3974F]"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
