import { Box } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_RENDER_SIZE } from "@/lib/brand/brand-logo";

export function ProtocolIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return <Box className={className} />;
}

export function createProtocolIconComponent(
  iconPath: string,
  name: string
): React.ComponentType<{ className?: string }> {
  function Icon({ className }: { className?: string }): React.ReactElement {
    return (
      <span
        className={cn("relative inline-block shrink-0", className)}
        role="img"
        aria-label={name}
      >
        <Image
          alt={name}
          className="h-full w-full object-contain"
          height={BRAND_LOGO_RENDER_SIZE}
          src={iconPath}
          width={BRAND_LOGO_RENDER_SIZE}
        />
      </span>
    );
  }
  Icon.displayName = `${name.replace(/\s+/g, "")}Icon`;
  return Icon;
}
