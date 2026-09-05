export function FantasyPremierLeagueIcon({ className }: { className?: string }) {
  return (
    <span aria-label="Premier League" className={className} role="img">
      <img
        alt="Premier League"
        className="block h-full w-full object-contain dark:hidden"
        height={64}
        src="/brand/pl-logo-compact-dark.png"
        width={64}
      />
      <img
        alt=""
        className="hidden h-full w-full object-contain dark:block"
        height={64}
        src="/brand/pl-logo-compact-light.png"
        width={64}
      />
    </span>
  );
}
