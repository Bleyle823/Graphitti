export function ArcIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Arc logo"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Arc</title>
      <path
        d="M16 4.5a11.5 11.5 0 1 1-8.13 19.63"
        stroke="#0EA5A4"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M9.2 26.2 16 8.8l6.8 17.4"
        stroke="#115E59"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
      <path
        d="M11.6 20.2h8.8"
        stroke="#0EA5A4"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
