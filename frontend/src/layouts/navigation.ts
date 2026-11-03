import type { ShellArea } from "./ShellContext";
export type ShellNavItem = {
  label: string;
  path: string;
  icon: "home" | "calendar" | "car" | "clipboard" | "users" | "wrench" |
    "settings" | "box" | "chart" | "shield" | "receipt" | "clock";
  description?: string;
};

// Chỉ điều hướng đến route đã có; placeholder chỉ là điểm nối cho task của teammate.
export const shellNavigation: Record<ShellArea, ShellNavItem[]> = {
  customer: [
    { label: "Đặt lịch", path: "/customer/booking", icon: "calendar" },
    { label: "Lịch hẹn", path: "/customer/appointments", icon: "clipboard" },
    { label: "Xe của tôi", path: "/customer/cars", icon: "car" },
    { label: "Tiến độ xe", path: "/repair-status", icon: "wrench" },
    { label: "Báo giá", path: "/quotation", icon: "receipt" },
    { label: "Lịch sử", path: "/customer/service-history", icon: "clock" },
  ],
  advisor: [
    { label: "Bàn điều hành", path: "/advisor", icon: "home" },
    { label: "Phiếu sửa chữa", path: "/advisor/service-orders", icon: "clipboard" },
    { label: "Tiếp nhận xe", path: "/advisor/reception", icon: "car" },
    { label: "Lịch hẹn", path: "/advisor/appointments", icon: "calendar" },
    { label: "Đặt lịch hộ", path: "/advisor/create-booking", icon: "calendar" },
    { label: "Khách hàng", path: "/advisor/customers", icon: "users" },
    { label: "Xe khách hàng", path: "/advisor/customer-cars", icon: "car" },
    { label: "Lập báo giá", path: "/advisor/service-orders?status=QUOTING", icon: "receipt" },
    { label: "Tiến độ sửa chữa", path: "/advisor/service-orders?status=IN_PROGRESS", icon: "wrench" },
    { label: "Thu tiền & bàn giao", path: "/advisor/service-orders?status=COMPLETED", icon: "receipt" },
  ],
  admin: [
    { label: "Trung tâm điều hành", path: "/admin", icon: "chart" },
    { label: "Lịch hẹn", path: "/admin/appointments", icon: "calendar" },
    { label: "Khách hàng", path: "/admin/customers", icon: "users" },
    { label: "Tài khoản", path: "/admin/accounts", icon: "shield" },
    { label: "Nhân sự", path: "/admin/staff", icon: "users" },
    { label: "Dịch vụ", path: "/admin/services", icon: "settings" },
    { label: "Gói bảo dưỡng", path: "/admin/maintenance-packages", icon: "clipboard" },
    { label: "Giờ làm việc", path: "/admin/working-hours", icon: "clock" },
    { label: "Danh mục phụ tùng", path: "/admin/parts", icon: "box" },
    { label: "Kho phụ tùng", path: "/admin/inventory", icon: "box" },
    { label: "Báo cáo", path: "/admin/reports", icon: "chart" },
  ],
};
