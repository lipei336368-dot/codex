import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    getBankSummary: vi.fn(),
    listGeneratedDates: vi.fn()
  }
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage subjectId="pharmaceutics" />
    </QueryClientProvider>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    vi.mocked(apiClient.getBankSummary).mockResolvedValue({
      total: 12,
      available: 7,
      byType: { singleChoice: 6, multipleChoice: 2, shortAnswer: 3, essay: 1 },
      availableByType: { singleChoice: 4, multipleChoice: 1, shortAnswer: 2, essay: 0 }
    });
    vi.mocked(apiClient.listGeneratedDates).mockResolvedValue([`${currentMonth}-01`, `${currentMonth}-12`, "2026-04-30"]);
  });

  it("renders real bank and current-month generation counts", async () => {
    renderDashboard();

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(apiClient.getBankSummary).toHaveBeenCalledWith("pharmaceutics");
    expect(apiClient.listGeneratedDates).toHaveBeenCalledWith("pharmaceutics");
  });
});
