export function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Circle logo"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Circle</title>
      <defs>
        <linearGradient
          id="circle-mark-tl"
          x1="5"
          x2="18"
          y1="4"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#6EE7B7" />
        </linearGradient>
        <linearGradient
          id="circle-mark-br"
          x1="28"
          x2="14"
          y1="28"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
      <path
        d="M25.4 7.8A11.2 11.2 0 0 0 8.2 23.6"
        stroke="url(#circle-mark-tl)"
        strokeLinecap="round"
        strokeWidth="5.4"
      />
      <path
        d="M6.6 24.2A11.2 11.2 0 0 0 23.8 8.4"
        stroke="url(#circle-mark-br)"
        strokeLinecap="round"
        strokeWidth="5.4"
      />
    </svg>
  );
}
