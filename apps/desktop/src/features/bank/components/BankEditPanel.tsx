import { convertFileSrc } from "@tauri-apps/api/core";
import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import type { ChapterDto, QuestionDto, QuestionOptionInput, QuestionTypeDto } from "../../../shared/api/contracts";
import { Button } from "../../../shared/components/Button";
import { Select } from "../../../shared/components/Select";
import { TextArea } from "../../../shared/components/TextArea";

type BankEditPanelProps = {
  question: QuestionDto;
  chapters: ChapterDto[];
  editingChapterId: string;
  setEditingChapterId: (value: string) => void;
  chapterName: string;
  editingStem: string;
  setEditingStem: (value: string) => void;
  editingAnswer: string;
  setEditingAnswer: (value: string) => void;
  editingAnalysis: string;
  setEditingAnalysis: (value: string) => void;
  editingStemImagePath: string | null;
  editingStemImagePreview: string | null;
  setEditingStemImagePath: (value: string | null) => void;
  setEditingStemImagePreview: (value: string | null) => void;
  editingAnswerImagePath: string | null;
  editingAnswerImagePreview: string | null;
  setEditingAnswerImagePath: (value: string | null) => void;
  setEditingAnswerImagePreview: (value: string | null) => void;
  editingAnalysisImagePath: string | null;
  editingAnalysisImagePreview: string | null;
  setEditingAnalysisImagePath: (value: string | null) => void;
  setEditingAnalysisImagePreview: (value: string | null) => void;
  editingOptions: QuestionOptionInput[];
  setEditingOptions: Dispatch<SetStateAction<QuestionOptionInput[]>>;
  editingOptionImagePreviews: Record<string, string | null>;
  setEditingOptionImagePreviews: Dispatch<SetStateAction<Record<string, string | null>>>;
  attachEditingImage: (
    file: File,
    setPath: (path: string | null) => void,
    setPreview: (path: string | null) => void
  ) => Promise<void>;
  setLightboxImage: (value: { src: string; alt: string } | null) => void;
  errorMessage?: string;
  onCancel: () => void;
  onSave: () => void;
  immersive?: boolean;
};

const typeLabels: Record<QuestionTypeDto, string> = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  short_answer: "简答论述题",
  essay: "简答论述题"
};

