import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đảm bảo mảng giá trị có đúng độ dài
  const digits = Array.from({ length }, (_, index) => value[index] || "");

  useEffect(() => {
    // Tự động focus vào ô trống đầu tiên khi mount
    const firstEmptyIndex = digits.findIndex((d) => !d);
    const indexToFocus = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    inputRefs.current[indexToFocus]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) return;

    // Nếu người dùng nhập 1 chữ số
    const newDigit = rawVal.slice(-1);
    const chars = [...digits];
    chars[index] = newDigit;
    const combined = chars.join("").slice(0, length);
    onChange(combined);

    // Chuyển focus sang ô kế tiếp
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = [...digits];
      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join(""));
      } else if (index > 0) {
        chars[index - 1] = "";
        onChange(chars.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-11 sm:h-14 sm:w-12 text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none select-none ${
            hasError
              ? "border-red-400 bg-red-50/50 text-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-100"
              : digit
              ? "border-[#D6A85F] bg-[#FAF8F5] text-[#20252B] shadow-sm ring-1 ring-[#D6A85F]/30"
              : "border-[#E1E4E6] bg-white text-[#20252B] hover:border-slate-300 focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-text"}`}
        />
      ))}
    </div>
  );
}

export default OtpInput;
