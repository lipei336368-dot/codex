type ImageLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <div
      className="lightbox-backdrop"
      aria-label="图片预览"
      role="dialog"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <img
        src={src}
        alt={alt}
        className="lightbox-image lightbox-image-export"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
