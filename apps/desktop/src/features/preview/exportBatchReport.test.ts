import { describe, expect, it } from "vitest";
import { buildExportBatchReport } from "./exportBatchReport";

describe("buildExportBatchReport", () => {
  it("summarizes full batch success", () => {
    expect(
      buildExportBatchReport([
        { publishDate: "2026-06-01", ok: true },
        { publishDate: "2026-06-02", ok: true }
      ])
    ).toEqual({ ok: true, message: "已导出全部 2 天" });
  });

  it("summarizes partial failure with failed dates", () => {
    expect(
      buildExportBatchReport([
        { publishDate: "2026-06-01", ok: true },
        { publishDate: "2026-06-02", ok: false }
      ])
    ).toEqual({ ok: false, message: "导出失败：2026-06-02。成功的日期未标记为已抽取，请重新导出。" });
  });
});
