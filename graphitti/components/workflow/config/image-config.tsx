"use client";

import { useCanvasImageFile } from "@/components/workflow/hooks/use-canvas-image-file";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseCanvasImageConfig } from "@/lib/workflow/canvas-image";

type ImageConfigProps = {
  config: Record<string, unknown>;
  disabled?: boolean;
  onUpdateConfig: (key: string, value: unknown) => void;
};

export function ImageConfig({
  config,
  disabled,
  onUpdateConfig,
}: ImageConfigProps) {
  const imageConfig = parseCanvasImageConfig(config);

  const { dropZoneProps, fileInputRef, isDragOver, onFileInputChange, openFilePicker } =
    useCanvasImageFile({
      currentAlt: imageConfig.alt,
      disabled,
      onApply: ({ src, alt }) => {
        onUpdateConfig("src", src);
        if (alt !== undefined && !imageConfig.alt?.trim()) {
          onUpdateConfig("alt", alt);
        }
      },
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="canvas-image-url">Image URL</Label>
        <Input
          disabled={disabled}
          id="canvas-image-url"
          onChange={(event) => onUpdateConfig("src", event.target.value)}
          placeholder="https://..."
          value={imageConfig.src ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label>Upload</Label>
        <input
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={onFileInputChange}
          ref={fileInputRef}
          type="file"
        />
        <button
          className={cn(
            "nodrag nopan flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
            disabled && "pointer-events-none opacity-50"
          )}
          disabled={disabled}
          onClick={openFilePicker}
          type="button"
          {...dropZoneProps}
        >
          <span className="font-medium text-sm">
            {isDragOver ? "Drop image here" : "Click or drag an image here"}
          </span>
          <span className="text-muted-foreground text-xs">
            Max 1 MB. Stored with the workflow.
          </span>
        </button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="canvas-image-alt">Alt text</Label>
        <Input
          disabled={disabled}
          id="canvas-image-alt"
          onChange={(event) => onUpdateConfig("alt", event.target.value)}
          placeholder="Describe the image"
          value={imageConfig.alt ?? ""}
        />
      </div>
    </div>
  );
}
