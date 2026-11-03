import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { getRoleManagementPage, setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import { AtelierAuthError, AtelierAuthLayout, AtelierField } from "../../components/AtelierPublic";

const REMEMBER_EMAIL_KEY = "carservice_remembered_email";

type Step = "login" | "otp";

type ApiErrorDetails = {
  message?: string;
  errors?: Record<string, string[]>;
};

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

const getApiErrorDetails = (error: unknown): ApiErrorDetails => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return {};
  }

  const data = (error as { data: unknown }).data;

  if (typeof data !== "object" || data === null) {
    return {};
  }

  const message =
    "message" in data && typeof data.message === "string"
      ? data.message
      : undefined;

  const errors: Record<string, string[]> = {};

  if (
    "errors" in data &&
    typeof data.errors === "object" &&
    data.errors !== null
  ) {
    for (const [field, messages] of Object.entries(
      data.errors as Record<string, unknown>,
    )) {
      if (Array.isArray(messages)) {
        errors[field] = messages.filter(
          (value): value is string => typeof value === "string",
        );
      }
    }
  }

  return { message, errors };
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Only the email is remembered locally; never store a plaintext password.
  const [rememberMe, setRememberMe] = useState(() =>
    typeof window !== "undefined" &&
    localStorage.getItem(REMEMBER_EMAIL_KEY) !== null,
  );

  const [form, setForm] = useState(() => ({
    email:
      typeof window !== "undefined"
        ? localStorage.getItem(REMEMBER_EMAIL_KEY) || ""
        : "",
    password: "",
  }));

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setTimeout(() => {
      setResendCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const goToDashboard = (role: string) => {
    const validRoles = [
      "CUSTOMER",
      "ADVISOR",
      "ADMIN",
    ];

    if (!validRoles.includes(role)) {
      setApiError("Tài khoản không có vai trò hợp lệ.");
      return;
    }

    const state = location.state as LocationState | null;
    const from = state?.from;
    const requestedPath = from?.pathname || "";

    const rolePage = getRoleManagementPage(role);
    const isBooking = requestedPath === "/booking";

    const isAllowedPath =
      role === "CUSTOMER"
        ? requestedPath.startsWith("/customer/") ||
          [
            "/booking",
            "/appointments",
            "/cars",
            "/account",
            "/contact",
            "/repair-status",
            "/quotation",
            "/payment",
            "/invoices",
            "/reviews",
          ].includes(requestedPath)
        : role === "ADMIN"
          ? requestedPath.startsWith("/admin/") ||
            requestedPath === "/admin"
          : role === "ADVISOR"
            ? requestedPath.startsWith("/advisor/")
            : false;

    if (isBooking && role !== "CUSTOMER") {
      navigate(rolePage?.path || "/", { replace: true });
      return;
    }

    if (from && isAllowedPath) {
      navigate(
        {
          pathname: from.pathname || "/",
          search: from.search || "",
          hash: from.hash || "",
        },
        { replace: true },
      );
      return;
    }

    navigate(rolePage?.path || "/", { replace: true });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const sendOtpForPendingAccount = async (email: string) => {
    setPendingEmail(email);

    await fetchApi("/resend-email-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setResendCountdown(60);
    setStep("otp");
    showToast("Mã xác thực OTP đã được gửi đến email của bạn.", "info");
  };

  const saveRememberedEmail = (email: string) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetchApi("/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          device_name: "web",
        }),
      });

      if (response?.account?.role === "TECHNICIAN") {
        // Khu vực KTV đã bỏ: cố vấn ghi kết quả kiểm tra. Thu hồi token vừa cấp, không lưu phiên.
        if (response.token) {
          void fetchApi("/logout", { method: "POST", headers: { Authorization: `Bearer ${response.token}` } }).catch(() => undefined);
        }
        setApiError("Tài khoản kỹ thuật viên không có màn hình riêng. Kết quả kiểm tra do cố vấn ghi trên phiếu sửa chữa.");
        return;
      }

      if (response?.account?.role) {
        saveRememberedEmail(form.email.trim());

        localStorage.setItem(
          "token",
          response.token || "session_authenticated",
        );
        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role);

        showToast("Đăng nhập thành công! Đang chuyển hướng...", "success");

        setTimeout(() => {
          goToDashboard(response.account.role);
        }, 500);

        return;
      }

      setApiError("Không nhận được dữ liệu xác thực từ máy chủ.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      const backendMessage = details.message || "";
      const emailErrors = details.errors?.email || [];
      const otpErrors = details.errors?.otp || [];

      if (
        backendMessage.toLowerCase().includes("chưa xác thực") ||
        backendMessage.toLowerCase().includes("otp") ||
        emailErrors.some((message) =>
          /chưa xác thực|otp/i.test(message),
        ) ||
        otpErrors.length > 0
      ) {
        try {
          await sendOtpForPendingAccount(form.email.trim());
        } catch (resendError: unknown) {
          const resendDetails = getApiErrorDetails(resendError);
          setPendingEmail(form.email.trim());
          setStep("otp");
          setResendCountdown(60);
          setApiError(
            resendDetails.message ||
              "Không gửi được mã OTP. Vui lòng thử lại sau.",
          );
        }

        return;
      }

      setApiError(
        emailErrors[0] ||
          backendMessage ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!pendingEmail) {
      setStep("login");
      setApiError("Không tìm thấy email cần xác thực.");
      return;
    }

    if (!otp || otp.length !== 6) {
      setApiError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetchApi("/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: pendingEmail,
          otp,
        }),
      });

      const finalToken = response?.token;
      const finalAccount = response?.account || null;

      if (finalAccount?.role) {
        saveRememberedEmail(pendingEmail);

        if (finalToken) {
          localStorage.setItem("token", finalToken);
        }

        localStorage.setItem("user", JSON.stringify(finalAccount));
        setUserRole(finalAccount.role);

        showToast("Xác thực OTP thành công!", "success");

        setTimeout(() => {
          goToDashboard(finalAccount.role);
        }, 500);

        return;
      }

      setApiError("Xác thực OTP không thành công.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);

      setApiError(
        details.errors?.otp?.[0] ||
          details.message ||
          "Mã OTP không chính xác hoặc đã hết hạn.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) {
      setApiError("Không tìm thấy email cần gửi lại OTP.");
      return;
    }

    if (resendCountdown > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });

      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(details.message || "Không thể gửi lại mã OTP lúc này.");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = "block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]";
  const primaryClass = "flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-[#cf2935] px-6 py-4 text-sm font-bold !font-semibold text-white transition hover:bg-[#b92430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] disabled:cursor-not-allowed disabled:opacity-55";

  return (
    <AtelierAuthLayout
      title={step === "login" ? "Đăng nhập" : "Xác thực email"}
      description={step === "login" ? "Vui lòng nhập địa chỉ email và mật khẩu của bạn:" : `Nhập mã OTP được gửi tới ${pendingEmail}.`}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {apiError && <AtelierAuthError message={apiError} />}
      {step === "login" ? (
        <>
          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <AtelierField htmlFor="login-email" label="Địa chỉ email" error={errors.email}>
              <input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email} className={fieldClass} />
            </AtelierField>
            <AtelierField htmlFor="login-password" label="Mật khẩu" error={errors.password}>
              <div className="relative">
                <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Nhập mật khẩu" value={form.password} onChange={handleChange} aria-invalid={!!errors.password} className={`${fieldClass} pr-16`} />
                <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#757575] hover:text-[#cf2935]">{showPassword ? "Ẩn" : "Hiện"}</button>
              </div>
            </AtelierField>
            <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs text-[#757575]">
              <label htmlFor="login-remember" className="inline-flex cursor-pointer items-center gap-2.5">
                <input id="login-remember" type="checkbox" checked={rememberMe} onChange={e => { setRememberMe(e.target.checked); if (!e.target.checked) localStorage.removeItem(REMEMBER_EMAIL_KEY); }} className="size-4 cursor-pointer accent-[#cf2935]" />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" className="cursor-pointer font-bold hover:text-[#cf2935] hover:underline">Quên mật khẩu?</Link>
            </div>
            <button type="submit" disabled={isLoading} className={primaryClass}>{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </form>
          <p className="mt-5 mb-3 text-center text-sm text-[#757575]">Chưa có tài khoản?</p>
          <Link to="/register" className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl border border-[#e9e9e6] bg-[#252525] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#393939] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]">Đăng ký</Link>
        </>
      ) : (
        <>
          <form className="grid gap-4" onSubmit={handleOtpSubmit} noValidate>
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!apiError} />
            <button type="submit" disabled={isLoading || otp.length !== 6} className={primaryClass}>{isLoading ? "Đang xác thực..." : "Xác thực email →"}</button>
          </form>
          <div className="mt-5 grid gap-3 text-xs text-[#757575] [&_button]:cursor-pointer [&_button]:text-left [&_button]:font-extrabold [&_button]:text-[#cf2935] [&_button:disabled]:cursor-not-allowed">
            {resendCountdown > 0 ? <span>Gửi lại OTP sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại OTP</button>}
            <button type="button" onClick={() => { setStep("login"); setOtp(""); setApiError(""); }}>← Quay lại đăng nhập</button>
          </div>
        </>
      )}
    </AtelierAuthLayout>
  );
}

export default Login;
