import { cn } from "@/lib/utils";

export function TheGraphIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="The Graph logo"
      className={cn("fill-[#2A1B4A] dark:fill-white", className)}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>The Graph</title>
      <path
        d="M10.3 3.9a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 0 1 0-15.2zm0 3.35a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5z"
        fillRule="evenodd"
      />
      <circle cx="18.7" cy="6.65" r="1.55" />
      <rect
        height="2.7"
        rx="1.35"
        transform="rotate(48 14.85 19.05)"
        width="4.4"
        x="12.65"
        y="17.7"
      />
    </svg>
  );
}
