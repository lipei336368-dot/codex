import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Database, FolderOpen, Save } from "lucide-react";
import "../../shared/design-system/settings.css";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { Button } from "../../shared/components/Button";
import { SettingsCard } from "../../shared/components/SettingsCard";
import { ToastHost } from "../../shared/components/ToastHost";
import { chooseDirectory } from "../../shared/platform/files";

export function SettingsPage() {
  const examDate = useAppStore((state) => state.examDate);
  const setExamDate = useAppStore((state) => state.setExamDate);
  const setPage = useAppStore((state) => state.setPage);
  const defaultExportDirectory = useAppStore((state) => state.defaultExportDirectory);
  const setDefaultExportDirectory = useAppStore((state) => state.setDefaultExportDirectory);
  const [draftExamDate, setDraftExamDate] = useState(examDate);
  const [draftExportDirectory, setDraftExportDirectory] = useState(defaultExportDirectory);
  const [dataDirectory, setDataDirectory] = useState("AppData");
  const [pendingDataDirectory, setPendingDataDirectory] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .getDataDirectory()
      .then((path) => {
        if (!cancelled) {
          setDataDirectory(path);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataDirectory("AppData");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function saveSettings() {
    setExamDate(draftExamDate);
    setDefaultExportDirectory(draftExportDirectory);
    setStatusMessage("已保存设置");
    window.setTimeout(() => setStatusMessage(""), 1600);
  }

  async function openDataDirectory() {
    await apiClient.revealPath(dataDirectory);
  }

  async function selectExportDirectory() {
    const directory = await chooseDirectory();
    if (directory) {
      setDraftExportDirectory(directory);
    }
  }

  async function selectDataDirectory() {
    const directory = await chooseDirectory();
    if (!directory) {
      return;
    }

    try {
      const nextDirectory = await apiClient.setDataDirectory(directory);
      setPendingDataDirectory(nextDirectory);
      setStatusMessage("数据文件夹已设置，重启软件后生效");
      window.setTimeout(() => setStatusMessage(""), 2600);
    } catch {
      setStatusMessage("数据文件夹设置失败");
      window.setTimeout(() => setStatusMessage(""), 2200);
    }
  }

  return (
    <section className="settings-page">
      <div className="settings-window-drag-region" data-tauri-drag-region aria-hidden="true" />

      <header className="settings-header">
        <h2>软件设置</h2>
        <div className="settings-actions">
          <Button variant="ghost" onClick={() => setPage("bank")}>
            <ArrowLeft size={18} />
            返回题库
          </Button>
          <Button variant="primary" onClick={saveSettings}>
            <Save size={18} />
            保存设置
          </Button>
        </div>
      </header>

      <div className="settings-grid">
        <SettingsCard title="考研日期">
          <div className="settings-field">
            <CalendarDays size={20} />
            <input
              aria-label="考研日期"
              type="date"
              value={draftExamDate}
              onChange={(event) => setDraftExamDate(event.target.value)}
            />
          </div>
        </SettingsCard>

        <SettingsCard title="默认导出文件夹">
          <div className="settings-inline-control">
            <div className="settings-field">
              <FolderOpen size={20} />
              <input
                aria-label="默认导出文件夹"
                placeholder="未设置"
                value={draftExportDirectory}
                onChange={(event) => setDraftExportDirectory(event.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={() => void selectExportDirectory()}>
              选择文件夹
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard title="本地数据位置">
          <div className="settings-data-row">
            <div className="settings-data-path">
              <Database size={20} />
              <span title={pendingDataDirectory || dataDirectory}>{pendingDataDirectory || dataDirectory}</span>
            </div>
            <Button variant="secondary" onClick={() => void selectDataDirectory()}>
              更改位置
            </Button>
            <Button variant="secondary" onClick={() => void openDataDirectory()}>
              打开文件夹
            </Button>
          </div>
          {pendingDataDirectory ? <p className="settings-restart-note">新的数据文件夹会在重启软件后使用。</p> : null}
        </SettingsCard>
      </div>

      <ToastHost message={statusMessage} kind="success" />
    </section>
  );
}
