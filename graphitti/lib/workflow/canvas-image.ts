import { nanoid } from "nanoid";
import type { WorkflowNode } from "@/lib/workflow-store";

export type CanvasImageConfig = {
  src?: string;
  alt?: string;
};

export const DEFAULT_CANVAS_IMAGE_CONFIG: CanvasImageConfig = {
  src: "",
  alt: "",
};

export const CANVAS_IMAGE_MIN_WIDTH = 160;
export const CANVAS_IMAGE_MIN_HEIGHT = 120;
export const CANVAS_IMAGE_MAX_WIDTH = 960;
export const CANVAS_IMAGE_MAX_HEIGHT = 720;
export const CANVAS_IMAGE_WIDTH = 320;
export const CANVAS_IMAGE_HEIGHT = 240;
export const CANVAS_IMAGE_MAX_BYTES = 1024 * 1024;
export const CANVAS_IMAGE_DRAG_HANDLE = ".canvas-image-drag-handle";

export function getCanvasImageFileValidationError(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Choose an image file.";
  }
  if (file.size > CANVAS_IMAGE_MAX_BYTES) {
    return "Image must be 1 MB or smaller.";
  }
  return null;
}

export function readCanvasImageFileAsDataUrl(file: File): Promise<string> {
  const validationError = getCanvasImageFileValidationError(file);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read that image."));
    };
    reader.onerror = () => {
      reject(new Error("Could not read that image."));
    };
    reader.readAsDataURL(file);
  });
}

export function pickCanvasImageFileFromDataTransfer(
  dataTransfer: DataTransfer | null
): File | undefined {
  if (!dataTransfer?.files?.length) {
    return undefined;
  }
  return Array.from(dataTransfer.files).find((file) =>
    file.type.startsWith("image/")
  );
}

export function parseCanvasImageConfig(
  config: Record<string, unknown> | undefined
): CanvasImageConfig {
  return {
    src: typeof config?.src === "string" ? config.src : "",
    alt: typeof config?.alt === "string" ? config.alt : "",
  };
}

export function createCanvasImageNodeData(
  config?: Partial<CanvasImageConfig>
): {
  label: string;
  description: string;
  type: "image";
  config: CanvasImageConfig;
  status: "idle";
} {
  return {
    label: "Image",
    description: "",
    type: "image",
    config: {
      ...DEFAULT_CANVAS_IMAGE_CONFIG,
      ...config,
    },
    status: "idle",
  };
}

export function createCanvasImageNode(position: {
  x: number;
  y: number;
}): WorkflowNode {
  return {
    id: nanoid(),
    type: "image",
    dragHandle: CANVAS_IMAGE_DRAG_HANDLE,
    width: CANVAS_IMAGE_WIDTH,
    height: CANVAS_IMAGE_HEIGHT,
    position: {
      x: position.x - CANVAS_IMAGE_WIDTH / 2,
      y: position.y - CANVAS_IMAGE_HEIGHT / 2,
    },
    data: createCanvasImageNodeData(),
    selected: true,
  };
}
