import type { ClipboardEvent } from "react";
import { useLayoutEffect, useRef } from "react";

type TextAreaProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  readOnly?: boolean;
};

const ROW_HEIGHT = 32;
const MIN_FONT_SIZE = 13;
const MIN_LINE_HEIGHT_RATIO = 1.32;

export function TextArea({
  label,
  value,
  onChange,
  onPaste,
  minRows = 3,
  maxRows = 8,
  placeholder,
  readOnly = false
}: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const maxHeight = maxRows * ROW_HEIGHT;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.fontSize = "";
    textarea.style.lineHeight = "";
    textarea.style.height = "auto";

    const computedStyle = window.getComputedStyle(textarea);
    const baseFontSize = parseCssPixels(computedStyle.fontSize, 16);
    const baseLineHeight = parseCssPixels(computedStyle.lineHeight, baseFontSize * 1.45);

    let nextFontSize = baseFontSize;
    while (textarea.scrollHeight > maxHeight && nextFontSize > MIN_FONT_SIZE) {
      nextFontSize -= 1;
      textarea.style.fontSize = `${nextFontSize}px`;
      textarea.style.lineHeight = `${Math.max(nextFontSize * MIN_LINE_HEIGHT_RATIO, baseLineHeight - 8)}px`;
      textarea.style.height = "auto";
    }

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    textarea.dataset.overflowing = textarea.scrollHeight > maxHeight ? "true" : "false";
    textarea.dataset.fit = nextFontSize < baseFontSize ? "compressed" : "normal";
  }, [maxHeight, value]);

  return (
    <label className="control-field">
      <span>{label}</span>
      <textarea
        ref={textareaRef}
        rows={minRows}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ maxHeight: `${maxHeight}px`, overflowY: "hidden" }}
        onChange={(event) => onChange?.(event.target.value)}
        onPaste={onPaste}
      />
    </label>
  );
}

function parseCssPixels(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
