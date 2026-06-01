import { describe, expect, it } from "vitest";
import { mergeImportReports } from "./useBankImportExport";

describe("mergeImportReports", () => {
  it("sums added, skipped, and errors across imported files", () => {
    expect(
      mergeImportReports([
        { added: 2, skipped: 1, errorsCount: 1, errors: [{ index: 3, stem: "题干", message: "重复" }] },
        { added: 4, skipped: 0, errorsCount: 0, errors: [] }
      ])
    ).toEqual({
      added: 6,
      skipped: 1,
      errorsCount: 1,
      errors: [{ index: 3, stem: "题干", message: "重复" }]
    });
  });
});
