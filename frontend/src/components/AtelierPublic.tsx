import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthSession } from "../contexts/AuthContext";
import { getRoleManagementPage, logout } from "../pages/auth/auth";
import carArt from "../assets/car-atelier.svg";

function AtelierBrand() {
  return <Link className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-xl leading-tight font-extrabold max-[380px]:text-lg tracking-[-0.06em] text-[#191919] no-underline dark:text-[#f5f5f4]" to="/" aria-label="CarService Atelier - Trang chủ">
    <span className="flex size-8 max-[380px]:size-7 shrink-0 -rotate-6 items-center justify-center rounded-lg bg-[#cf2935] text-sm font-extrabold text-white">C</span>
    <span>carservice<small className="mt-0.5 block text-xs font-extrabold tracking-[0.14em] text-[#757575] max-[480px]:hidden">ATELIER / AUTO CARE</small></span>
  </Link>;
}

const guestLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/services" },
  { label: "Đặt lịch", href: "/booking" },
  { label: "Lịch hẹn", href: "/appointments" },
];

export function AtelierPublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const session = useAuthSession();
  const location = useLocation();
  const isAuthenticated = session.status === "authenticated";
  const dashboard = isAuthenticated ? (getRoleManagementPage(session.account.role)?.path ?? "/") : "/login";
  const links = guestLinks.map(({label,href}) => {
    const path = label === "Lịch hẹn" && isAuthenticated
      ? session.account.role === "ADMIN" ? "/admin/appointments"
        : session.account.role === "ADVISOR" ? "/advisor/appointments"
          : "/customer/appointments"
      : label === "Đặt lịch" && isAuthenticated && session.account.role !== "CUSTOMER"
        ? dashboard : href;
    return <Link key={label} to={path} onClick={() => setMenuOpen(false)} className={location.pathname === path ? "text-[#cf2935] underline decoration-2 underline-offset-8" : ""}>{label}</Link>;
  });
  return <header className="sticky top-0 z-[60] flex h-[81px] items-center justify-between gap-5 max-[480px]:gap-2 border-b border-[#e9e9e6] bg-white px-4 max-[380px]:px-3 sm:px-[5vw] xl:px-[76px] dark:border-[#34373a] dark:bg-[#191b1e]">
    <AtelierBrand />
    <nav className="hidden items-center gap-5 min-[821px]:flex xl:gap-8 [&_a]:relative [&_a]:whitespace-nowrap [&_a]:text-[13px] [&_a]:font-bold [&_a]:text-[#757575] [&_a]:hover:text-[#cf2935]" aria-label="Điều hướng chính">{links}</nav>
    <div className="flex shrink-0 items-center gap-2 max-[400px]:gap-1.5 max-[380px]:gap-1">
      <button className="inline-flex size-10 max-[380px]:size-9 cursor-pointer items-center justify-center rounded-xl border border-[#e9e9e6] bg-white text-lg text-[#191919] hover:border-[#cf2935] hover:text-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-white" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Bật chế độ sáng" : "Bật chế độ tối"} title="Sáng / tối">{theme === "dark" ? "☀" : "☾"}</button>
      {isAuthenticated ? <><Link className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4] min-h-9 px-3 py-2 text-xs max-[480px]:hidden" to={dashboard}>Không gian của tôi</Link><button className="hidden min-h-9 cursor-pointer items-center justify-center rounded-xl border border-[#e9e9e6] bg-white px-3 py-2 text-xs font-bold text-[#191919] hover:border-[#cf2935] sm:inline-flex dark:border-[#34373a] dark:bg-[#191b1e] dark:text-white" type="button" onClick={() => void logout()}>Đăng xuất</button></> : <Link className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4] min-h-9 px-3 py-2 text-xs max-[380px]:px-2.5" to="/login">Đăng nhập</Link>}
      <button type="button" className="inline-flex size-10 max-[380px]:size-9 cursor-pointer items-center justify-center rounded-xl border border-[#e9e9e6] bg-white text-lg min-[821px]:hidden dark:border-[#34373a] dark:bg-[#191b1e] dark:text-white" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? "✕" : "☰"}</button>
    </div>
    {menuOpen && <nav className="absolute inset-x-0 top-[81px] grid gap-2 border-b border-[#e9e9e6] bg-white px-6 py-4 shadow-xl min-[821px]:hidden dark:border-[#34373a] dark:bg-[#191b1e] [&_a]:cursor-pointer [&_a]:py-2 [&_a]:text-sm [&_a]:font-bold" aria-label="Điều hướng mobile">{links}{!isAuthenticated && <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>}{isAuthenticated && <><Link className="min-[481px]:hidden" to={dashboard} onClick={() => setMenuOpen(false)}>Không gian của tôi</Link><button type="button" className="cursor-pointer py-2 text-left text-sm font-bold sm:hidden" onClick={() => { setMenuOpen(false); void logout(); }}>Đăng xuất</button></>}</nav>}
  </header>;
}

export function AtelierPublicFooter() {
  return <footer className="flex flex-wrap justify-between gap-5 border-t border-[#e9e9e6] bg-white px-5 py-7 text-xs text-[#757575] sm:px-[5vw] xl:px-[76px] dark:border-[#34373a] dark:bg-[#191b1e]"><span>© {new Date().getFullYear()} CarService — Thiết kế trải nghiệm chăm sóc ô tô.</span><span>Website quản lý dịch vụ bảo dưỡng ô tô</span></footer>;
}

export function AtelierCar({ className = "" }: { className?: string }) {
  return <img className={className} src={carArt} alt="Minh họa ô tô thể thao CarService Atelier" />;
}

export function AtelierAuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f6] text-[#191919] dark:bg-[#111214] dark:text-[#f5f5f4]">
      <AtelierPublicHeader />
      <main className="flex w-full flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-[480px]" aria-label={title}>
          <h1 className="mb-3 mt-4 text-4xl font-extrabold tracking-tight sm:text-[42px]">
            {title}
          </h1>
          <p className="mb-8 leading-7 text-[#757575] dark:text-[#a1a5ad]">
            {description}
          </p>
          {children}
        </section>
      </main>
      <AtelierPublicFooter />
    </div>
  );
}

export function AtelierField({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-2"><label className="text-xs font-bold" htmlFor={htmlFor}>{label}</label>{children}{error && <p className="text-xs font-bold text-[#dc4250]">{error}</p>}</div>;
}

export function AtelierAuthError({ message }: { message: string }) {
  return <div className="mb-4 rounded-xl border border-[#cf2935]/30 bg-[#fff1f1] px-4 py-3 leading-6 text-[#d13743]" role="alert">{message}</div>;
}
