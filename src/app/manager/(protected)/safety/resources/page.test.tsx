import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationResourcesPage from "./page";

describe("education resources page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/education/resources")) {
          return Response.json({
            resources: [
              {
                id: "resource-1",
                title: "화재 안전 교육",
                youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                duration_seconds: 125,
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-2",
                title: "감전 예방 교육",
                youtube_link: "https://www.youtube.com/watch?v=electricSafety",
                duration_seconds: 245,
                created_at: "2026-05-28T00:00:00.000Z",
              },
            ],
          });
        }
        if (url.endsWith("/api/education/completions")) {
          return Response.json({
            completions: [
              {
                employee_id: "employee-1",
                employee_name: "홍길동",
                resource_id: "resource-1",
                resource_title: "화재 안전 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                is_completed: true,
                completed_at: "2026-05-27T09:10:00.000Z",
              },
              {
                employee_id: "employee-2",
                employee_name: "이순신",
                resource_id: "resource-1",
                resource_title: "화재 안전 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                is_completed: false,
                completed_at: null,
              },
              {
                employee_id: "employee-1",
                employee_name: "홍길동",
                resource_id: "resource-2",
                resource_title: "감전 예방 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=electricSafety",
                is_completed: true,
                completed_at: "2026-05-27T09:15:00.000Z",
              },
              {
                employee_id: "employee-2",
                employee_name: "이순신",
                resource_id: "resource-2",
                resource_title: "감전 예방 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=electricSafety",
                is_completed: true,
                completed_at: "2026-05-27T09:20:00.000Z",
              },
            ],
          });
        }
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "employee-1", name: "홍길동", phone: "", phone_normalized: "", is_retired: false },
              { id: "employee-2", name: "이순신", phone: "", phone_normalized: "", is_retired: false },
            ],
            worksites: [],
            assignments: [],
            summary: { totalEmployees: 2, currentlyClockedIn: 0 },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders a searchable list of education resources", async () => {
    const user = userEvent.setup();

    render(<EducationResourcesPage />);

    expect(await screen.findByRole("heading", { name: "교육자료관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "교재등록" })).toHaveAttribute(
      "href",
      "/manager/safety/resources/new",
    );
    expect(screen.getByRole("columnheader", { name: "제목" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "유튜브 링크" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "시간" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "이수현황" })).toBeInTheDocument();
    expect(within(screen.getAllByRole("row")[1]).getByText("4:05")).toBeInTheDocument();
    expect(within(screen.getAllByRole("row")[2]).getByText("2:05")).toBeInTheDocument();
    
    expect(screen.getByRole("link", { name: "화재 안전 교육" })).toHaveAttribute(
      "href",
      "/manager/safety/resources/save/resource-1",
    );

    // completed 1/2 for resource-1
    expect(screen.getByRole("link", { name: "1/2" })).toHaveAttribute(
      "href",
      "/manager/safety/completions/detail?resourceId=resource-1",
    );

    await user.type(screen.getByLabelText("제목"), "미등록");
    expect(screen.queryByText("화재 안전 교육")).not.toBeInTheDocument();
    expect(screen.getByText("조회 결과에 해당하는 교육자료가 없습니다.")).toBeInTheDocument();
  });

  it("sorts resources by title and completions count", async () => {
    const user = userEvent.setup();

    render(<EducationResourcesPage />);

    // Wait for load to finish
    await screen.findAllByRole("row");

    // Default order should be title ASC: 감전 예방 교육, 화재 안전 교육 (감 < 화)
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("감전 예방 교육")).toBeInTheDocument();
    expect(within(rows[2]).getByText("화재 안전 교육")).toBeInTheDocument();

    // Click "제목" to sort DESC: 화재 안전 교육 first, then 감전 예방 교육
    const titleHeader = screen.getByRole("columnheader", { name: "제목" });
    await user.click(titleHeader);

    const updatedRows = screen.getAllByRole("row");
    expect(within(updatedRows[1]).getByText("화재 안전 교육")).toBeInTheDocument();
    expect(within(updatedRows[2]).getByText("감전 예방 교육")).toBeInTheDocument();

    // Click "이수현황" to sort completions count ASC: 화재 안전 교육 (1/2) first, then 감전 예방 교육 (2/2)
    const completionsHeader = screen.getByRole("columnheader", { name: "이수현황" });
    await user.click(completionsHeader);

    const updatedRows2 = screen.getAllByRole("row");
    expect(within(updatedRows2[1]).getByText("화재 안전 교육")).toBeInTheDocument();
    expect(within(updatedRows2[2]).getByText("감전 예방 교육")).toBeInTheDocument();

    // Click "이수현황" again to sort completions count DESC: 감전 예방 교육 (2/2) first, then 화재 안전 교육 (1/2)
    await user.click(completionsHeader);

    const updatedRows3 = screen.getAllByRole("row");
    expect(within(updatedRows3[1]).getByText("감전 예방 교육")).toBeInTheDocument();
    expect(within(updatedRows3[2]).getByText("화재 안전 교육")).toBeInTheDocument();
  });
});
