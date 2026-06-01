import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUBJECTS } from "./subjects";
import { SubjectSelectPage } from "./SubjectSelectPage";

describe("SubjectSelectPage", () => {
  it("uses a focused two by two subject chooser without extra explanatory UI", () => {
    render(<SubjectSelectPage />);

    expect(screen.getByRole("button", { name: "药剂学" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "药理学" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "药物化学" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "药物分析" })).toBeInTheDocument();
    expect(screen.queryByText(/说明|使用|功能|教程/)).not.toBeInTheDocument();
    expect(screen.queryByText(/每日一题生成器/)).not.toBeInTheDocument();
  });

  it("uses two-character subject abbreviations for app navigation", () => {
    expect(SUBJECTS.map((subject) => [subject.name, subject.shortName])).toEqual([
      ["药剂学", "药剂"],
      ["药理学", "药理"],
      ["药物化学", "药化"],
      ["药物分析", "药分"]
    ]);
  });
});
