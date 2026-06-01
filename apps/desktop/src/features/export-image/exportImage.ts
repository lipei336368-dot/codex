import { toBlob } from "html-to-image";
import { waitForImages } from "./imagePreload";
import type { ExportCaptureResult } from "./types";

export async function exportSheetToPngBytes(element: HTMLElement): Promise<ExportCaptureResult> {
  await waitForImages(element);
  const restoreCaptureFit = fitExportSheetForCapture(element);
  let blob: Blob | null;
  try {
    assertExportSheetFits(element);
    blob = await toBlob(element, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      canvasHeight: 1920,
      canvasWidth: 1080,
      height: 1920,
      pixelRatio: 1,
      style: {
        transform: "none",
        transformOrigin: "top left"
      },
      width: 1080
    });
  } finally {
    restoreCaptureFit();
  }
  if (!blob) {
    throw new Error("export image capture returned empty blob");
  }

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: 1080,
    height: 1920
  };
}

export function assertExportSheetFits(element: HTMLElement): void {
  const verticalOverflow = element.scrollHeight > element.clientHeight + 2;
  const horizontalOverflow = element.scrollWidth > element.clientWidth + 2;
  const visuallyFits = scaledContentFits(element);
  if ((horizontalOverflow || verticalOverflow) && !visuallyFits) {
    throw new Error("export sheet overflows");
  }
}

function scaledContentFits(element: HTMLElement): boolean {
  const content = element.querySelector<HTMLElement>(".export-sheet-content");
  const footer = element.querySelector<HTMLElement>(".export-sheet-footer");
  if (!content || !footer) {
    return false;
  }

  const scale = scaleFromTransform(content.style.transform);
  if (scale === null) {
    return false;
  }

  const elementRect = element.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const contentTop = contentRect.top - elementRect.top;
  const footerTop = footerRect.top - elementRect.top;
  return contentTop + contentRect.height * scale <= footerTop - 2;
}

function scaleFromTransform(transform: string): number | null {
  const match = /^scale\((\d*\.?\d+)\)$/.exec(transform.trim());
  return match ? Number(match[1]) : null;
}

function fitExportSheetForCapture(element: HTMLElement): () => void {
  const previousRoot = {
    width: element.style.width,
    height: element.style.height,
    minWidth: element.style.minWidth,
    minHeight: element.style.minHeight,
    maxWidth: element.style.maxWidth,
    maxHeight: element.style.maxHeight,
    transform: element.style.transform,
    transformOrigin: element.style.transformOrigin,
    flex: element.style.flex,
    sheetWidth: element.style.getPropertyValue("--sheet-width"),
    sheetHeight: element.style.getPropertyValue("--sheet-height")
  };
  element.style.setProperty("--sheet-width", "1080px");
  element.style.setProperty("--sheet-height", "1920px");
  element.style.width = "1080px";
  element.style.height = "1920px";
  element.style.minWidth = "1080px";
  element.style.minHeight = "1920px";
  element.style.maxWidth = "1080px";
  element.style.maxHeight = "1920px";
  element.style.transform = "none";
  element.style.transformOrigin = "top left";
  element.style.flex = "0 0 auto";

  const content = element.querySelector<HTMLElement>(".export-sheet-content");
  const footer = element.querySelector<HTMLElement>(".export-sheet-footer");
  if (!content || !footer) {
    assertExportSheetFits(element);
    return () => restoreRootCaptureStyle(element, previousRoot);
  }

  if (scaledContentFits(element)) {
    return () => restoreRootCaptureStyle(element, previousRoot);
  }

  const previous = {
    transform: content.style.transform,
    transformOrigin: content.style.transformOrigin,
    width: content.style.width,
    gap: content.style.gap
  };
  const elementRect = element.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const footerRect = footer.getBoundingClientRect();
  const contentHeight = Math.max(contentRect.height, 1);
  const contentTop = contentRect.top - elementRect.top;
  const footerTop = footerRect.top - elementRect.top;
  const availableHeight = Math.max(footerTop - contentTop - 28, 1);
  const minimumScale = element.dataset.density === "micro" ? 0.34 : 0.48;
  const scale = Math.min(1, Math.max(minimumScale, availableHeight / contentHeight));

  if (element.scrollHeight <= element.clientHeight + 2 && element.scrollWidth <= element.clientWidth + 2 && scale >= 1) {
    return () => restoreRootCaptureStyle(element, previousRoot);
  }

  content.style.transform = `scale(${scale})`;
  content.style.transformOrigin = "top left";
  content.style.width = `${100 / scale}%`;
  content.style.gap = scale < 0.72 ? "8px" : previous.gap;

  return () => {
    content.style.transform = previous.transform;
    content.style.transformOrigin = previous.transformOrigin;
    content.style.width = previous.width;
    content.style.gap = previous.gap;
    restoreRootCaptureStyle(element, previousRoot);
  };
}

function restoreRootCaptureStyle(
  element: HTMLElement,
  previous: {
    width: string;
    height: string;
    minWidth: string;
    minHeight: string;
    maxWidth: string;
    maxHeight: string;
    transform: string;
    transformOrigin: string;
    flex: string;
    sheetWidth: string;
    sheetHeight: string;
  }
) {
  element.style.width = previous.width;
  element.style.height = previous.height;
  element.style.minWidth = previous.minWidth;
  element.style.minHeight = previous.minHeight;
  element.style.maxWidth = previous.maxWidth;
  element.style.maxHeight = previous.maxHeight;
  element.style.transform = previous.transform;
  element.style.transformOrigin = previous.transformOrigin;
  element.style.flex = previous.flex;
  restoreCustomProperty(element, "--sheet-width", previous.sheetWidth);
  restoreCustomProperty(element, "--sheet-height", previous.sheetHeight);
}

function restoreCustomProperty(element: HTMLElement, property: string, value: string) {
  if (value) {
    element.style.setProperty(property, value);
  } else {
    element.style.removeProperty(property);
  }
}
