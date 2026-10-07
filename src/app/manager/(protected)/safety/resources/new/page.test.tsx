import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("requires both dates before sending a save request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EducationResourceNewPage />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "교육" } });
    fireEvent.change(screen.getByLabelText("유튜브 링크"), { target: { value: "https://youtu.be/example" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("시작일을 입력하세요.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-07" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("종료일을 입력하세요.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a YouTube education resource and returns to resource management", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);

      const formData = init?.body as FormData;
      expect(formData.get("educationType")).toBe("other");
      expect(formData.get("startdate")).toBe("2026-10-07");
      expect(formData.get("enddate")).toBe("2026-10-31");
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

    expect(screen.getByRole("radio", { name: "일일" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "기타" }));
    await user.type(screen.getByLabelText("제목"), "화재 안전 교육");
    await user.type(screen.getByLabelText("유튜브 링크"), "https://www.youtube.com/watch?v=fireSafety");
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-07" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-10-31" } });
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/education/resources", expect.any(Object));
      expect(push).toHaveBeenCalledWith("/manager/safety/resources");
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
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-07" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-10-31" } });
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByRole("button", { hidden: true, name: "저장" })).toBeDisabled();
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
      expect(push).toHaveBeenCalledWith("/manager/safety/resources");
    });
  });
});
