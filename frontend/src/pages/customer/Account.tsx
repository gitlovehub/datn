import { useEffect, useState, useRef, type ChangeEvent } from "react";
import Header from "../../components/Header";
import { fetchApi } from "../../services/api";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import VietnamAddressSelector from "../../components/common/VietnamAddressSelector";
import { logout } from "../auth/auth";

type AccountInfo = {
  id: number;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "ADVISOR" | "TECHNICIAN";
  status: string;
  avatar?: string | null;
  created_at: string;
  employee?: {
    id: number;
    full_name: string;
    phone?: string | null;
    technician_profile_id: number | null;
  } | null;
  customer?: {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

type CustomerProfile = NonNullable<AccountInfo["customer"]>;

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
];

const roleNames: Record<AccountInfo["role"], string> = {
  CUSTOMER: "Khách hàng",
  ADMIN: "Quản trị viên",
  ADVISOR: "Cố vấn dịch vụ",
  TECHNICIAN: "Kỹ thuật viên",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : date.toLocaleDateString("vi-VN");
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const VIETNAM_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

function Account() {
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as AccountInfo | null;
    } catch {
      return null;
    }
  });

  const [customer, setCustomer] = useState<CustomerProfile | null>(
    account?.customer || null,
  );
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });
  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    phone?: string;
    address?: string;
  }>({});

  // Change Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar Selection
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch account data
  const loadAccountDetails = async () => {
    try {
      const accountResponse = await fetchApi("/me");
      if (accountResponse?.account) {
        const currentAccount = accountResponse.account as AccountInfo;
        setAccount(currentAccount);
        localStorage.setItem("user", JSON.stringify(currentAccount));

        if (currentAccount.role === "CUSTOMER") {
          const [customerResult, vehiclesResult] = await Promise.allSettled([
            fetchApi("/me/customer/"),
            fetchApi("/me/vehicles/"),
          ]);

          if (customerResult.status === "fulfilled" && customerResult.value?.data) {
            setCustomer(customerResult.value.data as CustomerProfile);
          }

          if (
            vehiclesResult.status === "fulfilled" &&
            Array.isArray(vehiclesResult.value?.data)
          ) {
            setVehicleCount(vehiclesResult.value.data.length);
          }
        }
      }
    } catch {
      // Keep existing data in localStorage if offline
    }
  };

  useEffect(() => {
    void loadAccountDetails();
  }, []);

  const fullName =
    customer?.full_name ||
    account?.customer?.full_name ||
    account?.employee?.full_name ||
    "Chưa cập nhật";
  const email =
    customer?.email || account?.customer?.email || account?.email || "Chưa cập nhật";
  const phone =
    customer?.phone ||
    account?.customer?.phone ||
    account?.employee?.phone ||
    "Chưa cập nhật";
  const address =
    customer?.address || account?.customer?.address || "Chưa cập nhật";
  const status =
    account?.status === "ACTIVE"
      ? "Đang hoạt động"
      : account?.status || "Chưa cập nhật";
  const roleName = account ? roleNames[account.role] : "Tài khoản";
  const profileNumber =
    account?.role === "CUSTOMER" && (customer?.id || account?.customer?.id)
      ? `KH-${String(customer?.id || account?.customer?.id).padStart(3, "0")}`
      : account?.employee?.id
        ? `NV-${String(account.employee.id).padStart(3, "0")}`
        : "Chưa cập nhật";

  // --- Handlers: Edit Profile ---
  const handleOpenEditProfile = () => {
    setProfileForm({
      fullName: fullName === "Chưa cập nhật" ? "" : fullName,
      phone: phone === "Chưa cập nhật" ? "" : phone,
      address: address === "Chưa cập nhật" ? "" : address,
    });
    setProfileErrors({});
    setIsEditProfileOpen(true);
  };

  const validateProfileForm = () => {
    const errors: typeof profileErrors = {};
    const trimmedName = profileForm.fullName.trim();
    const trimmedPhone = profileForm.phone.trim();

    if (!trimmedName) {
      errors.fullName = "Vui lòng nhập họ và tên.";
    } else if (trimmedName.length < 2) {
      errors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    } else if (trimmedName.length > 100) {
      errors.fullName = "Họ và tên không được vượt quá 100 ký tự.";
    }

    if (!trimmedPhone) {
      errors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!VIETNAM_PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = "Số điện thoại không hợp lệ (10 chữ số, ví dụ: 0912345678).";
    }

    if (profileForm.address.trim().length > 255) {
      errors.address = "Địa chỉ không được vượt quá 255 ký tự.";
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim() || null,
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        if (response.account.customer) {
          setCustomer(response.account.customer);
        }
        localStorage.setItem("user", JSON.stringify(response.account));
        window.dispatchEvent(new Event("user-updated"));
      }

      showToast("Cập nhật thông tin cá nhân thành công!", "success");
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { message?: string } })?.data?.message ||
        "Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Change Password ---
  const handleOpenChangePassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setIsChangePasswordOpen(true);
  };

  const validatePasswordForm = () => {
    const errors: typeof passwordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự.";
    } else if (
      !/[A-Z]/.test(passwordForm.newPassword) ||
      !/[a-z]/.test(passwordForm.newPassword) ||
      !/[0-9]/.test(passwordForm.newPassword)
    ) {
      errors.newPassword =
        "Mật khẩu mới phải bao gồm chữ hoa, chữ thường và chữ số.";
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = "Mật khẩu mới không được trùng với mật khẩu hiện tại.";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Xác nhận mật khẩu mới không khớp.";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);
    try {
      await fetchApi("/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          new_password_confirmation: passwordForm.confirmPassword,
        }),
      });

      showToast("Đổi mật khẩu thành công!", "success");
      setIsChangePasswordOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      const errorData = (err as { data?: { errors?: Record<string, string[]>; message?: string } })
        ?.data;
      if (errorData?.errors) {
        const backendErrors: typeof passwordErrors = {};
        if (errorData.errors.current_password) {
          backendErrors.currentPassword = errorData.errors.current_password[0];
        }
        if (errorData.errors.new_password) {
          backendErrors.newPassword = errorData.errors.new_password[0];
        }
        if (errorData.errors.new_password_confirmation) {
          backendErrors.confirmPassword = errorData.errors.new_password_confirmation[0];
        }
        setPasswordErrors(backendErrors);
      }
      const message =
        errorData?.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Avatar ---
  const handleOpenAvatarModal = () => {
    setSelectedAvatar(account?.avatar || "");
    setIsAvatarModalOpen(true);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn định dạng ảnh hợp lệ (PNG, JPG, WebP).", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh tối đa là 5MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          avatar: selectedAvatar || null,
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        localStorage.setItem("user", JSON.stringify(response.account));
        window.dispatchEvent(new Event("user-updated"));
      }

      showToast("Cập nhật ảnh đại diện thành công!", "success");
      setIsAvatarModalOpen(false);
    } catch {
      showToast("Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="at-customer-account min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main>
        {/* Banner Section */}
        <section className="border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-14 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              MY GARAGE / ACCOUNT
            </p>

            <h1 className="mt-3 text-[38px] font-bold tracking-[-1.4px] text-[#1F2933] md:text-[50px]">
              Hồ sơ của tôi
            </h1>

            <p className="mt-3 max-w-[620px] text-[13px] leading-6 text-[#66717C]">
              Quản lý thông tin cá nhân và các cài đặt tài khoản.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section>
          <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-16">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* Left Column: User Profile Card */}
              <div className="h-fit overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-xs">
                <div className="bg-[#1F2933] px-6 py-8 text-center text-white relative">
                  {/* Avatar with Camera badge */}
                  <div className="relative mx-auto h-28 w-28">
                    {account?.avatar ? (
                      <img
                        src={account.avatar}
                        alt={fullName}
                        className="h-28 w-28 rounded-full object-cover border-4 border-[#D6A85F] shadow-lg"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#3C4650] bg-[#D6A85F] text-3xl font-bold text-[#1F2933] shadow-lg">
                        {fullName === "Chưa cập nhật"
                          ? account?.role.slice(0, 2) || "TK"
                          : getInitials(fullName)}
                      </div>
                    )}

                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={handleOpenAvatarModal}
                      title="Đổi ảnh đại diện"
                      className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#D6A85F] text-[#1F2933] shadow-md transition hover:scale-110 hover:bg-[#c49850]"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  <h2 className="mt-4 text-[18px] font-bold text-white">
                    {fullName}
                  </h2>

                  <p className="mt-1 text-[13px] font-medium text-[#D6A85F]">
                    {roleName}
                  </p>

                  <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#29333D] px-4 py-1.5 border border-white/5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-[#E8ECEF]">
                      Tài khoản {status.toLowerCase()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAvatarModal}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#AEB8C1] hover:text-[#D6A85F] transition cursor-pointer font-medium"
                  >
                    <span>📷 Thay đổi ảnh đại diện</span>
                  </button>
                </div>

                {/* Profile Stats & Details */}
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    THÔNG TIN HỆ THỐNG
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[12px] text-[#8A949E]">
                        Mã định danh
                      </span>
                      <span className="font-mono text-[13px] font-bold text-[#1F2933] bg-slate-100 px-2 py-0.5 rounded-md">
                        {profileNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[12px] text-[#8A949E]">
                        Ngày tham gia
                      </span>
                      <span className="text-[13px] font-semibold text-[#20252B]">
                        {formatDate(account?.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[12px] text-[#8A949E]">
                        Xe đã đăng ký
                      </span>
                      <span className="text-[13px] font-semibold text-[#20252B]">
                        {account?.role !== "CUSTOMER"
                          ? "Không áp dụng"
                          : vehicleCount === null
                            ? "Đang tải..."
                            : `${vehicleCount} xe`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#E1E4E6] pt-4 space-y-3">
                    <p className="text-xs leading-5 text-[#66717C]">
                      Thông tin này được sử dụng để định danh trong toàn bộ các quy trình dịch vụ và chăm sóc xe tại CarService.
                    </p>

                    <button
                      type="button"
                      onClick={() => logout()}
                      className="cs-btn cs-btn-danger-outline cs-btn-block"
                    >
                      <span>↪</span>
                      Đăng xuất tài khoản
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Personal Info & Security Sections */}
              <div className="space-y-6">
                {/* 1. Personal Information */}
                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-xs">
                  <div className="flex flex-col justify-between gap-4 border-b border-[#E1E4E6] px-6 py-5 md:flex-row md:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                        HỒ SƠ CÁ NHÂN
                      </p>
                      <h2 className="mt-1 text-[18px] font-bold text-[#20252B]">
                        Thông tin cá nhân
                      </h2>
                      <p className="mt-1 text-[12px] text-[#66717C]">
                        Thông tin hiển thị khi liên hệ, đặt lịch hẹn và nhận xe.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="cs-btn cs-btn-secondary"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Chỉnh sửa thông tin
                    </button>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Họ và tên
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#20252B]">
                        {fullName}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Số điện thoại
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#20252B]">
                        {phone}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Email liên hệ
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#20252B]">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Vai trò
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#D6A85F]">
                        {roleName}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 md:col-span-2">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Địa chỉ
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#20252B]">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Login & Security */}
                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-xs">
                  <div className="border-b border-[#E1E4E6] px-6 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      BẢO MẬT & ĐĂNG NHẬP
                    </p>
                    <h2 className="mt-1 text-[18px] font-bold text-[#20252B]">
                      Thông tin đăng nhập
                    </h2>
                    <p className="mt-1 text-[12px] text-[#66717C]">
                      Quản lý tài khoản đăng nhập và mật khẩu an toàn.
                    </p>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    <div className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Email đăng nhập
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold text-[#20252B]">
                        {email}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Email dùng để xác thực và nhận thông báo
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4">
                      <p className="text-xs font-medium text-[#8A949E]">
                        Mật khẩu
                      </p>
                      <p className="mt-1.5 text-[14px] font-semibold tracking-[0.2em] text-[#20252B]">
                        ••••••••••••
                      </p>
                      <p className="mt-1 text-xs text-emerald-600 font-medium">
                        Đang được bảo vệ an toàn
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-[#E1E4E6] px-6 py-4 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={handleOpenChangePassword}
                      className="cs-btn cs-btn-secondary"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-[#D6A85F]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Đổi mật khẩu
                    </button>
                  </div>
                </div>

                {/* 3. Security Tip */}
                <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#1F2933]">
                      🛡️
                    </div>

                    <div>
                      <p className="text-[14px] font-bold text-[#20252B]">
                        Khuyến nghị bảo mật từ CarService
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-[#66717C]">
                        Không chia sẻ mật khẩu của bạn với bất kỳ ai. Để tài khoản an toàn tối đa, hãy đặt mật khẩu có ít nhất 8 ký tự, bao gồm cả chữ in hoa, chữ thường và chữ số.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: CHỈNH SỬA THÔNG TIN CÁ NHÂN                     */}
      {/* ========================================================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-white shadow-2xl transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Chỉnh sửa thông tin cá nhân
                </h3>
                <p className="mt-0.5 text-xs text-[#66717C]">
                  Cập nhật thông tin liên hệ cho tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 px-6 pb-6 pt-5">
              {/* Email (Readonly) */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Email đăng nhập
                </label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                    Định danh cố định
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Email dùng làm tài khoản đăng nhập, không thể thay đổi tại đây.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, fullName: e.target.value });
                    if (profileErrors.fullName) {
                      setProfileErrors({ ...profileErrors, fullName: undefined });
                    }
                  }}
                  placeholder="Nhập họ và tên đầy đủ"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-xs text-[#20252B] transition focus:outline-none ${
                    profileErrors.fullName
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                  }`}
                />
                {profileErrors.fullName && (
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {profileErrors.fullName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, phone: e.target.value });
                    if (profileErrors.phone) {
                      setProfileErrors({ ...profileErrors, phone: undefined });
                    }
                  }}
                  placeholder="Ví dụ: 0912345678"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-xs text-[#20252B] transition focus:outline-none ${
                    profileErrors.phone
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                  }`}
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {profileErrors.phone}
                  </p>
                )}
              </div>

              {/* Address with VietnamAddressSelector */}
              <VietnamAddressSelector
                value={profileForm.address}
                onChange={(newAddress) => {
                  setProfileForm({ ...profileForm, address: newAddress });
                  if (profileErrors.address) {
                    setProfileErrors({ ...profileErrors, address: undefined });
                  }
                }}
                error={profileErrors.address}
              />

              {/* Form Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsEditProfileOpen(false)}
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cs-btn cs-btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ĐỔI MẬT KHẨU                                     */}
      {/* ========================================================= */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-white shadow-2xl transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Đổi mật khẩu tài khoản
                </h3>
                <p className="mt-0.5 text-xs text-[#66717C]">
                  Cập nhật mật khẩu mới có độ bảo mật cao cho tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 px-6 pb-6 pt-5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      });
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          currentPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Nhập mật khẩu hiện tại"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.currentPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showCurrentPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      });
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          newPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Tối thiểu 8 ký tự, có hoa, thường và số"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.newPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showNewPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {passwordErrors.newPassword}
                  </p>
                )}

                {/* Password strength indicator */}
                <PasswordStrengthIndicator password={passwordForm.newPassword} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      });
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          confirmPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.confirmPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-xs font-medium text-rose-500">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cs-btn cs-btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang cập nhật...
                    </>
                  ) : (
                    "Xác nhận đổi mật khẩu"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ĐỔI ẢNH ĐẠI DIỆN (AVATAR)                        */}
      {/* ========================================================= */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-white shadow-2xl transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Thay đổi ảnh đại diện
                </h3>
                <p className="mt-0.5 text-xs text-[#66717C]">
                  Tải ảnh từ máy tính hoặc chọn avatar phong cách có sẵn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 pb-6 pt-5">
              {/* Preview Avatar */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="relative h-24 w-24">
                  {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt="Preview Avatar"
                      className="h-24 w-24 rounded-full object-cover border-4 border-[#D6A85F] shadow-md"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-300 bg-slate-200 text-2xl font-bold text-slate-600 shadow-inner">
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Ảnh đại diện hiển thị hiện tại
                </p>
              </div>

              {/* Upload file */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cs-btn cs-btn-secondary"
                  >
                    <span>📁 Tải ảnh từ thiết bị</span>
                  </button>

                  {selectedAvatar && (
                    <button
                      type="button"
                      onClick={() => setSelectedAvatar("")}
                      className="cs-btn cs-btn-danger-outline"
                    >
                      Dùng chữ cái mặc định
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Định dạng hỗ trợ: PNG, JPG, JPEG, WebP. Tối đa 5MB.
                </p>
              </div>

              {/* Preset Avatars */}
              <div>
                <p className="text-xs font-semibold text-[#1F2933]">
                  Hoặc chọn nhanh từ bộ sưu tập:
                </p>
                <div className="mt-2.5 grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, index) => {
                    const isSelected = selectedAvatar === url;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setSelectedAvatar(url)}
                        className={`cursor-pointer group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                          isSelected
                            ? "border-[#D6A85F] ring-2 ring-[#D6A85F]/50 scale-105"
                            : "border-transparent hover:border-slate-300 hover:scale-105"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Preset ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#D6A85F]/30 text-white font-bold text-xs">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveAvatar}
                  className="cs-btn cs-btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu ảnh đại diện"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Account;