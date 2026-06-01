import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskProgressDialog } from "./TaskProgressDialog";

describe("TaskProgressDialog", () => {
  it("shows task progress without blocking the whole app visually", () => {
    render(
      <TaskProgressDialog
        open
        task={{
          id: "task-1",
          kind: "import_json",
          status: "running",
          title: "导入 JSON",
          current: 30,
          total: 100,
          message: "正在校验题目",
          createdAt: "2026-05-18",
          updatedAt: "2026-05-18"
        }}
        onClose={() => undefined}
      />
    );

    expect(screen.getByText("导入 JSON")).toBeInTheDocument();
    expect(screen.getByText("正在校验题目")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
  });
});
