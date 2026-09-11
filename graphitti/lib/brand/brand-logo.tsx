import Image from "next/image";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/** Intrinsic render size — displayed size comes from className (e.g. size-12). */
export const BRAND_LOGO_RENDER_SIZE = 128;

export type BrandLogoAsset = {
  light: string;
  dark?: string;
};

type BrandLogoProps = {
  alt: string;
  asset: BrandLogoAsset;
  className?: string;
};

export function BrandLogo({ alt, asset, className }: BrandLogoProps) {
  const darkSrc = asset.dark ?? asset.light;

  return (
    <span
      aria-label={alt}
      className={cn("relative inline-block shrink-0", className)}
      role="img"
    >
      <Image
        alt={alt}
        className="h-full w-full object-contain dark:hidden"
        height={BRAND_LOGO_RENDER_SIZE}
        src={asset.light}
        width={BRAND_LOGO_RENDER_SIZE}
      />
      <Image
        alt=""
        aria-hidden
        className="hidden h-full w-full object-contain dark:block"
        height={BRAND_LOGO_RENDER_SIZE}
        src={darkSrc}
        width={BRAND_LOGO_RENDER_SIZE}
      />
    </span>
  );
}

export function createBrandLogoIcon(
  asset: BrandLogoAsset,
  alt: string
): ComponentType<{ className?: string }> {
  function BrandLogoIcon({ className }: { className?: string }) {
    return <BrandLogo alt={alt} asset={asset} className={className} />;
  }
  BrandLogoIcon.displayName = `${alt.replace(/\s+/g, "")}Icon`;
  return BrandLogoIcon;
}
