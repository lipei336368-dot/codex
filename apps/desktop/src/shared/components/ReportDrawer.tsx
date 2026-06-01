import { Button } from "./Button";

type ReportSummary = {
  label: string;
  value: string | number;
};

type ReportDrawerProps = {
  title: string;
  summary: ReportSummary[];
  details: string[];
  onClose: () => void;
};

export function ReportDrawer({ title, summary, details, onClose }: ReportDrawerProps) {
  return (
    <aside className="report-drawer" aria-label={title}>
      <div className="section-header">
        <div>
          <div className="eyebrow">报告</div>
          <h2>{title}</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          关闭报告
        </Button>
      </div>
      <div className="report-summary">
        {summary.map((item) => (
          <div className="report-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="report-details">
        {details.length === 0 ? <p>无错误</p> : details.map((item) => <p key={item}>{item}</p>)}
      </div>
    </aside>
  );
}
