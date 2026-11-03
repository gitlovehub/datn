import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import { AtelierAuthError, AtelierAuthLayout, AtelierField } from "../../components/AtelierPublic";

type ApiErrorResponse = {
  message?: string;
  data?: {
    message?: string;
    errors?: Record<string, string[] | string>;
  };
};

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: "",
  });

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"REGISTER" | "OTP">("REGISTER");
  const [otp, setOtp] = useState("");

  // Countdown timer cho gửi lại OTP (60s)
  const [resendCountdown, setResendCountdown] = useState(0);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });

    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      agree: "",
    };

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordUppercase = /[A-Z]/;
    const passwordLowercase = /[a-z]/;
    const passwordNumber = /[0-9]/;

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên của bạn.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không đúng định dạng (VD: 0912345678).";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (form.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (!passwordUppercase.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ cái viết hoa.";
    } else if (!passwordLowercase.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ cái viết thường.";
    } else if (!passwordNumber.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ số.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu xác nhận.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!form.agree) {
      newErrors.agree = "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== "");
  };

  const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (typeof error !== "object" || error === null) {
      return defaultMessage;
    }

    const err = error as ApiErrorResponse;

    if (err.data?.errors) {
      const validationErrors = err.data.errors;
      const firstKey = Object.keys(validationErrors)[0];

      if (firstKey) {
        const firstError = validationErrors[firstKey];

        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }

        if (typeof firstError === "string") {
          return firstError;
        }
      }
    }

    if (err.data?.message) {
      return err.data.message;
    }

    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      const msg = (err as { message: string }).message;
      if (msg === "Failed to fetch") {
        return "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.";
      }
      return msg;
    }

    return defaultMessage;
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.confirmPassword,
          accept_terms: form.agree,
        }),
      });

      setResendCountdown(60);
      setStep("OTP");
      showToast("Đăng ký thành công! Mã xác thực OTP đã được gửi đến email của bạn.", "success");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(
          error,
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
          email: form.email.trim(),
          otp,
        }),
      });

      // Tự động lưu phiên đăng nhập ngay sau khi xác thực OTP thành công
      if (response?.account) {
        if (response.token) {
          localStorage.setItem("token", response.token);
        }
        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role || "CUSTOMER");
        showToast("Xác thực email thành công! Đang chuyển hướng vào hệ thống...", "success");
        setTimeout(() => {
          navigate("/");
        }, 800);
        return;
      }

      showToast("Xác thực email thành công! Vui lòng đăng nhập.", "success");
      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Mã OTP không chính xác hoặc đã hết hạn.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
        }),
      });

      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Không thể gửi lại mã OTP lúc này.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return <AtelierAuthLayout title={step === "REGISTER" ? "Đăng ký" : "Xác thực tài khoản."} description={step === "REGISTER" ? "Đăng ký để quản lý xe và đặt lịch bảo dưỡng." : `Mã xác thực đã gửi đến ${form.email}.`}>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    {apiError && <AtelierAuthError message={apiError} />}
    {step === "REGISTER" ? <>
      <form className="grid gap-4" onSubmit={handleRegisterSubmit} noValidate>
        <AtelierField htmlFor="reg-name" label="Họ và tên" error={errors.fullName}><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type="text" id="reg-name" name="fullName" autoComplete="name" placeholder="Nguyễn Văn A" value={form.fullName} onChange={handleChange} aria-invalid={!!errors.fullName} /></AtelierField>
        <AtelierField htmlFor="reg-phone" label="Số điện thoại" error={errors.phone}><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type="tel" id="reg-phone" name="phone" autoComplete="tel" placeholder="0912345678" value={form.phone} onChange={handleChange} aria-invalid={!!errors.phone} /></AtelierField>
        <AtelierField htmlFor="reg-email" label="Địa chỉ email" error={errors.email}><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type="email" id="reg-email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email} /></AtelierField>
        <AtelierField htmlFor="reg-password" label="Mật khẩu" error={errors.password}><div className="relative"><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type={showPassword ? "text" : "password"} id="reg-password" name="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={handleChange} aria-invalid={!!errors.password}/><button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#757575] hover:text-[#cf2935]" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Ẩn" : "Hiện"}</button></div></AtelierField>
        <PasswordStrengthIndicator password={form.password}/>
        <AtelierField htmlFor="reg-confirm" label="Xác nhận mật khẩu" error={errors.confirmPassword}><div className="relative"><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type={showConfirmPassword ? "text" : "password"} id="reg-confirm" name="confirmPassword" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={handleChange} aria-invalid={!!errors.confirmPassword}/><button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#757575] hover:text-[#cf2935]" type="button" onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? "Ẩn" : "Hiện"}</button></div></AtelierField>
        <label className="flex cursor-pointer items-start gap-3 text-xs text-[#757575] [&_input]:mt-0.5 [&_input]:accent-[#cf2935]"><input name="agree" type="checkbox" checked={form.agree} onChange={handleChange}/><span>Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của CarService.</span></label>
        {errors.agree && <p className="text-xs font-bold text-[#dc4250]">{errors.agree}</p>}
        <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm !font-semibold w-full" disabled={isLoading}>{isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}</button>
      </form>
      <p className="mt-5 mb-3 text-base text-[#757575] [&_a]:font-extrabold [&_a]:text-[#cf2935] [&_a]:hover:underline">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </> : <>
      <form className="grid gap-4" onSubmit={handleOtpSubmit} noValidate><OtpInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!apiError}/><button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm w-full" disabled={isLoading || otp.length !== 6}>{isLoading ? "Đang xác minh..." : "Xác thực email →"}</button></form>
      <div className="mt-5 grid gap-3 text-xs text-[#757575] [&_button]:cursor-pointer [&_button]:text-left [&_button]:font-extrabold [&_button]:text-[#cf2935] [&_button:disabled]:cursor-not-allowed">{resendCountdown > 0 ? <span>Gửi lại OTP sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại OTP</button>}<button type="button" onClick={() => {setStep("REGISTER");setOtp("");setApiError("");}}>← Chỉnh sửa thông tin</button></div>
    </>}
  </AtelierAuthLayout>;

}

export default Register;