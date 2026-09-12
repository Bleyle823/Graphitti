"use client";

import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { GripHorizontal, ImageIcon } from "lucide-react";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CANVAS_IMAGE_MAX_HEIGHT,
  CANVAS_IMAGE_MAX_WIDTH,
  CANVAS_IMAGE_MIN_HEIGHT,
  CANVAS_IMAGE_MIN_WIDTH,
  parseCanvasImageConfig,
} from "@/lib/workflow/canvas-image";
import type { WorkflowNodeData } from "@/lib/workflow-store";

function ImageNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const imageConfig = useMemo(
    () => parseCanvasImageConfig(nodeData.config),
    [nodeData.config]
  );
  const src = imageConfig.src?.trim() ?? "";
  const alt = imageConfig.alt?.trim() || "Canvas image";

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        handleClassName="!size-2.5 !rounded-sm !border-border !bg-background"
        isVisible={selected}
        lineClassName="!border-primary/40"
        maxHeight={CANVAS_IMAGE_MAX_HEIGHT}
        maxWidth={CANVAS_IMAGE_MAX_WIDTH}
        minHeight={CANVAS_IMAGE_MIN_HEIGHT}
        minWidth={CANVAS_IMAGE_MIN_WIDTH}
      />
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
          selected ? "border-primary" : "border-border"
        )}
      >
        <div className="canvas-image-drag-handle flex h-6 cursor-grab items-center justify-center border-b bg-muted/60 active:cursor-grabbing">
          <GripHorizontal className="size-3.5 text-muted-foreground" />
        </div>
        <div className="relative min-h-0 flex-1">
          {src ? (
            // biome-ignore lint/performance/noImgElement: user URLs and data URLs are not next/image remote hosts
            <img alt={alt} className="h-full w-full object-contain" src={src} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
              <ImageIcon className="size-8" />
              <p className="text-xs">Add an image URL or upload a file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ImageNode = memo(ImageNodeComponent);
