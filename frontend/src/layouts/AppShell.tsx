import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getUserDisplayName, logout } from "../pages/auth/auth";
import { Icon } from "../components/ui/Icon";
import { shellNavigation } from "./navigation";
import type { ShellArea } from "./ShellContext";
import { ShellContext } from "./ShellContext";
import "./shell.css";
import "../styles/atelier-customer-complete.css";

const info = {
  customer: { title: "Khu vực khách hàng", label: "AUTO CARE", short: "KHÁCH HÀNG" },
  advisor: { title: "Không gian cố vấn", label: "SERVICE WORKSPACE", short: "CỐ VẤN DỊCH VỤ" },
  admin: { title: "Trung tâm điều hành", label: "BUSINESS CONTROL", short: "QUẢN TRỊ HỆ THỐNG" },
};

function Brand({ area }: { area: ShellArea }) {
  return <Link className="cs-brand" to={area === "customer" ? "/" : area === "advisor" ? "/advisor" : "/admin"}>
    <span className="cs-brand-mark">C</span>
    <span>carservice<small>ATELIER / {info[area].label}</small></span>
  </Link>;
}

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" className="cs-icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Bật chế độ sáng" : "Bật chế độ tối"} title="Chế độ sáng / tối">
    <Icon name={theme === "dark" ? "sun" : "moon"}/>
  </button>;
}

function UserControls({ area }: { area: ShellArea }) {
  const session = useAuthSession();
  const account = session.status === "authenticated" ? session.account : null;
  return <div className="cs-user-controls">
    <span className="cs-user-name" title={account?.email ?? ""}>{getUserDisplayName(account)}</span>
    <ThemeButton />
    <button type="button" className="cs-icon-button" onClick={() => { void logout(); }} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="logout"/></button>
    {area === "customer" && <Link to="/customer/account" className="cs-account-link" aria-label="Tài khoản của tôi">{(getUserDisplayName(account).charAt(0) || "K").toUpperCase()}</Link>}
  </div>;
}

function NavItems({ area, close }: { area: ShellArea; close: () => void }) {
  const { pathname, search } = useLocation();
  // Menu trỏ tới danh sách đã lọc (?status=...) chỉ sáng khi đúng bộ lọc đó.
  const filteredPaths = shellNavigation[area].filter(item => item.path.includes("?")).map(item => item.path);
  const matches = (path: string, isActive: boolean) => path.includes("?")
    ? pathname + search === path
    : isActive && !filteredPaths.includes(pathname + search);
  const aliases: Record<string, string> = {
    "/booking": "/customer/booking", "/appointments": "/customer/appointments",
    "/cars": "/customer/cars", "/repair-status": "/repair-status", "/quotation": "/quotation",
  };
  const activePath = aliases[pathname] ?? pathname;
  return <nav className={area === "customer" ? "cs-public-nav" : "cs-side-nav"} aria-label={`Điều hướng ${info[area].short}`}>
    {shellNavigation[area].map(({ path, label, icon }) =>
      <NavLink key={path} to={path} onClick={close} end={path === "/admin" || path === "/advisor"} className={({isActive}) => `cs-nav-link${matches(path, isActive) || (area === "customer" && activePath === path) ? " is-active" : ""}`}>
        <Icon name={icon} size={18}/><span>{label}</span>
      </NavLink>
    )}
  </nav>;
}

function WorkLayout({ area }: { area: "advisor" | "admin" }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const title = shellNavigation[area].find(nav => nav.path === pathname)?.label ?? info[area].title;
  return <ShellContext.Provider value={area}>
    <div className="cs-shell cs-workspace" data-area={area}>
      {mobileOpen && <button className="cs-menu-scrim" onClick={() => setMobileOpen(false)} aria-label="Đóng thanh điều hướng"/>}
      <aside className={`cs-work-sidebar${mobileOpen ? " is-open" : ""}`} aria-label={info[area].short}>
        <div className="cs-sidebar-brand"><Brand area={area}/><button className="cs-close-sidebar cs-icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><Icon name="close"/></button></div>
        <div className="cs-nav-caption">{info[area].label}</div>
        <NavItems area={area} close={() => setMobileOpen(false)}/>
        <div className="cs-sidebar-bottom"><Link to="/" className="cs-bottom-link"><Icon name="arrow" size={16}/> Website công khai</Link><span>CarService • WD_004</span></div>
      </aside>
      <div className="cs-work-main">
        <header className="cs-work-top">
          <div className="cs-title-group">
            <button type="button" className="cs-menu-button cs-icon-button" onClick={() => setMobileOpen(true)} aria-label="Mở thanh điều hướng"><Icon name="menu"/></button>
            <div><span className="cs-top-caption">CARSERVICE / {info[area].label}</span><strong>{title}</strong></div>
          </div>
          <UserControls area={area}/>
        </header>
        <div className="cs-work-content" id="main-content"><Outlet/></div>
      </div>
    </div>
  </ShellContext.Provider>;
}

export function AdvisorLayout() { return <WorkLayout area="advisor"/>; }
export function AdminLayout() { return <WorkLayout area="admin"/>; }

export function CustomerLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return <ShellContext.Provider value="customer">
    <div className="cs-shell cs-customer-layout" data-area="customer">
      <header className="cs-public-header">
        <Brand area="customer"/>
        <div className="cs-desktop-navigation"><NavItems area="customer" close={() => setOpen(false)}/></div>
        <UserControls area="customer"/>
        <button className="cs-menu-button cs-icon-button" onClick={() => setOpen(previous => !previous)} aria-label={open ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={open} aria-controls="cs-customer-mobile-nav"><Icon name={open ? "close" : "menu"}/></button>
      </header>
      {open && <div id="cs-customer-mobile-nav" className="cs-mobile-public-nav"><NavItems area="customer" close={() => setOpen(false)}/></div>}
      <div className="cs-customer-main" id="main-content"><Outlet/></div>
      <footer className="cs-public-footer"><span>© {new Date().getFullYear()} CarService · Chăm sóc ô tô thuận tiện</span><Link to="/">Trang chủ</Link></footer>
    </div>
  </ShellContext.Provider>;
}
