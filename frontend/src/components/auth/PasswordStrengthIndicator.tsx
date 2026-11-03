import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const requirements = useMemo(() => {
    return [
      {
        label: "Tối thiểu 8 ký tự",
        met: password.length >= 8,
      },
      {
        label: "Chữ viết hoa (A-Z)",
        met: /[A-Z]/.test(password),
      },
      {
        label: "Chữ viết thường (a-z)",
        met: /[a-z]/.test(password),
      },
      {
        label: "Chữ số (0-9)",
        met: /[0-9]/.test(password),
      },
    ];
  }, [password]);

  if (!password) {
    return null;
  }

  const metCount = requirements.filter((r) => r.met).length;
  const strengthLevels = ["Rất yếu", "Yếu", "Trung bình", "Khá tốt", "Rất mạnh"];
  const strengthText = strengthLevels[metCount];

  const colorStyles = [
    "bg-slate-200",
    "bg-rose-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ][metCount];

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-3 text-left">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
        <span
          className={`font-semibold ${
            metCount <= 1
              ? "text-rose-600"
              : metCount <= 2
              ? "text-amber-600"
              : metCount === 3
              ? "text-blue-600"
              : "text-emerald-600"
          }`}
        >
          {strengthText}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              metCount >= step ? colorStyles : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Rules checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 transition-colors ${
              req.met ? "text-emerald-700 font-medium" : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                req.met
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {req.met ? "✓" : "•"}
            </span>
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordStrengthIndicator;
