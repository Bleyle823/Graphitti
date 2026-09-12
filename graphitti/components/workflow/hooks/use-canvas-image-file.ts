"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  pickCanvasImageFileFromDataTransfer,
  readCanvasImageFileAsDataUrl,
} from "@/lib/workflow/canvas-image";

type UseCanvasImageFileOptions = {
  disabled?: boolean;
  currentAlt?: string;
  onApply: (values: { src: string; alt?: string }) => void;
};

export function useCanvasImageFile({
  disabled,
  currentAlt,
  onApply,
}: UseCanvasImageFileOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const applyFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled) {
        return;
      }

      try {
        const src = await readCanvasImageFileAsDataUrl(file);
        onApply({
          src,
          alt: currentAlt?.trim() ? currentAlt : file.name,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not read that image."
        );
      }
    },
    [currentAlt, disabled, onApply]
  );

  const openFilePicker = useCallback(() => {
    if (disabled) {
      return;
    }
    fileInputRef.current?.click();
  }, [disabled]);

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void applyFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [applyFile]
  );

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      void applyFile(pickCanvasImageFileFromDataTransfer(event.dataTransfer));
    },
    [applyFile, disabled]
  );

  const dropZoneProps = {
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
  };

  return {
    applyFile,
    dropZoneProps,
    fileInputRef,
    isDragOver,
    onFileInputChange,
    openFilePicker,
  };
}
