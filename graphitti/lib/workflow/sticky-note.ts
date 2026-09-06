import { nanoid } from "nanoid";
import type { WorkflowNode } from "@/lib/workflow-store";

export type StickyNoteColor =
  | "yellow"
  | "pink"
  | "blue"
  | "green"
  | "orange"
  | "purple";

export type StickyNoteFontSize = "sm" | "md" | "lg";

export type StickyNoteTextAlign = "left" | "center" | "right";

export type StickyNoteConfig = {
  text?: string;
  color?: StickyNoteColor;
  bold?: boolean;
  fontSize?: StickyNoteFontSize;
  textAlign?: StickyNoteTextAlign;
};

export const DEFAULT_STICKY_NOTE_CONFIG: StickyNoteConfig = {
  text: "",
  color: "yellow",
  bold: false,
  fontSize: "md",
  textAlign: "left",
};

export const STICKY_NOTE_COLORS: StickyNoteColor[] = [
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
  "purple",
];

export const STICKY_NOTE_COLOR_CLASSES: Record<StickyNoteColor, string> = {
  yellow: "bg-amber-200/70 border-amber-300/80 dark:bg-amber-400/25 dark:border-amber-500/40",
  pink: "bg-pink-200/70 border-pink-300/80 dark:bg-pink-400/25 dark:border-pink-500/40",
  blue: "bg-sky-200/70 border-sky-300/80 dark:bg-sky-400/25 dark:border-sky-500/40",
  green:
    "bg-emerald-200/70 border-emerald-300/80 dark:bg-emerald-400/25 dark:border-emerald-500/40",
  orange:
    "bg-orange-200/70 border-orange-300/80 dark:bg-orange-400/25 dark:border-orange-500/40",
  purple:
    "bg-violet-200/70 border-violet-300/80 dark:bg-violet-400/25 dark:border-violet-500/40",
};

export const STICKY_NOTE_SWATCH_CLASSES: Record<StickyNoteColor, string> = {
  yellow: "bg-amber-300 dark:bg-amber-500",
  pink: "bg-pink-300 dark:bg-pink-500",
  blue: "bg-sky-300 dark:bg-sky-500",
  green: "bg-emerald-300 dark:bg-emerald-500",
  orange: "bg-orange-300 dark:bg-orange-500",
  purple: "bg-violet-300 dark:bg-violet-500",
};

export const STICKY_NOTE_FONT_SIZE_CLASSES: Record<StickyNoteFontSize, string> =
  {
    sm: "text-xs leading-relaxed",
    md: "text-sm leading-relaxed",
    lg: "text-base leading-relaxed",
  };

export const STICKY_NOTE_TEXT_ALIGN_CLASSES: Record<StickyNoteTextAlign, string> =
  {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

export const STICKY_NOTE_MIN_WIDTH = 160;
export const STICKY_NOTE_MIN_HEIGHT = 120;
export const STICKY_NOTE_MAX_WIDTH = 640;
export const STICKY_NOTE_MAX_HEIGHT = 480;

export function parseStickyNoteConfig(
  config: Record<string, unknown> | undefined
): StickyNoteConfig {
  const color = config?.color;
  const fontSize = config?.fontSize;
  const textAlign = config?.textAlign;
  return {
    text: typeof config?.text === "string" ? config.text : "",
    color:
      typeof color === "string" &&
      STICKY_NOTE_COLORS.includes(color as StickyNoteColor)
        ? (color as StickyNoteColor)
        : DEFAULT_STICKY_NOTE_CONFIG.color,
    bold: config?.bold === true,
    fontSize:
      fontSize === "sm" || fontSize === "md" || fontSize === "lg"
        ? fontSize
        : DEFAULT_STICKY_NOTE_CONFIG.fontSize,
    textAlign:
      textAlign === "left" || textAlign === "center" || textAlign === "right"
        ? textAlign
        : DEFAULT_STICKY_NOTE_CONFIG.textAlign,
  };
}

export function createStickyNoteNodeData(
  config?: Partial<StickyNoteConfig>
): {
  label: string;
  description: string;
  type: "note";
  config: StickyNoteConfig;
  status: "idle";
} {
  return {
    label: "Sticky note",
    description: "",
    type: "note",
    config: {
      ...DEFAULT_STICKY_NOTE_CONFIG,
      ...config,
    },
    status: "idle",
  };
}

export const STICKY_NOTE_WIDTH = 220;
export const STICKY_NOTE_HEIGHT = 180;
export const STICKY_NOTE_DRAG_HANDLE = ".sticky-note-drag-handle";

export function createStickyNoteNode(position: {
  x: number;
  y: number;
}): WorkflowNode {
  return {
    id: nanoid(),
    type: "note",
    dragHandle: STICKY_NOTE_DRAG_HANDLE,
    width: STICKY_NOTE_WIDTH,
    height: STICKY_NOTE_HEIGHT,
    position: {
      x: position.x - STICKY_NOTE_WIDTH / 2,
      y: position.y - STICKY_NOTE_HEIGHT / 2,
    },
    data: createStickyNoteNodeData(),
    selected: true,
  };
}

export function getFlowViewportCenterPosition(
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  }
): { x: number; y: number } {
  const flowWrapper = document.querySelector(".react-flow");
  if (!flowWrapper) {
    return { x: 0, y: 0 };
  }

  const rect = flowWrapper.getBoundingClientRect();
  return screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
}
