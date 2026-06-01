import { toBlob } from "html-to-image";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportSheetToPngBytes } from "./exportImage";

vi.mock("html-to-image", () => ({
  toBlob: vi.fn()
}));

describe("exportSheetToPngBytes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toBlob).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
    } as unknown as Blob);
  });

  it("fits overflowing sheet content before capturing instead of failing export", async () => {
    const sheet = document.createElement("article");
    const content = document.createElement("main");
    const footer = document.createElement("footer");
    sheet.className = "export-sheet";
    content.className = "export-sheet-content";
    footer.className = "export-sheet-footer";
    sheet.append(content, footer);

    Object.defineProperty(sheet, "clientHeight", { value: 1920 });
    Object.defineProperty(sheet, "clientWidth", { value: 1080 });
    Object.defineProperty(sheet, "scrollHeight", { value: 2500 });
    Object.defineProperty(sheet, "scrollWidth", { value: 1080 });
    sheet.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, right: 1080, bottom: 1920, width: 1080, height: 1920 } as DOMRect));
    content.getBoundingClientRect = vi.fn(() => ({ top: 520, left: 88, right: 992, bottom: 2300, width: 904, height: 1780 } as DOMRect));
    footer.getBoundingClientRect = vi.fn(() => ({ top: 1780, left: 88, right: 992, bottom: 1845, width: 904, height: 65 } as DOMRect));

    await expect(exportSheetToPngBytes(sheet)).resolves.toEqual({
      bytes: new Uint8Array([1, 2, 3]),
      width: 1080,
      height: 1920
    });

    expect(vi.mocked(toBlob)).toHaveBeenCalledOnce();
    expect(content.style.transform).toBe("");
    const capturedElement = vi.mocked(toBlob).mock.calls[0][0] as HTMLElement;
    expect(capturedElement).toBe(sheet);
  });

  it("forces the captured sheet root back to the native export size", async () => {
    let widthDuringCapture = "";
    let maxWidthDuringCapture = "";
    let transformDuringCapture = "";
    vi.mocked(toBlob).mockImplementation(async (element) => {
      const sheet = element as HTMLElement;
      widthDuringCapture = sheet.style.width;
      maxWidthDuringCapture = sheet.style.maxWidth;
      transformDuringCapture = sheet.style.transform;
      return {
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
      } as unknown as Blob;
    });
    const sheet = document.createElement("article");
    const content = document.createElement("main");
    const footer = document.createElement("footer");
    sheet.className = "export-sheet";
    content.className = "export-sheet-content";
    footer.className = "export-sheet-footer";
    sheet.style.width = "420px";
    sheet.style.maxWidth = "420px";
    sheet.style.transform = "scale(0.4)";
    sheet.append(content, footer);

    Object.defineProperty(sheet, "clientHeight", { value: 1920 });
    Object.defineProperty(sheet, "clientWidth", { value: 420 });
    Object.defineProperty(sheet, "scrollHeight", { value: 1920 });
    Object.defineProperty(sheet, "scrollWidth", { value: 420 });
    sheet.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, right: 420, bottom: 1920, width: 420, height: 1920 } as DOMRect));
    content.getBoundingClientRect = vi.fn(() => ({ top: 520, left: 88, right: 332, bottom: 1400, width: 244, height: 880 } as DOMRect));
    footer.getBoundingClientRect = vi.fn(() => ({ top: 1780, left: 88, right: 332, bottom: 1845, width: 244, height: 65 } as DOMRect));

    await exportSheetToPngBytes(sheet);

    expect(vi.mocked(toBlob)).toHaveBeenCalledOnce();
    expect(widthDuringCapture).toBe("1080px");
    expect(maxWidthDuringCapture).toBe("1080px");
    expect(transformDuringCapture).toBe("none");
    expect(sheet.style.width).toBe("420px");
    expect(sheet.style.maxWidth).toBe("420px");
    expect(sheet.style.transform).toBe("scale(0.4)");
  });

  it("allows micro density sheets to scale further before capture", async () => {
    let contentTransformDuringCapture = "";
    vi.mocked(toBlob).mockImplementation(async () => {
      contentTransformDuringCapture = content.style.transform;
      return {
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
      } as unknown as Blob;
    });
    const sheet = document.createElement("article");
    const content = document.createElement("main");
    const footer = document.createElement("footer");
    sheet.className = "export-sheet";
    sheet.dataset.density = "micro";
    content.className = "export-sheet-content";
    footer.className = "export-sheet-footer";
    sheet.append(content, footer);

    Object.defineProperty(sheet, "clientHeight", { value: 1920 });
    Object.defineProperty(sheet, "clientWidth", { value: 1080 });
    Object.defineProperty(sheet, "scrollHeight", { value: 3600 });
    Object.defineProperty(sheet, "scrollWidth", { value: 1080 });
    sheet.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, right: 1080, bottom: 1920, width: 1080, height: 1920 } as DOMRect));
    content.getBoundingClientRect = vi.fn(() => ({ top: 520, left: 88, right: 992, bottom: 3300, width: 904, height: 2780 } as DOMRect));
    footer.getBoundingClientRect = vi.fn(() => ({ top: 1780, left: 88, right: 992, bottom: 1845, width: 904, height: 65 } as DOMRect));

    await exportSheetToPngBytes(sheet);

    expect(contentTransformDuringCapture).toBe("scale(0.44316546762589926)");
    expect(content.style.transform).toBe("");
  });

  it("rejects broken images before capture", async () => {
    const sheet = document.createElement("article");
    const image = document.createElement("img");
    image.alt = "broken pressure image";
    image.src = "missing.png";
    sheet.append(image);

    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 0 });
    Object.defineProperty(image, "naturalHeight", { value: 0 });

    await expect(exportSheetToPngBytes(sheet)).rejects.toThrow("图片加载失败");
    expect(vi.mocked(toBlob)).not.toHaveBeenCalled();
  });
});
