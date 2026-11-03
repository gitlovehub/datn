import { useId } from "react";

type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * CarService emblem: dark badge, gold speed-gauge arc and a sleek car silhouette.
 * Pure SVG so it stays crisp at any size (header, sidebar, footer, favicon).
 */
export default function BrandMark({
  size = 40,
  className = "",
  title = "CarService",
}: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const bg = `cs-bg-${uid}`;
  const gold = `cs-gold-${uid}`;
  const shine = `cs-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bg} x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E3A46" />
          <stop offset="1" stopColor="#141B22" />
        </linearGradient>
        <linearGradient id={gold} x1="10" y1="14" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F1D08E" />
          <stop offset="0.55" stopColor="#D6A85F" />
          <stop offset="1" stopColor="#B68A43" />
        </linearGradient>
        <linearGradient id={shine} x1="24" y1="0" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill={`url(#${bg})`} />
      <rect width="48" height="48" rx="13" fill={`url(#${shine})`} />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="12.25"
        fill="none"
        stroke="#D6A85F"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />

      {/* speed gauge arc */}
      <path
        d="M11.5 20.5A13.2 13.2 0 0 1 36.5 20.5"
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M24 9.2v2.6" stroke="#D6A85F" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.6 12.9l1.6 1.9M32.4 12.9l-1.6 1.9" stroke="#D6A85F" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />

      {/* car body */}
      <path
        d="M9.5 33.2l1.6-5.6c.4-1.4 1.6-2.3 3-2.4l3.2-.2 3.2-3.1c.8-.7 1.7-1.1 2.7-1.1h5.6c1.2 0 2.3.5 3.1 1.4l2.7 3.2 2.6.5c1.7.3 2.9 1.8 2.9 3.5v3.8H9.5z"
        fill={`url(#${gold})`}
      />
      {/* windows */}
      <path
        d="M19.3 25.1l2.2-2.1c.4-.3.8-.5 1.3-.5h2.1v2.9h-5.6zM27.2 22.5h1.2c.5 0 1 .2 1.3.6l1.9 2h-4.4v-2.6z"
        fill="#141B22"
        fillOpacity="0.85"
      />
      {/* wheels */}
      <circle cx="16.5" cy="33.6" r="3.5" fill="#141B22" stroke="#F1D08E" strokeWidth="1.5" />
      <circle cx="31.5" cy="33.6" r="3.5" fill="#141B22" stroke="#F1D08E" strokeWidth="1.5" />
      <circle cx="16.5" cy="33.6" r="1.1" fill="#D6A85F" />
      <circle cx="31.5" cy="33.6" r="1.1" fill="#D6A85F" />

      {/* road line */}
      <path d="M12 40.2h24" stroke="#D6A85F" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
