import { Button } from "../../shared/components/Button";

type PreviewActionsProps = {
  isExporting: boolean;
  canExportActive?: boolean;
  canExportAll: boolean;
  onBack: () => void;
  onExportActive: () => void;
  onExportAll: () => void;
};

export function PreviewActions({
  isExporting,
  canExportActive = true,
  canExportAll,
  onBack,
  onExportActive,
  onExportAll
}: PreviewActionsProps) {
  return (
    <div className="hero-actions">
      <Button variant="secondary" onClick={onBack}>
        返回编辑
      </Button>
      <Button disabled={isExporting || !canExportActive} isLoading={isExporting} onClick={onExportActive} variant="primary">
        {isExporting ? "导出中..." : "导出图片"}
      </Button>
      {canExportAll ? (
        <Button disabled={isExporting} onClick={onExportAll} variant="secondary">
          导出全部
        </Button>
      ) : null}
    </div>
  );
}
