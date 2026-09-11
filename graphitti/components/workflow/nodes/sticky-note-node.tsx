"use client";

import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { useSetAtom } from "jotai";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  GripHorizontal,
} from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  parseStickyNoteConfig,
  STICKY_NOTE_COLOR_CLASSES,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_FONT_SIZE_CLASSES,
  STICKY_NOTE_MAX_HEIGHT,
  STICKY_NOTE_MAX_WIDTH,
  STICKY_NOTE_MIN_HEIGHT,
  STICKY_NOTE_MIN_WIDTH,
  STICKY_NOTE_SWATCH_CLASSES,
  STICKY_NOTE_TEXT_ALIGN_CLASSES,
  type StickyNoteColor,
  type StickyNoteFontSize,
  type StickyNoteTextAlign,
} from "@/lib/workflow/sticky-note";
import {
  updateNodeDataAtom,
  type WorkflowNodeData,
} from "@/lib/workflow-store";

const TEXT_ALIGN_OPTIONS: StickyNoteTextAlign[] = ["left", "center", "right"];

const TEXT_ALIGN_ICONS: Record<StickyNoteTextAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

function StickyNoteNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const nodeData = data as WorkflowNodeData;
  const noteConfig = useMemo(
    () => parseStickyNoteConfig(nodeData.config),
    [nodeData.config]
  );

  const updateConfig = useCallback(
    (patch: Record<string, unknown>) => {
      updateNodeData({
        id,
        data: {
          config: {
            ...nodeData.config,
            ...patch,
          },
        },
      });
    },
    [id, nodeData.config, updateNodeData]
  );

  const color = noteConfig.color ?? "yellow";
  const textAlign = noteConfig.textAlign ?? "left";

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        handleClassName="!size-2.5 !rounded-sm !border-border !bg-background"
        isVisible={selected}
        lineClassName="!border-primary/40"
        maxHeight={STICKY_NOTE_MAX_HEIGHT}
        maxWidth={STICKY_NOTE_MAX_WIDTH}
        minHeight={STICKY_NOTE_MIN_HEIGHT}
        minWidth={STICKY_NOTE_MIN_WIDTH}
        nodeId={id}
      />

      {selected ? (
        <div
          className="-top-11 nodrag nopan absolute left-0 z-10 flex max-w-[min(100%,28rem)] items-center gap-1 rounded-md border bg-popover p-1 shadow-sm"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-0.5 px-0.5">
            {STICKY_NOTE_COLORS.map((swatchColor) => (
              <button
                aria-label={`${swatchColor} color`}
                className={cn(
                  "size-4 rounded-full border border-black/10 ring-offset-background transition hover:scale-110",
                  STICKY_NOTE_SWATCH_CLASSES[swatchColor],
                  color === swatchColor && "ring-2 ring-ring"
                )}
                key={swatchColor}
                onClick={() => updateConfig({ color: swatchColor })}
                type="button"
              />
            ))}
          </div>
          <ButtonGroup>
            <Button
              aria-pressed={noteConfig.bold}
              onClick={() => updateConfig({ bold: !noteConfig.bold })}
              size="icon-sm"
              title="Bold"
              type="button"
              variant={noteConfig.bold ? "default" : "outline"}
            >
              <Bold className="size-3.5" />
            </Button>
            {(["sm", "md", "lg"] as StickyNoteFontSize[]).map((size) => (
              <Button
                key={size}
                onClick={() => updateConfig({ fontSize: size })}
                size="sm"
                type="button"
                variant={noteConfig.fontSize === size ? "default" : "outline"}
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </ButtonGroup>
          <ButtonGroup>
            {TEXT_ALIGN_OPTIONS.map((align) => {
              const Icon = TEXT_ALIGN_ICONS[align];
              return (
                <Button
                  aria-pressed={textAlign === align}
                  key={align}
                  onClick={() => updateConfig({ textAlign: align })}
                  size="icon-sm"
                  title={`Align ${align}`}
                  type="button"
                  variant={textAlign === align ? "default" : "outline"}
                >
                  <Icon className="size-3.5" />
                </Button>
              );
            })}
          </ButtonGroup>
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md border shadow-sm backdrop-blur-sm transition-shadow",
          STICKY_NOTE_COLOR_CLASSES[color as StickyNoteColor],
          selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
      >
        <div
          className="sticky-note-drag-handle flex h-7 shrink-0 cursor-grab items-center border-black/5 border-b px-2 active:cursor-grabbing"
          title="Drag to move"
        >
          <GripHorizontal className="size-3.5 text-foreground/40" />
        </div>
        <Textarea
          className={cn(
            "nodrag nopan h-full min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
            STICKY_NOTE_FONT_SIZE_CLASSES[noteConfig.fontSize ?? "md"],
            STICKY_NOTE_TEXT_ALIGN_CLASSES[textAlign],
            noteConfig.bold && "font-semibold"
          )}
          onChange={(event) => updateConfig({ text: event.target.value })}
          placeholder="Write a note..."
          value={noteConfig.text ?? ""}
        />
      </div>
    </div>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeComponent);
