"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  parseStickyNoteConfig,
  STICKY_NOTE_COLORS,
  STICKY_NOTE_FONT_SIZE_CLASSES,
  type StickyNoteFontSize,
  type StickyNoteTextAlign,
  STICKY_NOTE_SWATCH_CLASSES,
  STICKY_NOTE_TEXT_ALIGN_CLASSES,
} from "@/lib/workflow/sticky-note";

type NoteConfigProps = {
  config: Record<string, unknown>;
  disabled?: boolean;
  onUpdateConfig: (key: string, value: unknown) => void;
};

const TEXT_ALIGN_OPTIONS: StickyNoteTextAlign[] = ["left", "center", "right"];

export function NoteConfig({
  config,
  disabled,
  onUpdateConfig,
}: NoteConfigProps) {
  const noteConfig = parseStickyNoteConfig(config);
  const color = noteConfig.color ?? "yellow";
  const textAlign = noteConfig.textAlign ?? "left";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea
          className={cn(
            STICKY_NOTE_FONT_SIZE_CLASSES[noteConfig.fontSize ?? "md"],
            STICKY_NOTE_TEXT_ALIGN_CLASSES[textAlign],
            noteConfig.bold && "font-semibold"
          )}
          disabled={disabled}
          onChange={(event) => onUpdateConfig("text", event.target.value)}
          placeholder="Write a note..."
          rows={6}
          value={noteConfig.text ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {STICKY_NOTE_COLORS.map((swatchColor) => (
            <button
              aria-label={`${swatchColor} color`}
              className={cn(
                "size-7 rounded-full border border-black/10 ring-offset-background transition hover:scale-105",
                STICKY_NOTE_SWATCH_CLASSES[swatchColor],
                color === swatchColor && "ring-2 ring-ring"
              )}
              disabled={disabled}
              key={swatchColor}
              onClick={() => onUpdateConfig("color", swatchColor)}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Formatting</Label>
        <ButtonGroup>
          <Button
            aria-pressed={noteConfig.bold}
            disabled={disabled}
            onClick={() => onUpdateConfig("bold", !noteConfig.bold)}
            type="button"
            variant={noteConfig.bold ? "default" : "outline"}
          >
            <Bold className="size-4" />
            Bold
          </Button>
          {(["sm", "md", "lg"] as StickyNoteFontSize[]).map((size) => (
            <Button
              disabled={disabled}
              key={size}
              onClick={() => onUpdateConfig("fontSize", size)}
              type="button"
              variant={noteConfig.fontSize === size ? "default" : "outline"}
            >
              {size.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="space-y-2">
        <Label>Text alignment</Label>
        <ButtonGroup>
          <Button
            aria-pressed={textAlign === "left"}
            disabled={disabled}
            onClick={() => onUpdateConfig("textAlign", "left")}
            type="button"
            variant={textAlign === "left" ? "default" : "outline"}
          >
            <AlignLeft className="size-4" />
            Left
          </Button>
          <Button
            aria-pressed={textAlign === "center"}
            disabled={disabled}
            onClick={() => onUpdateConfig("textAlign", "center")}
            type="button"
            variant={textAlign === "center" ? "default" : "outline"}
          >
            <AlignCenter className="size-4" />
            Center
          </Button>
          <Button
            aria-pressed={textAlign === "right"}
            disabled={disabled}
            onClick={() => onUpdateConfig("textAlign", "right")}
            type="button"
            variant={textAlign === "right" ? "default" : "outline"}
          >
            <AlignRight className="size-4" />
            Right
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
