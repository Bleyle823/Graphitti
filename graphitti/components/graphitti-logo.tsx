import Image from "next/image";
import { cn } from "@/lib/utils";

type GraphittiLogoProps = {
  className?: string;
  size?: number;
};

export function GraphittiLogo({
  className,
  size = 32,
}: GraphittiLogoProps): React.ReactElement {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Image
        alt="Graphitti"
        className="size-full object-contain dark:hidden"
        height={size}
        priority
        src="/logo-light.png"
        width={size}
      />
      <Image
        alt=""
        aria-hidden
        className="hidden size-full object-contain dark:block"
        height={size}
        priority
        src="/logo-dark.png"
        width={size}
      />
    </span>
  );
}
