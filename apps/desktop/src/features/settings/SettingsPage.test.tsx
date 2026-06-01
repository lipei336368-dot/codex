import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { chooseDirectory } from "../../shared/platform/files";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    getDataDirectory: vi.fn(),
    revealPath: vi.fn(),
    setDataDirectory: vi.fn()
  }
}));

vi.mock("../../shared/platform/files", () => ({
  chooseDirectory: vi.fn()
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(apiClient.getDataDirectory).mockResolvedValue("D:\\软件数据");
    vi.mocked(apiClient.revealPath).mockResolvedValue(undefined);
    vi.mocked(apiClient.setDataDirectory).mockResolvedValue("E:\\毅研数据");
    vi.mocked(chooseDirectory).mockResolvedValue("E:\\每日一题");
    useAppStore.getState().resetApp();
  });

  it("saves the exam date setting for daily question countdowns", () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("考研日期"), { target: { value: "2026-12-26" } });
    fireEvent.change(screen.getByLabelText("默认导出文件夹"), { target: { value: "D:\\每日一题导出" } });
    fireEvent.click(screen.getByRole("button", { name: /保存设置/ }));

    expect(screen.getByText("软件设置")).toBeInTheDocument();
    expect(useAppStore.getState().examDate).toBe("2026-12-26");
    expect(useAppStore.getState().defaultExportDirectory).toBe("D:\\每日一题导出");
    expect(window.localStorage.getItem("yiyan.examDate")).toBe("2026-12-26");
    expect(window.localStorage.getItem("yiyan.defaultExportDirectory")).toBe("D:\\每日一题导出");
    expect(screen.getByRole("status")).toHaveTextContent("已保存设置");
  });

  it("selects the default export directory from a folder picker", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "选择文件夹" }));

    await waitFor(() => {
      expect(screen.getByLabelText("默认导出文件夹")).toHaveValue("E:\\每日一题");
    });
  });

  it("opens the app data directory", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("本地数据位置")).toBeInTheDocument();
    expect(await screen.findByText("D:\\软件数据")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开文件夹" }));

    await waitFor(() => {
      expect(apiClient.revealPath).toHaveBeenCalledWith("D:\\软件数据");
    });
  });

  it("sets a new app data directory for the next restart", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "更改位置" }));

    await waitFor(() => {
      expect(apiClient.setDataDirectory).toHaveBeenCalledWith("E:\\每日一题");
    });
    expect(await screen.findByText("E:\\毅研数据")).toBeInTheDocument();
    expect(screen.getByText("新的数据文件夹会在重启软件后使用。")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("数据文件夹已设置，重启软件后生效");
  });
});
