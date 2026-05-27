import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationCompletionsPage from "./page";

describe("education completions page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/manager/safty/completions");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
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
                resource_id: "resource-2",
                resource_title: "순찰 안전 교육",
                resource_youtube_link: "https://youtu.be/patrolSafety",
                is_completed: false,
                completed_at: null,
              },
            ],
          });
        }
        if (url.endsWith("/api/education/resources")) {
          return Response.json({
            resources: [
              {
                id: "resource-1",
                title: "화재 안전 교육",
                youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-2",
                title: "순찰 안전 교육",
                youtube_link: "https://youtu.be/patrolSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-3",
                title: "감전 예방 교육",
                youtube_link: "https://www.youtube.com/watch?v=electricSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the education completion list", async () => {
    render(<EducationCompletionsPage />);

    expect(await screen.findByRole("heading", { name: "교육이수관리" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "직원" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "교재" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "완료여부" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "완료일자" })).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getAllByText("화재 안전 교육")).toHaveLength(2);
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.getByText("미완료")).toBeInTheDocument();
  });

  it("filters education completions by selected resource", async () => {
    const user = userEvent.setup();

    render(<EducationCompletionsPage />);

    const completionList = screen.getByRole("region", { name: "교육이수 목록" });
    expect(await within(completionList).findByText("화재 안전 교육")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("교재"), "resource-2");

    expect(within(completionList).queryByText("화재 안전 교육")).not.toBeInTheDocument();
    expect(within(completionList).queryByText("홍길동")).not.toBeInTheDocument();
    expect(within(completionList).getByText("순찰 안전 교육")).toBeInTheDocument();
    expect(within(completionList).getByText("이순신")).toBeInTheDocument();
  });

  it("filters education completions by resource id from the url", async () => {
    window.history.replaceState(null, "", "/manager/safty/completions?resourceId=resource-2");

    render(<EducationCompletionsPage />);

    const completionList = screen.getByRole("region", { name: "교육이수 목록" });
    expect(await within(completionList).findByText("순찰 안전 교육")).toBeInTheDocument();
    expect(screen.getByLabelText("교재")).toHaveValue("resource-2");
    expect(within(completionList).queryByText("화재 안전 교육")).not.toBeInTheDocument();
    expect(within(completionList).queryByText("홍길동")).not.toBeInTheDocument();
  });

  it("selects the resource name from the url even when it has no completion rows", async () => {
    window.history.replaceState(null, "", "/manager/safty/completions?resourceId=resource-3");

    render(<EducationCompletionsPage />);

    const completionList = screen.getByRole("region", { name: "교육이수 목록" });
    await screen.findByRole("option", { name: "감전 예방 교육" });

    expect(screen.getByLabelText("교재")).toHaveValue("resource-3");
    expect(within(completionList).getByText("조회 결과에 해당하는 교육이수 기록이 없습니다.")).toBeInTheDocument();
  });
});
