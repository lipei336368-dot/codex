import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";
import { ImageLightbox } from "./ImageLightbox";
import { ReportDrawer } from "./ReportDrawer";
import { SegmentedControl } from "./SegmentedControl";
import { Select } from "./Select";
import { TextArea } from "./TextArea";
import { Toast } from "./Toast";

describe("design system components", () => {
  it("exposes commercial UI design tokens", () => {
    render(<button className="button button-primary">保存</button>);
    const tokensCss = readFileSync(join(process.cwd(), "src/shared/design-system/tokens.css"), "utf8");

    expect(tokensCss).toContain("--motion-fast: 120ms");
    expect(tokensCss).toContain("--glass-panel:");
    expect(tokensCss).toContain("--shadow-floating:");
  });

  it("does not call disabled button actions", () => {
    const onClick = vi.fn();

    render(<Button disabled onClick={onClick}>保存</Button>);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("closes the shared dialog from backdrop click", () => {
    const onClose = vi.fn();

    render(
      <Dialog open title="确认操作" onClose={onClose}>
        <p>内容</p>
      </Dialog>
    );

    fireEvent.click(screen.getByRole("presentation", { hidden: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders centered toast status text", () => {
    render(<Toast message="已导出图片" tone="success" placement="center" />);

    expect(screen.getByRole("status")).toHaveTextContent("已导出图片");
    expect(screen.getByRole("status")).toHaveClass("toast-center");
  });

  it("keeps workbench pages on a stable scrollable height chain", () => {
    const globalCss = readFileSync(join(process.cwd(), "src/shared/design-system/global.css"), "utf8");
    const layoutCss = readFileSync(join(process.cwd(), "src/shared/design-system/layout.css"), "utf8");
    const bankCss = readFileSync(join(process.cwd(), "src/shared/design-system/bank.css"), "utf8");
    const previewCss = readFileSync(join(process.cwd(), "src/shared/design-system/preview.css"), "utf8");

    expect(globalCss).toMatch(/\.workspace\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);/s);
    expect(globalCss).toMatch(/\.workspace-content\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s);
    expect(globalCss).not.toMatch(/\.workspace\s*\{[^}]*overflow:\s*hidden;/s);
    expect(layoutCss).toMatch(/\.app-workbench-grid\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
    expect(layoutCss).toMatch(/\.page-frame\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
    expect(layoutCss).toMatch(/\.three-pane\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
    expect(bankCss).toMatch(/\.bank-page\s*\{[^}]*display:\s*grid;[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);
    expect(bankCss).toMatch(/\.bank-workbench\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(bankCss).toMatch(/@media \(max-width:\s*1180px\)\s*\{[\s\S]*\.bank-workbench\s*\{[^}]*grid-template-columns:\s*156px minmax\(0,\s*1fr\);/s);
    expect(bankCss).toMatch(/\.bank-list-pane\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s);
    expect(bankCss).toMatch(/\.virtual-question-list\s*\{[^}]*min-height:\s*0;[^}]*height:\s*100%;[^}]*overflow:\s*auto;/s);
    expect(previewCss).toMatch(/\.preview-page\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(previewCss).toMatch(/\.preview-workspace\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(previewCss).toMatch(/\.preview-stage\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
  });

  it("defines consistent action, dialog, toast, and settings surface classes", () => {
    const globalCss = readFileSync(join(process.cwd(), "src/shared/design-system/global.css"), "utf8");

    expect(globalCss).toMatch(/\.app-toast\s*\{/);
    expect(globalCss).toMatch(/\.app-dialog-surface\s*\{/);
    expect(globalCss).toMatch(/\.settings-card\s*\{/);
    expect(globalCss).toMatch(/\.button-loading\s*\{/);
  });

  it("uses a custom integrated desktop titlebar instead of the native strip", () => {
    const globalCss = readFileSync(join(process.cwd(), "src/shared/design-system/global.css"), "utf8");
    const tauriConfig = readFileSync(join(process.cwd(), "src-tauri/tauri.conf.json"), "utf8");
    const capability = readFileSync(join(process.cwd(), "src-tauri/capabilities/default.json"), "utf8");
    const appChrome = readFileSync(join(process.cwd(), "src/shared/components/AppChrome.tsx"), "utf8");
    const appShell = readFileSync(join(process.cwd(), "src/shared/components/AppShell.tsx"), "utf8");

    expect(tauriConfig).toMatch(/"decorations"\s*:\s*false/);
    expect(tauriConfig).toMatch(/"visible"\s*:\s*false/);
    expect(tauriConfig).toMatch(/"minWidth"\s*:\s*920/);
    expect(tauriConfig).toMatch(/"minHeight"\s*:\s*620/);
    expect(globalCss).toMatch(/:root\s*\{[^}]*--app-titlebar-height:\s*38px;/s);
    expect(globalCss).toMatch(/\.app-chrome\s*\{[^}]*grid-template-rows:\s*var\(--app-titlebar-height\) minmax\(0,\s*1fr\);/s);
    expect(globalCss).toMatch(/\.app-titlebar\s*\{[^}]*backdrop-filter:\s*blur\(20px\);/s);
    expect(globalCss).not.toMatch(/\.app-titlebar\s*\{[^}]*-webkit-app-region:\s*drag;/s);
    expect(globalCss).toMatch(/\.app-titlebar-window-controls\s*\{/);
    expect(globalCss).toMatch(/\.app-titlebar-drag-region\s*\{[^}]*flex:\s*1;/s);
    expect(globalCss).toMatch(/\.top-status-drag-fill\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
    expect(capability).toContain("core:window:allow-minimize");
    expect(capability).toContain("core:window:allow-show");
    expect(capability).toContain("core:window:allow-start-dragging");
    expect(capability).toContain("core:window:allow-toggle-maximize");
    expect(capability).toContain("core:window:allow-close");
    expect(appChrome).toContain("app_window_minimize");
    expect(appChrome).toContain("app_window_toggle_maximize");
    expect(appChrome).toContain("app_window_close");
    expect(appChrome).toContain("getCurrentWindow");
    expect(appChrome).toContain("startDragging");
    expect(appShell).toContain("top-status-drag-fill");
    expect(appShell).toContain("data-tauri-drag-region");
  });

  it("keeps immersive preview, entry, and edit pages draggable and responsive in small windows", () => {
    const bankCss = readFileSync(join(process.cwd(), "src/shared/design-system/bank.css"), "utf8");
    const previewCss = readFileSync(join(process.cwd(), "src/shared/design-system/preview.css"), "utf8");
    const previewPage = readFileSync(join(process.cwd(), "src/features/preview/PreviewPage.tsx"), "utf8");
    const previewSheets = readFileSync(join(process.cwd(), "src/features/preview/PreviewSheets.tsx"), "utf8");
    const entryPage = readFileSync(join(process.cwd(), "src/features/entry/EntryPage.tsx"), "utf8");
    const bankEditPanel = readFileSync(join(process.cwd(), "src/features/bank/components/BankEditPanel.tsx"), "utf8");

    expect(previewPage).toContain("preview-window-drag-region");
    expect(previewPage).toContain("data-tauri-drag-region");
    expect(entryPage).toContain("data-tauri-drag-region");
    expect(bankEditPanel).toContain("data-tauri-drag-region");
    expect(previewSheets).toContain("(max-width: 860px)");
    expect(previewCss).toMatch(/\.preview-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(278px,\s*340px\) minmax\(0,\s*1fr\);/s);
    expect(previewCss).toMatch(/@media \(max-width:\s*1080px\), \(max-height:\s*680px\)\s*\{[\s\S]*\.preview-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(240px,\s*292px\) minmax\(0,\s*1fr\);/s);
    expect(previewCss).toMatch(/\.preview-window-drag-region\s*\{[^}]*position:\s*absolute;[^}]*height:\s*78px;/s);
    expect(bankCss).toMatch(/@media \(max-width:\s*1180px\)\s*\{[\s\S]*\.bank-edit-shell,\s*\.entry-edit-shell\s*\{[^}]*width:\s*min\(100% - 40px,\s*1500px\);/s);
    expect(bankCss).toMatch(/@media \(max-width:\s*980px\)\s*\{[\s\S]*\.entry-type-control\s*\{[^}]*grid-column:\s*2 \/ -1;/s);
    expect(bankCss).toMatch(/\.bank-edit-secondary-field \.option-image-row \.option-correct-check,\s*\.option-editor \.option-correct-control\s*\{[^}]*grid-column:\s*4;/s);
    expect(bankCss).toMatch(/\.bank-edit-secondary-field \.option-image-row \.image-attachment,\s*\.option-editor \.image-attachment\s*\{[^}]*grid-column:\s*5;/s);
    expect(bankCss).toMatch(/\.bank-edit-secondary-field \.option-image-row \.option-row-delete,\s*\.option-editor \.option-row-delete\s*\{[^}]*grid-column:\s*6;/s);
  });

  it("keeps the immersive bank editor dense and readable for long text", () => {
    const bankCss = readFileSync(join(process.cwd(), "src/shared/design-system/bank.css"), "utf8");
    const globalCss = readFileSync(join(process.cwd(), "src/shared/design-system/global.css"), "utf8");

    expect(bankCss).toMatch(/\.bank-edit-page\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*var\(--app-titlebar-height,\s*38px\) 0 0;/s);
    expect(bankCss).toMatch(/\.bank-edit-shell\s*\{[^}]*width:\s*min\(1520px,\s*calc\(100vw - 128px\)\);/s);
    expect(bankCss).toMatch(/\.bank-edit-header\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s);
    expect(bankCss).not.toMatch(/\.bank-edit-header\s*\{[^}]*position:\s*sticky;/s);
    expect(bankCss).toMatch(/\.bank-edit-main-card\s*\{[^}]*display:\s*grid;[^}]*gap:\s*22px;/s);
    expect(bankCss).not.toMatch(/max-height:\s*180px\s*!important;/);
    expect(bankCss).not.toMatch(/max-height:\s*none\s*!important;/);
    expect(bankCss).toMatch(/\.bank-edit-form-grid\s*\{[^}]*display:\s*grid;[^}]*gap:\s*22px;[^}]*overflow:\s*visible;/s);
    expect(bankCss).not.toMatch(/\.bank-edit-form-grid\s*\{[^}]*grid-template-columns:/s);
    expect(bankCss).toMatch(/\.bank-edit-primary-field textarea\s*\{[^}]*min-height:\s*54px;[^}]*font-size:\s*16px;/s);
    expect(bankCss).toMatch(/\.bank-edit-secondary-field \.option-image-row\s*\{[^}]*grid-template-columns:\s*28px 52px minmax\(0,\s*1fr\) auto auto auto;/s);
    expect(bankCss).toMatch(/\.bank-edit-secondary-field \.option-image-label textarea\s*\{[^}]*min-height:\s*44px;/s);
    expect(bankCss).toMatch(/\.option-auto-textarea\s*\{[^}]*field-sizing:\s*content;/s);
    expect(globalCss).toMatch(/\.option-image-label input,\s*\.option-image-label textarea\s*\{[^}]*white-space:\s*normal;/s);
    expect(globalCss).toMatch(/\.option-text-control input,\s*\.option-text-control textarea\s*\{[^}]*field-sizing:\s*content;/s);
  });

  it("allows answer export cards to wrap long short-answer and essay text", () => {
    const exportCss = readFileSync(join(process.cwd(), "src/shared/design-system/export-image.css"), "utf8");

    expect(exportCss).toMatch(/\.export-answer-pill\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s);
    expect(exportCss).toMatch(/\.export-answer-pill\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(exportCss).toMatch(/\.export-answer-text,\s*\.export-analysis\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(exportCss).toMatch(/\.export-structured-line:not\(:first-child\)\s*\{[^}]*padding-left:\s*1\.7em;[^}]*text-indent:\s*-1\.7em;/s);
    expect(exportCss).toMatch(/\.export-sheet\[data-density="ultra"\] \.export-answer-card,\s*\.export-sheet\[data-density="micro"\] \.export-answer-card\s*\{[^}]*grid-template-columns:\s*44px 1fr;/s);
    expect(exportCss).toMatch(/\.export-sheet\[data-density="micro"\] \.export-question-card\s*\{[^}]*grid-template-columns:\s*38px 1fr;/s);
  });

  it("keeps subject selection startup lean and loads heavy feature CSS with routes", () => {
    const mainTsx = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");
    const appTsx = readFileSync(join(process.cwd(), "src/app/App.tsx"), "utf8");
    const bankPage = readFileSync(join(process.cwd(), "src/features/bank/BankPage.tsx"), "utf8");
    const entryPage = readFileSync(join(process.cwd(), "src/features/entry/EntryPage.tsx"), "utf8");
    const previewPage = readFileSync(join(process.cwd(), "src/features/preview/PreviewPage.tsx"), "utf8");
    const settingsPage = readFileSync(join(process.cwd(), "src/features/settings/SettingsPage.tsx"), "utf8");

    expect(mainTsx).toContain("./shared/design-system/global.css");
    expect(mainTsx).not.toContain("./shared/design-system/bank.css");
    expect(mainTsx).not.toContain("./shared/design-system/preview.css");
    expect(mainTsx).not.toContain("./shared/design-system/export-image.css");
    expect(mainTsx).not.toContain("./shared/design-system/settings.css");
    expect(appTsx).toContain("lazy(async () =>");
    expect(appTsx).toContain('import("./WorkbenchPage")');
    expect(appTsx).toContain("WindowReadySignal");
    expect(appTsx).toContain("requestAnimationFrame");
    expect(appTsx).toContain("getCurrentWindow().show()");
    expect(bankPage).toContain("../../shared/design-system/bank.css");
    expect(entryPage).toContain("../../shared/design-system/bank.css");
    expect(previewPage).toContain("../../shared/design-system/preview.css");
    expect(previewPage).toContain("../../shared/design-system/export-image.css");
    expect(settingsPage).toContain("../../shared/design-system/settings.css");
  });

  it("selects options through the shared Select component", () => {
    const onChange = vi.fn();

    render(
      <Select
        label="章节"
        value="chapter-1"
        options={[
          { label: "第一章 绪论", value: "chapter-1" },
          { label: "第二章 药物的物理化学相互作用", value: "chapter-2" }
        ]}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText("章节"), { target: { value: "chapter-2" } });

    expect(onChange).toHaveBeenCalledWith("chapter-2");
  });

  it("switches values through SegmentedControl", () => {
    const onChange = vi.fn();

    render(
      <SegmentedControl
        ariaLabel="题型"
        value="choice"
        options={[
          { label: "选择题", value: "choice" },
          { label: "简答题", value: "short" }
        ]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "简答题" }));

    expect(onChange).toHaveBeenCalledWith("short");
    expect(screen.getByRole("button", { name: "选择题" })).toHaveAttribute("aria-pressed", "true");
  });

  it("auto grows text areas within configured limits without forcing tall empty boxes", () => {
    render(<TextArea label="题干" value="短题干" onChange={() => undefined} minRows={1} maxRows={5} />);

    const textArea = screen.getByLabelText("题干");

    expect(textArea).toHaveAttribute("rows", "1");
    expect(textArea).toHaveStyle({ maxHeight: "160px" });
    expect(textArea).toHaveStyle({ overflowY: "hidden" });
  });

  it("keeps high-risk confirmation disabled until countdown ends", () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        title="重置抽题记录"
        message="将重置 5 道题。"
        confirmLabel="确认重置"
        countdownSeconds={3}
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("button", { name: "确认重置 3" })).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("button", { name: "确认重置" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "确认重置" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("renders report drawer details and closes through its action", () => {
    const onClose = vi.fn();

    render(
      <ReportDrawer
        title="导入报告"
        summary={[
          { label: "新增", value: 4 },
          { label: "错误", value: 1 }
        ]}
        details={["第 2 题答案不在选项中"]}
        onClose={onClose}
      />
    );

    expect(screen.getByText("第 2 题答案不在选项中")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭报告" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes image lightbox when clicking blank backdrop", () => {
    const onClose = vi.fn();

    render(<ImageLightbox alt="每日一题预览" src="preview.png" onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog", { name: "图片预览" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
