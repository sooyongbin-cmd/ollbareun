import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationReportPage from "./page";

describe("education report page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches current year on open and enables excel when rows exist", async () => {
    const year = new Date().getFullYear();
    const fetchMock = vi.fn(async () =>
      Response.json({
        rows: [{ employeeName: "김철수", completedCount: 1, totalCount: 2 }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<EducationReportPage />);

    expect(screen.getByRole("heading", { name: "교육이수자료" })).toBeInTheDocument();
    expect(screen.getByLabelText("연도")).toHaveValue(year);
    expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/manager/reports/education?year=${year}`));
    expect(await screen.findByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
  });
});
