import { expect, test } from "@playwright/test";

test("export sheets render without scrollbars", async ({ page }) => {
  await page.goto("http://127.0.0.1:1420");

  const sheets = await page.locator(".export-sheet").evaluateAll((nodes) =>
    nodes.map((node) => ({
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth
    }))
  );

  for (const sheet of sheets) {
    expect(sheet.scrollHeight).toBeLessThanOrEqual(sheet.clientHeight + 2);
    expect(sheet.scrollWidth).toBeLessThanOrEqual(sheet.clientWidth + 2);
  }
});
