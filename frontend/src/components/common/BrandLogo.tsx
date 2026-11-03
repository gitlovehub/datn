import { Link } from "react-router-dom";
import BrandMark from "./BrandMark";

type BrandLogoProps = {
  to?: string;
  className?: string;
  subtitle?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

export default function BrandLogo({
  to = "/",
  className = "",
  subtitle = "Dịch vụ chăm sóc ô tô",
  theme = "light",
  size = "md",
}: BrandLogoProps) {
  const markSize = size === "sm" ? 34 : size === "lg" ? 48 : 40;

  const titleClass =
    size === "sm"
      ? "text-[15px]"
      : size === "lg"
      ? "text-[20px]"
      : "text-[17px]";

  const subtitleClass =
    size === "lg"
      ? "text-xs tracking-[0.2em]"
      : "text-xs tracking-[0.18em]";

  const isDark = theme === "dark";

  return (
    <Link
      to={to}
      aria-label="CarService - Trang chủ"
      className={`group flex items-center gap-3 ${className}`}
    >
      <BrandMark
        size={markSize}
        className="transition duration-300 group-hover:-translate-y-0.5 group-hover:drop-shadow-[0_6px_14px_rgba(214,168,95,0.35)]"
      />

      <div className="leading-none">
        <p
          className={`font-extrabold tracking-tight ${titleClass} ${
            isDark ? "text-white" : "text-[#1F2933]"
          }`}
        >
          Car
          <span className={isDark ? "text-[#D6A85F]" : "text-[#B68A43]"}>
            Service
          </span>
        </p>

        {subtitle && (
          <p
            className={`mt-1.5 font-semibold uppercase ${subtitleClass} ${
              isDark ? "text-[#AEB8C1]" : "text-[#8A949E]"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
