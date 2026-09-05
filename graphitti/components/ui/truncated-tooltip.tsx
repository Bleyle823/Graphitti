"use client";

import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TruncatedTooltipProps = {
  text: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export function TruncatedTooltip({
  text,
  className,
  side = "right",
}: TruncatedTooltipProps): React.ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setTruncated(el.scrollWidth > el.clientWidth);
  }, [text]);

  const label = (
    <span className={cn("block truncate", className)} ref={ref}>
      {text}
    </span>
  );

  if (!truncated) {
    return label;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}
