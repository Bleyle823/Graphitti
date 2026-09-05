export function PrivyIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Privy logo"
      className={`fill-black dark:fill-white ${className ?? ""}`}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Privy</title>
      <circle cx="12" cy="9" r="6.5" />
      <ellipse cx="12" cy="20" rx="7" ry="2" />
    </svg>
  );
}
