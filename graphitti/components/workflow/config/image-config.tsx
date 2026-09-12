"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CANVAS_IMAGE_MAX_BYTES,
  parseCanvasImageConfig,
} from "@/lib/workflow/canvas-image";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > CANVAS_IMAGE_MAX_BYTES) {
      toast.error("Image must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateConfig("src", reader.result);
        if (!imageConfig.alt) {
          onUpdateConfig("alt", file.name);
        }
      }
    };
    reader.onerror = () => {
      toast.error("Could not read that image.");
    };
    reader.readAsDataURL(file);
  };

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
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
        <Button
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          Choose image
        </Button>
        <p className="text-muted-foreground text-xs">
          Max 1 MB. Stored with the workflow.
        </p>
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
