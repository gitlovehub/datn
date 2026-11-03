import { useNavigate } from "react-router-dom";
import { getUserRole } from "./auth";

const roles = [
  {
    code: "CUSTOMER",
    path: "/",
    name: "Khách hàng",
    description:
      "Đặt lịch bảo dưỡng, quản lý thông tin xe và theo dõi tiến độ sửa chữa trực tuyến.",
    features: ["Đặt lịch dịch vụ", "Quản lý xe", "Theo dõi lịch hẹn"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>
    ),
  },
  {
    code: "ADVISOR",
    path: "/advisor/appointments",
    name: "Cố vấn dịch vụ",
    description:
      "Tiếp nhận xe, quản lý lịch hẹn và tư vấn các gói dịch vụ phù hợp cho khách hàng.",
    features: ["Tiếp nhận xe", "Duyệt lịch hẹn", "Tư vấn dịch vụ"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
      </svg>
    ),
  },
  {
    code: "ADMIN",
    path: "/admin",
    name: "Quản trị viên",
    description:
      "Quản lý tài khoản nhân sự, dịch vụ và các hoạt động vận hành của gara.",
    features: ["Quản lý nhân sự", "Quản lý dịch vụ", "Theo dõi vận hành"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 2 20 6v5c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

function RoleSelector() {
  const navigate = useNavigate();
  const currentRole = getUserRole();

  const handleSelect = (roleCode: string, directPath: string) => {
    if (currentRole === roleCode) {
      navigate(directPath);
    } else {
      navigate("/login", { state: { prefillRole: roleCode } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#20252B]">
      <header className="border-b border-[#E1E4E6] bg-white">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D6A85F]/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-[#D6A85F] transition group-hover:bg-[#303D49]">
              CS
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">
                CarService
              </span>
              <span className="block text-xs font-medium text-[#7A838C]">
                Chăm sóc xe chuyên nghiệp
              </span>
            </span>
          </button>

          <span className="hidden text-xs font-medium text-[#7A838C] sm:block">
            Cổng truy cập hệ thống
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D6A85F]/30 bg-[#FAF8F5] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#B58941]">
              CarService Portal
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Chọn khu vực làm việc
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#7A838C] sm:text-base">
            Chọn vai trò phù hợp để truy cập giao diện và các chức năng tương
            ứng trong hệ thống quản lý dịch vụ ô tô.
          </p>

          {currentRole && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#E1E4E6] bg-white px-3 py-2 text-xs text-[#66717C]">
              <span className="h-2 w-2 rounded-full bg-[#5B8C69]" />
              Vai trò hiện tại:
              <span className="font-bold text-[#20252B]">{currentRole}</span>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-[#D6A85F]" />
          <div>
            <h2 className="text-sm font-bold">Các vai trò hệ thống</h2>
            <p className="mt-0.5 text-xs text-[#8A949E]">
              4 khu vực làm việc theo nghiệp vụ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {roles.map((role, index) => {
            const isCurrentRole = currentRole === role.code;

            return (
              <button
                key={role.code}
                type="button"
                onClick={() => handleSelect(role.code, role.path)}
                aria-label={`Chọn vai trò ${role.name}`}
                className="cs-btn cs-btn-secondary"
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6A85F]/30 bg-[#FAF8F5] p-4 text-[#9A7334] transition group-hover:bg-[#F5ECD9]">
                    {role.icon}
                  </span>

                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      isCurrentRole
                        ? "border-[#D6A85F] bg-[#FAF1DE] text-[#9A7334]"
                        : "border-[#E1E4E6] text-[#8A949E] group-hover:border-[#D6A85F] group-hover:text-[#9A7334]"
                    }`}
                  >
                    {isCurrentRole ? (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    )}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">{role.name}</h3>
                  <span className="rounded-md bg-[#F7F7F5] px-2 py-1 text-xs font-bold tracking-wider text-[#7A838C]">
                    {role.code}
                  </span>
                  {isCurrentRole && (
                    <span className="rounded-md bg-[#F5ECD9] px-2 py-1 text-xs font-bold text-[#8F6A2D]">
                      ĐANG SỬ DỤNG
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-6 text-[#7A838C] sm:text-sm">
                  {role.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {role.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-lg border border-[#E8EAEC] bg-[#FAFAF9] px-2.5 py-1.5 text-xs font-medium text-[#66717C]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex w-full items-center justify-between pt-6">
                  <span className="text-xs font-semibold text-[#8A949E]">
                    {String(index + 1).padStart(2, "0")} / 04
                  </span>
                  <span className="text-xs font-bold text-[#B58941] transition group-hover:text-[#8F6A2D]">
                    Truy cập khu vực
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#E1E4E6] pt-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-[#66717C] transition hover:text-[#20252B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D6A85F]/30"
          >
            <span aria-hidden="true">←</span>
            Về trang chủ
          </button>

          <p className="text-xs text-[#8A949E]">
            CarService · Hệ thống quản lý dịch vụ ô tô
          </p>
        </div>
      </main>

      <footer className="border-t border-[#E1E4E6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-[#8A949E] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© 2026 CarService. All rights reserved.</span>
          <span>Chăm sóc xe chuyên nghiệp, tận tâm.</span>
        </div>
      </footer>
    </div>
  );
}

export default RoleSelector;