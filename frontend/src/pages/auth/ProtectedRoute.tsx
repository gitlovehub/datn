import { Navigate, useLocation } from "react-router-dom";
import { getRoleManagementPage } from "./auth";
import type { UserRole } from "./auth";
import { useAuthSession } from "../../contexts/AuthContext";
import { LoadingState } from "../../components/ui";

type Props = { allowedRoles: UserRole[]; children: React.ReactNode };
export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const location = useLocation();
  const session = useAuthSession();
  if (session.status === "checking") return <LoadingState/>;
  if (session.status === "error") return <div role="alert" className="cs-auth-error">
    <p>Không thể xác minh phiên đăng nhập với máy chủ CarService.</p>
    <button type="button" onClick={() => window.dispatchEvent(new Event("user-updated"))}>Thử kết nối lại</button>
  </div>;
  if (session.status === "guest") return <Navigate to="/login" state={{ from: location }} replace/>;
  const role = session.account.role;
  if (!role || !allowedRoles.includes(role as UserRole)) {
    return <Navigate to={getRoleManagementPage(role)?.path ?? "/login"} replace/>;
  }
  return <>{children}</>;
}
