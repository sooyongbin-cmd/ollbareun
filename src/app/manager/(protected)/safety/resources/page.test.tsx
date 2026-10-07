import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EducationResourcesPage from "./page";

const resources = [
  { id: "other", title: "기타 교재", education_type: "other" },
  { id: "semiannual", title: "반기 교재", education_type: "semiannual" },
  { id: "quarterly", title: "분기 교재", education_type: "quarterly" },
  { id: "monthly", title: "월간 교재", education_type: "monthly" },
  { id: "daily", title: "일일 교재", education_type: "daily" },
].map((resource) => ({ ...resource, startdate: "2026-10-07", enddate: "2026-10-31" }));

describe("education resources list", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("shows dates and categories in the requested order without fetching completion counts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ resources }));
    vi.stubGlobal("fetch", fetchMock);
    render(<EducationResourcesPage />);
    await screen.findByText("일일 교재");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["교육구분", "제목", "시작일", "종료일"]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["일일", "월별", "분기", "반기", "기타"]);
    expect(within(rows[0]).getByText("2026-10-07")).toBeInTheDocument();
    expect(within(rows[0]).getByText("2026-10-31")).toBeInTheDocument();
    expect(screen.queryByText("이수현황")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "일일 교재" })).toHaveAttribute("href", "/manager/safety/resources/save/daily");
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "미등록" } });
    expect(screen.getByText("조회 결과에 해당하는 교육자료가 없습니다.")).toBeInTheDocument();
  });
});