import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorksiteNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("worksite new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/worksites")) {
          return Response.json({
            worksite: {
              id: "work-3",
              name: "인천 현장",
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows an alert after saving and returns to worksite management", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<WorksiteNewPage />);

    await user.type(screen.getByLabelText("근무지명"), "인천 현장");
    await user.type(screen.getByLabelText("위도"), "37.1");
    await user.type(screen.getByLabelText("경도"), "126.7");
    await user.type(screen.getByLabelText("허용반경(m)"), "100");
    await user.click(screen.getByRole("button", { name: "근무지 등록" }));

    expect(alert).toHaveBeenCalledWith("자료를 저장하였습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/worksites");
  });
});
