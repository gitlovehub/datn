import { fetchApi } from "../../services/api";

export type UserRole =
  | "CUSTOMER"
  | "ADVISOR"
  | "TECHNICIAN"
  | "ADMIN";

export const getRoleManagementPage = (
  role: unknown,
): { path: string; label: string } | null => {
  switch (role) {
    case "ADMIN":
      return { path: "/admin", label: "Quản trị hệ thống" };
    case "ADVISOR":
      return { path: "/advisor", label: "Quản lý cố vấn" };
    case "CUSTOMER":
      return { path: "/customer/appointments", label: "Lịch hẹn của tôi" };
    default:
      return null;
  }
};

export type AuthUserInfo = {
  id?: number | string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  avatar?: string | null;
  customer?: { full_name?: string | null } | null;
  employee?: { full_name?: string | null } | null;
} | null;

export const getUserDisplayName = (user: AuthUserInfo = null): string => {
  return (
    user?.full_name ||
    user?.customer?.full_name ||
    user?.employee?.full_name ||
    user?.name ||
    user?.email ||
    "Tên người dùng"
  );
};

export const getUserInitials = (user: AuthUserInfo = null): string => {
  const name = getUserDisplayName(user);
  if (!name || name === "Tên người dùng") {
    const role = user?.role;
    if (role === "ADMIN") return "AD";
    if (role === "ADVISOR") return "CV";
    if (role === "TECHNICIAN") return "KT";
    return "KH";
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export const getUserRole = (): UserRole | null => {
  const role = localStorage.getItem("role");

  if (
    role === "CUSTOMER" ||
    role === "ADVISOR" ||
    role === "TECHNICIAN" ||
    role === "ADMIN"
  ) {
    return role;
  }

  return null;
};

export const setUserRole = (role: UserRole) => {
  localStorage.setItem("role", role);
  localStorage.setItem("isLoggedIn", "true");
  window.dispatchEvent(new Event("user-updated"));
};


export const logout = async () => {
  try {
    if (localStorage.getItem("token")) {
      // Revoke bearer token while it is still present; then clear the session.
      await fetchApi("/logout", { method: "POST" });
    }
  } catch { /* Xóa phiên ở Frontend kể cả khi mất kết nối. */ }
  finally {
    localStorage.removeItem("role");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    window.location.assign("/login");
  }
};
