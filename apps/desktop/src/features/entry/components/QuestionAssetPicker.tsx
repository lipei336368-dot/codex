import { ImagePlus } from "lucide-react";

type ImageDraft = {
  path: string | null;
  previewUrl: string | null;
};

type QuestionAssetPickerProps = {
  label: string;
  image: ImageDraft;
  onChoose: (file: File) => void;
  onRemove: () => void;
  compact?: boolean;
};

export function QuestionAssetPicker({ label, image, onChoose, onRemove, compact = false }: QuestionAssetPickerProps) {
  return (
    <div className={compact ? "image-attachment image-attachment-compact" : "image-attachment"}>
      <label className="filter-chip image-choose" title={image.previewUrl ? `更换${label}` : label}>
        <ImagePlus size={15} />
        {compact ? null : image.previewUrl ? "更换图片" : label}
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
      {image.previewUrl ? (
        <div className="image-preview">
          <img alt={`${label}预览`} src={image.previewUrl} />
          <button className="option-remove" onClick={onRemove} type="button">
            移除
          </button>
        </div>
      ) : null}
    </div>
  );
}
