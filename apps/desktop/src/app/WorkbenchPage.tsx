import type { SubjectId } from "./store";
import { useAppStore } from "./store";
import { AppShell } from "../shared/components/AppShell";
import { BankPage } from "../features/bank/BankPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EntryPage } from "../features/entry/EntryPage";
import { GeneratePage } from "../features/generate/GeneratePage";
import { PreviewPage } from "../features/preview/PreviewPage";
import { SettingsPage } from "../features/settings/SettingsPage";

type WorkbenchPageProps = {
  subjectId: SubjectId;
};

export function WorkbenchPage({ subjectId }: WorkbenchPageProps) {
  const activePage = useAppStore((state) => state.activePage);

  if (activePage === "preview") {
    return <PreviewPage subjectId={subjectId} />;
  }

  if (activePage === "settings") {
    return <SettingsPage />;
  }

  return (
    <AppShell subjectId={subjectId}>
      {activePage === "dashboard" && <DashboardPage subjectId={subjectId} />}
      {activePage === "generate" && <GeneratePage subjectId={subjectId} />}
      {activePage === "bank" && <BankPage subjectId={subjectId} />}
      {activePage === "entry" && <EntryPage subjectId={subjectId} />}
    </AppShell>
  );
}