export function BankEditPanel(props: BankEditPanelProps) {
  const isChoice = props.question.questionType === "single_choice" || props.question.questionType === "multiple_choice";

  function setCorrectOption(label: string) {
    props.setEditingOptions((current) => {
      const wasSelected = current.find((item) => item.label === label)?.isCorrect ?? false;
      return current.map((item) => {
        if (props.question.questionType === "single_choice") {
          return { ...item, isCorrect: wasSelected ? false : item.label === label };
        }

        return item.label === label ? { ...item, isCorrect: !item.isCorrect } : item;
      });
    });
  }

  function removeOption(label: string) {
    props.setEditingOptions((current) => current.filter((item) => item.label !== label));
    props.setEditingOptionImagePreviews((current) => {
      const next = { ...current };
      delete next[label];
      return next;
    });
  }

  function addOption() {
    const existingLabels = new Set(props.editingOptions.map((option) => option.label));
    const nextLabel =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((label) => !existingLabels.has(label)) ??
      String(props.editingOptions.length + 1);
    props.setEditingOptions((current) => [...current, { label: nextLabel, text: "", imagePath: null, isCorrect: false }]);
  }

  return (
    <section className={props.immersive ? "bank-edit-shell" : "question-editor question-editor-panel"}>
      <header className={props.immersive ? "bank-edit-header" : "question-editor-panel-header"} data-tauri-drag-region={props.immersive ? true : undefined}>
        <div className={props.immersive ? "bank-edit-title" : undefined} data-tauri-drag-region={props.immersive ? true : undefined}>
          <h2>编辑题目</h2>
          {props.immersive ? null : <p className="bank-edit-overview">{props.question.stem || "图片题"}</p>}
          {props.immersive ? null : <h3>{props.question.stem || "图片题"}</h3>}
        </div>
        <div className="bank-edit-actions">
          <Button variant="ghost" onClick={props.onCancel}>
            返回题库
          </Button>
          <Button aria-label="修改" variant="primary" onClick={props.onSave}>
            保存修改
          </Button>
        </div>
        {props.immersive ? null : (
          <button className="panel-close-button" type="button" aria-label="关闭编辑" onClick={props.onCancel}>
            ×
          </button>
        )}
      </header>
      <div className={["question-editor-panel-body", props.immersive ? "bank-edit-main-card" : ""].filter(Boolean).join(" ")}>
        {props.errorMessage ? (
          <div className="selection-toolbar entry-error bank-edit-error" role="alert">
            {props.errorMessage}
          </div>
        ) : null}
        <div className="bank-edit-meta-row">
          <span className="bank-edit-row-label">所属章节</span>
          <div className="bank-edit-chapter-select">
          <Select
            label="所属章节"
            value={props.editingChapterId}
            options={props.chapters.map((chapter) => ({ label: chapter.name, value: chapter.id }))}
            onChange={props.setEditingChapterId}
          />
          </div>
          <span className="question-type-badge">{typeLabels[props.question.questionType]}</span>
        </div>
        <div className={["bank-edit-form-grid", isChoice ? "bank-edit-choice-grid" : "bank-edit-open-grid"].join(" ")}>
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line">
            <span className="bank-edit-row-label">题目</span>
            <TextArea label="题干" value={props.editingStem} minRows={1} maxRows={8} onChange={props.setEditingStem} />
          <ImageAttachment
            label="题干图片"
            compact
            path={props.editingStemImagePath}
            previewUrl={props.editingStemImagePreview}
            onPreview={(src) => props.setLightboxImage({ src, alt: "题干图片预览" })}
            onChoose={(file) => void props.attachEditingImage(file, props.setEditingStemImagePath, props.setEditingStemImagePreview)}
            onRemove={() => {
              props.setEditingStemImagePath(null);
              props.setEditingStemImagePreview(null);
            }}
          />
          </section>
        {isChoice ? (
          <section className="bank-edit-field bank-edit-secondary-field bank-edit-options-section">
            <span className="bank-edit-row-label">选项</span>
            <div className="bank-edit-options-stack">
              <div className="option-image-editor">
              {props.editingOptions.map((option) => (
                <div className="option-image-row" key={option.label}>
                  <GripVertical className="option-row-grip" size={18} aria-hidden="true" />
                  <strong className="option-letter">{option.label}</strong>
                  <div className="option-image-label">
                    <OptionTextArea
                      label={option.label}
                      value={option.text ?? ""}
                      onChange={(value) =>
                        props.setEditingOptions((current) =>
                          current.map((item) => (item.label === option.label ? { ...item, text: value || null } : item))
                        )
                      }
                    />
                  </div>
                  <label className="option-correct-check" title="设为正确答案">
                    <input
                      aria-label={`设为正确答案 ${option.label}`}
                      checked={option.isCorrect}
                      type="checkbox"
                      onChange={() => setCorrectOption(option.label)}
                    />
                  </label>
                  <ImageAttachment
                    label={`选项 ${option.label} 图片`}
                    compact
                    path={option.imagePath}
                    previewUrl={props.editingOptionImagePreviews[option.label] ?? null}
                    onPreview={(src) => props.setLightboxImage({ src, alt: `选项 ${option.label} 图片预览` })}
                    onChoose={(file) =>
                      void props.attachEditingImage(
                        file,
                        (path) =>
                          props.setEditingOptions((current) =>
                            current.map((item) => (item.label === option.label ? { ...item, imagePath: path } : item))
                          ),
                        (previewUrl) =>
                          props.setEditingOptionImagePreviews((current) => ({
                            ...current,
                            [option.label]: previewUrl
                          }))
                      )
                    }
                    onRemove={() => {
                      props.setEditingOptions((current) =>
                        current.map((item) => (item.label === option.label ? { ...item, imagePath: null } : item))
                      );
                      props.setEditingOptionImagePreviews((current) => ({ ...current, [option.label]: null }));
                    }}
                  />
                  <button
                    aria-label={`删除选项 ${option.label}`}
                    className="option-row-icon-button option-row-delete"
                    type="button"
                    onClick={() => removeOption(option.label)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              </div>
            <button aria-label="添加选项" className="bank-edit-add-option" type="button" onClick={addOption}>
              <Plus size={17} />
            </button>
            </div>
          </section>
        ) : (
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line">
            <span className="bank-edit-row-label">参考答案</span>
            <TextArea label="答案" value={props.editingAnswer} minRows={1} maxRows={18} onChange={props.setEditingAnswer} />
            <ImageAttachment
              label="答案图片"
              compact
              path={props.editingAnswerImagePath}
              previewUrl={props.editingAnswerImagePreview}
              onPreview={(src) => props.setLightboxImage({ src, alt: "答案图片预览" })}
              onChoose={(file) =>
                void props.attachEditingImage(file, props.setEditingAnswerImagePath, props.setEditingAnswerImagePreview)
              }
              onRemove={() => {
                props.setEditingAnswerImagePath(null);
                props.setEditingAnswerImagePreview(null);
              }}
            />
          </section>
        )}
        {isChoice ? (
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line">
            <span className="bank-edit-row-label">解析</span>
            <TextArea label="解析" value={props.editingAnalysis} minRows={1} maxRows={16} onChange={props.setEditingAnalysis} />
            <ImageAttachment
              label="解析图片"
              compact
              path={props.editingAnalysisImagePath}
              previewUrl={props.editingAnalysisImagePreview}
              onPreview={(src) => props.setLightboxImage({ src, alt: "解析图片预览" })}
              onChoose={(file) =>
                void props.attachEditingImage(file, props.setEditingAnalysisImagePath, props.setEditingAnalysisImagePreview)
              }
              onRemove={() => {
                props.setEditingAnalysisImagePath(null);
                props.setEditingAnalysisImagePreview(null);
              }}
            />
          </section>
        ) : null}
        </div>
      </div>
      {props.immersive ? null : (
        <footer className="question-editor-panel-footer">
          <Button variant="ghost" onClick={props.onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={props.onSave}>
            保存修改
          </Button>
        </footer>
      )}
    </section>
  );
}

type OptionTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function OptionTextArea({ label, value, onChange }: OptionTextAreaProps) {
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
    <label>
      <span>选项内容</span>
      <textarea
        ref={textareaRef}
        aria-label={`选项 ${label} 内容`}
        className="option-auto-textarea"
        rows={1}
        value={value}
        style={{ maxHeight: "180px", overflowY: "hidden" }}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type ImageAttachmentProps = {
  label: string;
  compact?: boolean;
  path: string | null;
  previewUrl: string | null;
  onPreview: (src: string) => void;
  onChoose: (file: File) => void;
  onRemove: () => void;
};

function ImageAttachment({ label, compact = false, path, previewUrl, onPreview, onChoose, onRemove }: ImageAttachmentProps) {
  const src = previewUrl ?? (path ? toImageSrc(path) : null);

  return (
    <div className={compact ? "image-attachment image-attachment-compact" : "image-attachment"}>
      <label className="filter-chip image-choose" title={src ? `更换${label}` : label}>
        <ImagePlus size={15} />
        {compact ? null : src ? `更换${label}` : label}
        <input
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          aria-label={label}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onChoose(file);
            }
            event.target.value = "";
          }}
          type="file"
        />
      </label>
      {src ? (
        <div className="image-preview">
          <button aria-label={`查看${label}`} className="image-preview-button" onClick={() => onPreview(src)} type="button">
            <img alt={`${label}预览`} src={src} />
          </button>
          <button aria-label={`移除${label}`} className="option-remove" onClick={onRemove} type="button">
            移除
          </button>
        </div>
      ) : null}
    </div>
  );
}

function toImageSrc(path: string) {
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:") || path.startsWith("/")) {
    return path;
  }

  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
