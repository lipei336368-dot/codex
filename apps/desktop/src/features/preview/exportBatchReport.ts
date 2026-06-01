export type ExportBatchItemResult = {
  publishDate: string;
  ok: boolean;
};

export function buildExportBatchReport(results: ExportBatchItemResult[]) {
  const failedDates = results.filter((result) => !result.ok).map((result) => result.publishDate);

  if (failedDates.length === 0) {
    return { ok: true, message: `已导出全部 ${results.length} 天` };
  }

  return {
    ok: false,
    message: `导出失败：${failedDates.join("、")}。成功的日期未标记为已抽取，请重新导出。`
  };
}
