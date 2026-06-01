import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __IMAGE_PRESSURE_EXPORT__?: (kind: "question" | "answer") => Promise<{
      width: number;
      height: number;
      pngWidth: number;
      pngHeight: number;
      byteLength: number;
    }>;
  }
}

const validScenarioIds = [
  "single-choice-images",
  "multiple-choice-images",
  "short-answer-long-answer-image",
  "essay-extreme-mixed",
  "animated-and-bmp"
];

const viewportCases = [
  { width: 920, height: 620 },
  { width: 1280, height: 720 },
  { width: 1475, height: 768 },
  { width: 1920, height: 1080 }
];

test.describe("image pressure harness", () => {
  for (const scenarioId of validScenarioIds) {
    test(`renders and exports valid scenario: ${scenarioId}`, async ({ page }) => {
      await openScenario(page, scenarioId, { width: 1475, height: 768 });

      await expectAllImagesDecoded(page, ".image-pressure-harness");
      await expectExportSheetsFit(page);
      await expectExportResult(page, "question");
      await expectExportResult(page, "answer");
    });
  }

  for (const viewport of viewportCases) {
    test(`keeps extreme image layout stable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await openScenario(page, "essay-extreme-mixed", viewport);

      await expectAllImagesDecoded(page, ".image-pressure-harness");
      await expectNoPageHorizontalOverflow(page);
      await expectPreviewCanvasesVisible(page);
      await expectExportSheetsFit(page);
    });
  }

  for (const surface of ["edit", "entry"] as const) {
    test(`keeps ${surface} image controls aligned with mixed image content`, async ({ page }) => {
      await openScenario(page, "single-choice-images", { width: 1475, height: 768 }, surface);

      await expectAllImagesDecoded(page, ".image-pressure-harness");
      await expectNoPageHorizontalOverflow(page);
      await expectOptionRowsStaySingleLine(page, surface === "edit" ? ".option-image-row" : ".option-editor");
    });
  }

  test("keeps bank list stable when questions contain image paths", async ({ page }) => {
    await openScenario(page, "single-choice-images", { width: 1475, height: 768 }, "bank");

    await expectNoPageHorizontalOverflow(page);
    const rows = await page.locator(".virtual-question-row").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.width).toBeGreaterThan(500);
      expect(row.height).toBeLessThanOrEqual(92);
    }
  });

  test("rejects corrupt image export instead of silently creating a broken PNG", async ({ page }) => {
    await openScenario(page, "invalid-corrupt-image", { width: 1475, height: 768 });

    await expect(
      page.evaluate(async () => {
        if (!window.__IMAGE_PRESSURE_EXPORT__) {
          throw new Error("image pressure export hook missing");
        }
        return window.__IMAGE_PRESSURE_EXPORT__("question");
      })
    ).rejects.toThrow(/image|图片|load|加载|decode/i);
  });
});

async function openScenario(
  page: Page,
  scenarioId: string,
  viewport: { width: number; height: number },
  surface: "preview" | "edit" | "entry" | "bank" = "preview"
) {
  await page.setViewportSize(viewport);
  await page.goto(`/?harness=image-pressure&scenario=${scenarioId}&surface=${surface}`);
  await expect(page.getByTestId("image-pressure-ready")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function expectAllImagesDecoded(page: Page, rootSelector: string) {
  const failures = await page.locator(rootSelector).locator("img").evaluateAll((images) =>
    images
      .map((image) => ({
        alt: image.alt,
        src: image.currentSrc || image.src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      }))
      .filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0)
  );
  expect(failures).toEqual([]);
}

async function expectExportSheetsFit(page: Page) {
  const sheets = await page.locator(".export-capture-stage .export-sheet").evaluateAll((nodes) =>
    nodes.map((node) => ({
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth
    }))
  );

  expect(sheets.length).toBeGreaterThan(0);
  for (const sheet of sheets) {
    expect(sheet.scrollHeight).toBeLessThanOrEqual(sheet.clientHeight + 2);
    expect(sheet.scrollWidth).toBeLessThanOrEqual(sheet.clientWidth + 2);
  }
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasOverflow).toBe(false);
}

async function expectPreviewCanvasesVisible(page: Page) {
  const canvases = await page.locator("[data-testid='preview-sheet-canvas']").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })
  );

  expect(canvases).toHaveLength(2);
  for (const canvas of canvases) {
    expect(canvas.width).toBeGreaterThan(120);
    expect(canvas.height).toBeGreaterThan(220);
  }
}

async function expectOptionRowsStaySingleLine(page: Page, rowSelector: string) {
  const rows = await page.locator(rowSelector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const rowRect = node.getBoundingClientRect();
      const controls = Array.from(
        node.querySelectorAll<HTMLElement>(
          ".option-letter, .option-image-label, .option-text-control, .option-correct-check, .option-correct-control, .image-attachment, .option-row-delete"
        )
      ).map((control) => {
        const rect = control.getBoundingClientRect();
        return { top: rect.top - rowRect.top, left: rect.left - rowRect.left, width: rect.width, height: rect.height };
      });
      return { width: rowRect.width, height: rowRect.height, controls };
    })
  );

  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.width).toBeGreaterThan(700);
    expect(row.controls.length).toBeGreaterThanOrEqual(4);
    for (const control of row.controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.left + control.width).toBeLessThanOrEqual(row.width + 2);
      expect(control.top).toBeLessThanOrEqual(76);
    }
  }
}

async function expectExportResult(page: Page, kind: "question" | "answer") {
  const result = await page.evaluate(async (exportKind) => {
    if (!window.__IMAGE_PRESSURE_EXPORT__) {
      throw new Error("image pressure export hook missing");
    }
    return window.__IMAGE_PRESSURE_EXPORT__(exportKind);
  }, kind);

  expect(result.width).toBe(1080);
  expect(result.height).toBe(1920);
  expect(result.pngWidth).toBe(1080);
  expect(result.pngHeight).toBe(1920);
  expect(result.byteLength).toBeGreaterThan(50_000);
}
