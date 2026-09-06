"use client";

import { blo } from "blo";
import { cn } from "@/lib/utils";

type WalletBlockieProps = {
  address: string;
  size?: number;
  className?: string;
};

export function WalletBlockie({
  address,
  size = 20,
  className,
}: WalletBlockieProps) {
  return (
    // biome-ignore lint/performance/noImgElement: blo returns a data URL; Next/Image is unnecessary
    <img
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-full", className)}
      height={size}
      src={blo(address as `0x${string}`)}
      width={size}
    />
  );
}
