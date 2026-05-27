import { render, screen } from "@testing-library/react";
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
                created_at: "2026-05-27T00:00:00.000Z",
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
                employee_id: "employee-3",
                employee_name: "퇴직자",
                resource_id: "resource-1",
                resource_title: "화재 안전 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
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
              { id: "employee-3", name: "퇴직자", phone: "", phone_normalized: "", is_retired: true },
            ],
            worksites: [],
            assignments: [],
            summary: { totalEmployees: 3, currentlyClockedIn: 0 },
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
      "/manager/safty/resources/new",
    );
    expect(screen.getByRole("columnheader", { name: "제목" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "유튜브 링크" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "이수현황" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "화재 안전 교육" })).toHaveAttribute(
      "href",
      "/manager/safty/resources/save/resource-1",
    );
    expect(screen.getByRole("link", { name: "https://www.youtube.com/watch?v=fireSafety" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=fireSafety",
    );
    expect(screen.getByRole("link", { name: "1/2" })).toHaveAttribute(
      "href",
      "/manager/safty/completions?resourceId=resource-1",
    );

    await user.type(screen.getByLabelText("제목"), "미등록");
    expect(screen.queryByText("화재 안전 교육")).not.toBeInTheDocument();
    expect(screen.getByText("조회 결과에 해당하는 교육자료가 없습니다.")).toBeInTheDocument();
  });
});
