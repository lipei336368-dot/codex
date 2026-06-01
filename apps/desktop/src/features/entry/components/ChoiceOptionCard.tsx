import { useLayoutEffect, useRef } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { QuestionAssetPicker } from "./QuestionAssetPicker";

type OptionDraft = {
  label: string;
  text: string;
  imagePath: string | null;
  imagePreviewUrl: string | null;
};

type ChoiceOptionCardProps = {
  option: OptionDraft;
  checked: boolean;
  inputType: "radio" | "checkbox";
  canRemove: boolean;
  onCorrectChange: () => void;
  onTextChange: (value: string) => void;
  onImageChoose: (file: File) => void;
  onImageRemove: () => void;
  onRemove: () => void;
};

export function ChoiceOptionCard({
  option,
  checked,
  inputType,
  canRemove,
  onCorrectChange,
  onTextChange,
  onImageChoose,
  onImageRemove,
  onRemove
}: ChoiceOptionCardProps) {
  return (
    <article className={checked ? "option-editor option-editor-correct" : "option-editor"}>
      <GripVertical className="option-row-grip" size={18} aria-hidden="true" />
      <strong className="option-letter">{option.label}</strong>
      <label className="option-text-control">
        <span>{option.label} 选项</span>
        <AutoOptionTextArea label={option.label} value={option.text} onChange={onTextChange} />
      </label>
      <label className="option-correct-control">
        <input
          aria-label={`${option.label} 正确答案`}
          checked={checked}
          name="correct-option"
          onChange={onCorrectChange}
          type={inputType}
        />
      </label>
      <QuestionAssetPicker
        label={`${option.label} 选项图片`}
        image={{ path: option.imagePath, previewUrl: option.imagePreviewUrl }}
        compact
        onChoose={onImageChoose}
        onRemove={onImageRemove}
      />
      {canRemove ? (
        <button aria-label={`删除 ${option.label} 选项`} className="option-row-icon-button option-row-delete" onClick={onRemove} type="button">
          <Trash2 size={17} />
        </button>
      ) : null}
    </article>
  );
}

function AutoOptionTextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.fontSize = "";
    textarea.style.lineHeight = "";
    textarea.style.height = "auto";
    const maxHeight = 180;
    const computedStyle = window.getComputedStyle(textarea);
    const baseFontSize = Number.parseFloat(computedStyle.fontSize) || 16;
    const baseLineHeight = Number.parseFloat(computedStyle.lineHeight) || baseFontSize * 1.42;
    let nextFontSize = baseFontSize;
    while (textarea.scrollHeight > maxHeight && nextFontSize > 13) {
      nextFontSize -= 1;
      textarea.style.fontSize = `${nextFontSize}px`;
      textarea.style.lineHeight = `${Math.max(nextFontSize * 1.3, baseLineHeight - 6)}px`;
      textarea.style.height = "auto";
    }
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    textarea.dataset.overflowing = textarea.scrollHeight > maxHeight ? "true" : "false";
    textarea.dataset.fit = nextFontSize < baseFontSize ? "compressed" : "normal";
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      aria-label={`${label} 选项`}
      rows={1}
      value={value}
      style={{ maxHeight: "180px", overflowY: "hidden" }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
