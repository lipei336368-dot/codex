import type { ReactNode } from "react";
import { Database, FilePlus2, Settings } from "lucide-react";
import { navigationItems } from "../../app/router";
import type { SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { SUBJECTS } from "../../features/subject/subjects";
import { Button } from "./Button";

type AppShellProps = {
  children: ReactNode;
  subjectId: SubjectId;
};

const iconByPage = {
  bank: Database,
  entry: FilePlus2,
  settings: Settings
};

export function AppShell({ children, subjectId }: AppShellProps) {
  const activePage = useAppStore((state) => state.activePage);
  const setPage = useAppStore((state) => state.setPage);
  const resetSubject = useAppStore((state) => state.resetSubject);
  const examDate = useAppStore((state) => state.examDate);
  const subject = SUBJECTS.find((item) => item.id === subjectId)!;

  return (
    <main className={`app-workbench-grid theme-${subject.themeKey}`}>
      <aside className="side-nav glass-panel" aria-label="主导航">
        <div className="side-brand">
          <div className="brand-mark">{subject.shortName}</div>
          <span>{subject.name}</span>
        </div>
        <nav className="side-nav-list" aria-label="主导航">
          {navigationItems.map((item) => {
            const Icon = iconByPage[item.page as keyof typeof iconByPage];
            const isActive = activePage === item.page;
            return (
              <button
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={isActive ? "side-nav-item side-nav-item-active" : "side-nav-item"}
                key={item.page}
                onClick={() => setPage(item.page)}
                type="button"
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="top-status-bar glass-panel">
          <div className="top-status-drag-fill" data-tauri-drag-region aria-hidden="true" />
          <div data-tauri-drag-region>
            <div className="eyebrow">当前科目</div>
            <h1 data-tauri-drag-region>{subject.name}</h1>
          </div>
          <div className="top-status-meta">
            <span data-tauri-drag-region>{todayIsoDate()}</span>
            <span>距离考研 {daysUntilExam(examDate)} 天</span>
            <Button variant="ghost" onClick={resetSubject}>
              切换科目
            </Button>
          </div>
        </header>
        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
}

function todayIsoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function daysUntilExam(examDate: string, date = new Date()) {
  const target = new Date(`${examDate}T00:00:00`);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(difference / 86_400_000));
}
