"use client";

import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { GripHorizontal, ImageIcon, Upload } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { useCanvasImageFile } from "@/components/workflow/hooks/use-canvas-image-file";
import { cn } from "@/lib/utils";
import {
  CANVAS_IMAGE_MAX_HEIGHT,
  CANVAS_IMAGE_MAX_WIDTH,
  CANVAS_IMAGE_MIN_HEIGHT,
  CANVAS_IMAGE_MIN_WIDTH,
  parseCanvasImageConfig,
} from "@/lib/workflow/canvas-image";
import {
  updateNodeDataAtom,
  type WorkflowNodeData,
} from "@/lib/workflow-store";

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const nodeData = data as WorkflowNodeData;
  const imageConfig = useMemo(
    () => parseCanvasImageConfig(nodeData.config),
    [nodeData.config]
  );
  const src = imageConfig.src?.trim() ?? "";
  const alt = imageConfig.alt?.trim() || "Canvas image";

  const applyImage = useCallback(
    (patch: { src: string; alt?: string }) => {
      updateNodeData({
        id,
        data: {
          config: {
            ...nodeData.config,
            src: patch.src,
            ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
          },
        },
      });
    },
    [id, nodeData.config, updateNodeData]
  );

  const {
    dropZoneProps,
    fileInputRef,
    isDragOver,
    onFileInputChange,
    openFilePicker,
  } = useCanvasImageFile({
    currentAlt: imageConfig.alt,
    onApply: applyImage,
  });

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
        <input
          accept="image/*"
          className="hidden"
          onChange={onFileInputChange}
          ref={fileInputRef}
          type="file"
        />
        <div className="relative min-h-0 flex-1">
          {src ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: user URLs and data URLs are not next/image remote hosts */}
              <img
                alt={alt}
                className="h-full w-full object-contain"
                src={src}
              />
              <button
                className={cn(
                  "nodrag nopan absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 px-4 text-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
                  isDragOver && "opacity-100"
                )}
                onClick={openFilePicker}
                type="button"
                {...dropZoneProps}
              >
                <Upload className="size-6 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  {isDragOver
                    ? "Drop to replace image"
                    : "Click or drag to replace"}
                </p>
              </button>
            </>
          ) : (
            <button
              className={cn(
                "nodrag nopan flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground transition-colors",
                isDragOver && "bg-primary/5 text-foreground"
              )}
              onClick={openFilePicker}
              type="button"
              {...dropZoneProps}
            >
              <ImageIcon className="size-8" />
              <p className="text-xs">
                {isDragOver ? "Drop image here" : "Click or drag an image here"}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const ImageNode = memo(ImageNodeComponent);
