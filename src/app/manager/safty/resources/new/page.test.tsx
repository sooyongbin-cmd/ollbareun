import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationResourceNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("education resource new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
  });

  it("saves a YouTube education resource and returns to resource management", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);

      const formData = init?.body as FormData;
      expect(formData.get("title")).toBe("화재 안전 교육");
      expect(formData.get("youtubeLink")).toBe("https://www.youtube.com/watch?v=fireSafety");

      return Response.json({
        resource: {
          id: "resource-1",
          title: "화재 안전 교육",
          youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        },
      });
    });
    vi.stubGlobal("fetch", fetch);

    render(<EducationResourceNewPage />);

    await user.type(screen.getByLabelText("제목"), "화재 안전 교육");
    await user.type(screen.getByLabelText("유튜브 링크"), "https://www.youtube.com/watch?v=fireSafety");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/education/resources", expect.any(Object));
      expect(push).toHaveBeenCalledWith("/manager/safty/resources");
    });
  });

  it("shows a saving state while the upload request is pending", async () => {
    const user = userEvent.setup();
    let resolveFetch: (response: Response) => void = () => undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetch = vi.fn(() => fetchPromise);
    vi.stubGlobal("fetch", fetch);

    render(<EducationResourceNewPage />);

    await user.type(screen.getByLabelText("제목"), "화재 안전 교육");
    await user.type(screen.getByLabelText("유튜브 링크"), "https://www.youtube.com/watch?v=fireSafety");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(screen.getByText("유튜브 링크를 저장 중입니다.")).toBeInTheDocument();

    resolveFetch(
      Response.json({
        resource: {
          id: "resource-1",
          title: "화재 안전 교육",
          youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        },
      }),
    );

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/manager/safty/resources");
    });
  });
});
