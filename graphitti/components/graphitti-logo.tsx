import Image from "next/image";
import { cn } from "@/lib/utils";

type GraphittiLogoProps = {
  className?: string;
  size?: number;
};

export function GraphittiLogo({
  className,
  size = 24,
}: GraphittiLogoProps): React.ReactElement {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Image
        alt="Graphitti"
        className="dark:hidden"
        height={size}
        src="/logo-light.png"
        width={size}
      />
      <Image
        alt=""
        aria-hidden
        className="hidden dark:block"
        height={size}
        src="/logo-dark.png"
        width={size}
      />
    </span>
  );
}
