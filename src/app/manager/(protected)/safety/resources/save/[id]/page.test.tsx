import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationResourceSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("education resource save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    useParams.mockReturnValue({ id: "resource-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/education/resources/resource-1")) {
          return Response.json({
            resource: {
              id: "resource-1",
              title: "화재 안전 교육",
              youtube_link: "https://www.youtube.com/watch?v=fireSafety", education_type: "daily", startdate: "2026-10-07", enddate: "2026-10-31",
            },
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/education/resources/resource-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            title: "순찰 안전 교육",
            youtubeLink: "https://youtu.be/patrolSafety", educationType: "other", startdate: "2026-10-08", enddate: "2026-11-01",
          });
          return Response.json({
            resource: {
              id: "resource-1",
              title: "순찰 안전 교육",
              youtube_link: "https://youtu.be/patrolSafety",
            },
          });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads and saves an education resource", async () => {
    const user = userEvent.setup();

    render(<EducationResourceSavePage />);

    expect(await screen.findByRole("heading", { name: "교육자료 상세" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("화재 안전 교육")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://www.youtube.com/watch?v=fireSafety")).toBeInTheDocument();
    for (const type of ["일일", "월간", "분기", "반기", "기타"]) {
      expect(screen.getByRole("radio", { name: type })).toBeEnabled();
    }
    expect(screen.getByRole("radio", { name: "일일" })).toBeChecked();
    expect(screen.queryByText("관리자 화면")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "기타" }));
    expect(screen.getByLabelText("시작일")).toHaveValue("2026-10-07");
    expect(screen.getByLabelText("종료일")).toHaveValue("2026-10-31");
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-08" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-11-01" } });

    await user.clear(screen.getByLabelText("제목"));
    await user.type(screen.getByLabelText("제목"), "순찰 안전 교육");
    await user.clear(screen.getByLabelText("유튜브 링크"));
    await user.type(screen.getByLabelText("유튜브 링크"), "https://youtu.be/patrolSafety");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("수정이 완료되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/safety/resources");
  });
});
