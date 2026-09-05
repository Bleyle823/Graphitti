"use client";

import { useCallback } from "react";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";

type CodeEditorFieldProps = {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
  language?: string;
  height?: string;
};

export function CodeEditorField({
  value,
  onChange,
  disabled,
  placeholder,
}: CodeEditorFieldProps): React.ReactElement {
  const handleChange = useCallback(
    (newValue: string): void => {
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <TemplateBadgeTextarea
      disabled={disabled}
      onChange={handleChange}
      placeholder={placeholder}
      rows={12}
      value={value}
    />
  );
}
