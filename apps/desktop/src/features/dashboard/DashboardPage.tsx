import { useQuery } from "@tanstack/react-query";
import type { SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { Button } from "../../shared/components/Button";

type DashboardPageProps = {
  subjectId: SubjectId;
};

const emptySummary = {
  total: 0,
  available: 0,
  byType: { singleChoice: 0, multipleChoice: 0, shortAnswer: 0, essay: 0 },
  availableByType: { singleChoice: 0, multipleChoice: 0, shortAnswer: 0, essay: 0 }
};

export function DashboardPage({ subjectId }: DashboardPageProps) {
  const openPreview = useAppStore((state) => state.openPreview);
  const setPage = useAppStore((state) => state.setPage);

  const { data: summary = emptySummary } = useQuery({
    queryKey: ["bank-summary", subjectId],
    queryFn: () => apiClient.getBankSummary(subjectId),
    retry: false
  });

  const { data: generatedDates = [] } = useQuery({
    queryKey: ["generated-dates", subjectId],
    queryFn: () => apiClient.listGeneratedDates(subjectId),
    retry: false
  });

  const currentMonthCount = generatedDates.filter((date) => date.startsWith(currentMonthPrefix())).length;

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <div className="eyebrow">今日工作台</div>
        <h2>生成每日一题</h2>
        <div className="hero-actions">
          <Button variant="primary" onClick={() => openPreview()}>
            生成预览
          </Button>
          <Button variant="secondary" onClick={() => setPage("bank")}>
            打开题库
          </Button>
        </div>
      </div>
      <section className="dashboard-grid">
        <div className="panel stat-panel">
          <span>题库总量</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="panel stat-panel">
          <span>可抽题目</span>
          <strong>{summary.available}</strong>
        </div>
        <div className="panel stat-panel">
          <span>本月已生成</span>
          <strong>{currentMonthCount}</strong>
        </div>
      </section>
    </section>
  );
}

function currentMonthPrefix(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
