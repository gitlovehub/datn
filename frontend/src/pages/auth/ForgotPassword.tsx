import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import { AtelierAuthError, AtelierAuthLayout, AtelierField } from "../../components/AtelierPublic";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [step, setStep] = useState<"FORGOT" | "RESET" | "SUCCESS">("FORGOT");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Vui lòng nhập địa chỉ email đã đăng ký.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Email không đúng định dạng.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      setStep("RESET");
      showToast("Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.", "info");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setErrorMsg(error.data?.message || "Đã xảy ra sự cố kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordUppercase = /[A-Z]/;
    const passwordLowercase = /[a-z]/;
    const passwordNumber = /[0-9]/;

    if (!otp || otp.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Vui lòng nhập mật khẩu mới.");
      return;
    } else if (newPassword.length < 8) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    } else if (!passwordUppercase.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ cái viết hoa.");
      return;
    } else if (!passwordLowercase.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ cái viết thường.");
      return;
    } else if (!passwordNumber.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ số.");
      return;
    }

    if (!confirmPassword) {
      setErrorMsg("Vui lòng xác nhận lại mật khẩu mới.");
      return;
    } else if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/reset-password", {
        method: "POST",
        body: JSON.stringify({ 
          email: email.trim(),
          otp,
          password: newPassword,
          password_confirmation: confirmPassword
        }),
      });
      setStep("SUCCESS");
      showToast("Đặt lại mật khẩu thành công!", "success");
    } catch (err: unknown) {
      const error = err as {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };
      setErrorMsg(
        error.data?.errors?.password?.[0] || 
        error.data?.errors?.otp?.[0] || 
        error.data?.message || 
        "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setErrorMsg(error.data?.message || "Không thể gửi lại mã OTP lúc này.");
    } finally {
      setIsLoading(false);
    }
  };

  return <AtelierAuthLayout title={step === "FORGOT" ? "Khôi phục mật khẩu" : step === "RESET" ? "Đặt lại mật khẩu" : "Hoàn tất xác thực"} description={step === "FORGOT" ? "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu." : step === "RESET" ? `Mã OTP đã gửi tới ${email}.` : "Mật khẩu của bạn đã được cập nhật thành công."}>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    {errorMsg && <AtelierAuthError message={errorMsg} />}
    {step === "FORGOT" && <><form className="grid gap-4" onSubmit={handleForgotSubmit}>
      <AtelierField label="Email đã đăng ký"><input type="email" className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => {setEmail(e.target.value); setErrorMsg("");}} /></AtelierField>
      <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold !font-semibold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm w-full" disabled={isLoading || !email.trim()}>{isLoading ? "Đang gửi mã..." : "Gửi mã xác thực OTP →"}</button></form>
      <p className="mt-5 mb-3 text-base text-[#757575] [&_a]:font-extrabold [&_a]:text-[#cf2935] [&_a]:hover:underline">Nhớ mật khẩu? <Link to="/login">Đăng nhập ngay</Link></p>
    </>}
    {step === "RESET" && <><form className="grid gap-4" onSubmit={handleResetSubmit}>
      <AtelierField label="Mã OTP 6 số"><OtpInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!errorMsg}/></AtelierField>
      <AtelierField label="Mật khẩu mới"><div className="relative"><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Ít nhất 8 ký tự" value={newPassword} onChange={e => {setNewPassword(e.target.value);setErrorMsg("");}}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#757575] hover:text-[#cf2935]" onClick={() => setShowPassword(s => !s)}>{showPassword ? "Ẩn" : "Hiện"}</button></div></AtelierField>
      <PasswordStrengthIndicator password={newPassword}/>
      <AtelierField label="Nhập lại mật khẩu"><div className="relative"><input className="block w-full min-w-0 min-h-12 rounded-xl border border-[#e9e9e6] bg-white px-3.5 py-3 text-sm text-[#191919] outline-none placeholder:text-[#999] focus:border-[#cf2935] focus:ring-[3px] focus:ring-[#cf2935]/10 aria-invalid:border-[#d34953] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={e => {setConfirmPassword(e.target.value);setErrorMsg("");}}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#757575] hover:text-[#cf2935]" onClick={() => setShowConfirmPassword(s => !s)}>{showConfirmPassword ? "Ẩn" : "Hiện"}</button></div></AtelierField>
      <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm w-full" disabled={isLoading || otp.length !== 6 || !newPassword}>{isLoading ? "Đang đặt lại mật khẩu..." : "Lưu mật khẩu mới →"}</button></form>
      <div className="mt-5 grid gap-3 text-xs text-[#757575] [&_button]:cursor-pointer [&_button]:text-left [&_button]:font-extrabold [&_button]:text-[#cf2935] [&_button:disabled]:cursor-not-allowed">{resendCountdown > 0 ? <span>Gửi lại mã sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại mã OTP</button>}<button type="button" onClick={() => {setStep("FORGOT");setOtp("");setErrorMsg("");}}>← Thay đổi email</button></div>
    </>}
    {step === "SUCCESS" && <><div className="mb-5 rounded-xl border border-[#70ae8a] bg-[#e8f7ed] p-4 font-extrabold text-[#191919]">✓ Mật khẩu đã cập nhật thành công.</div><button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm w-full" onClick={() => navigate('/login')}>Đăng nhập vào hệ thống →</button></>}
  </AtelierAuthLayout>;

}

export default ForgotPassword;