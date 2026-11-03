import { NavLink } from "react-router-dom";

/** Hub chung của các module Admin: không thay đổi API hay xử lý nghiệp vụ. */
const sections = [
  { path: "/admin/accounts", abbreviation: "NV", title: "Tài khoản & nhân viên", description: "Quản lý tài khoản" },
  { path: "/admin/services", abbreviation: "DV", title: "Dịch vụ & gói bảo dưỡng", description: "Quản lý dịch vụ" },
  { path: "/admin/inventory", abbreviation: "PT", title: "Phụ tùng & tồn kho", description: "Quản lý kho" },
  { path: "/admin/reports", abbreviation: "BC", title: "Báo cáo & thống kê", description: "Theo dõi số liệu" },
] as const;

export default function AdminHubNav() {
  return <nav className="mb-[22px] grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2 max-[560px]:gap-[10px]" aria-label="Chuyển giữa các module quản trị">
    {sections.map(item => <NavLink key={item.path} to={item.path} className={({isActive}) => [
      "group flex min-h-[104px] min-w-0 flex-col items-start gap-[5px] rounded-2xl border p-[17px_16px] transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px max-[560px]:min-h-[105px] max-[560px]:p-3",
      isActive
        ? "is-active border-[#3b6346] bg-[#284c32] text-[#f7fff6] hover:bg-[#315a3c] [[data-theme=light]_&]:border-[#507b2c] [[data-theme=light]_&]:bg-[#507b2c]"
        : "border-cs-border bg-cs-surface text-cs-text hover:border-[#657d62] hover:bg-cs-surface-2",
    ].join(" ")}>
      <span className="grid size-[34px] place-items-center rounded-[10px] bg-cs-surface-2 text-xs font-extrabold text-cs-text group-[.is-active]:bg-[#416a4a] group-[.is-active]:text-[#f4ffe9] [[data-theme=light]_.is-active_&]:bg-[#d7ebc6] [[data-theme=light]_.is-active_&]:text-[#25401d]" aria-hidden="true">{item.abbreviation}</span>
      <strong className="mt-2 text-xs font-extrabold leading-[1.35] group-[.is-active]:text-[#f7fff6] max-[560px]:text-xs">{item.title}</strong>
      <small className="text-xs leading-[1.45] text-cs-muted group-[.is-active]:text-[#c3d5c4]">{item.description}</small>
    </NavLink>)}
  </nav>;
}
