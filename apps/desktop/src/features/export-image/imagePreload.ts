const IMAGE_PRELOAD_TIMEOUT_MS = 8000;

export type ImagePreloadFailure = {
  alt: string;
  src: string;
  reason: "error" | "timeout" | "zero-size";
};

export class ImagePreloadError extends Error {
  failures: ImagePreloadFailure[];

  constructor(failures: ImagePreloadFailure[]) {
    super(`图片加载失败：${failures.map((failure) => failure.alt || failure.src || failure.reason).join("、")}`);
    this.name = "ImagePreloadError";
    this.failures = failures;
  }
}

export async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  const results = await Promise.all(images.map((image) => preloadImage(image)));
  const failures = results.filter((result): result is ImagePreloadFailure => result !== null);
  if (failures.length > 0) {
    throw new ImagePreloadError(failures);
  }
}

async function preloadImage(image: HTMLImageElement): Promise<ImagePreloadFailure | null> {
  if (image.complete) {
    return image.naturalWidth > 0 && image.naturalHeight > 0 ? null : failureFor(image, "zero-size");
  }

  try {
    await withTimeout(decodeImage(image), IMAGE_PRELOAD_TIMEOUT_MS);
  } catch (error) {
    return failureFor(image, error instanceof ImagePreloadTimeoutError ? "timeout" : "error");
  }

  return image.naturalWidth > 0 && image.naturalHeight > 0 ? null : failureFor(image, "zero-size");
}

function decodeImage(image: HTMLImageElement) {
  if (typeof image.decode === "function") {
    return image.decode();
  }

  return new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("image load failed")), { once: true });
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new ImagePreloadTimeoutError()), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function failureFor(image: HTMLImageElement, reason: ImagePreloadFailure["reason"]): ImagePreloadFailure {
  return {
    alt: image.alt,
    src: image.currentSrc || image.src,
    reason
  };
}

class ImagePreloadTimeoutError extends Error {}
