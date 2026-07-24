import { render, screen } from "@testing-library/react";
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
              youtube_link: "https://www.youtube.com/watch?v=fireSafety",
            },
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/education/resources/resource-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            title: "순찰 안전 교육",
            youtubeLink: "https://youtu.be/patrolSafety",
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

    expect(await screen.findByRole("heading", { name: "교육자료수정" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("화재 안전 교육")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://www.youtube.com/watch?v=fireSafety")).toBeInTheDocument();

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
