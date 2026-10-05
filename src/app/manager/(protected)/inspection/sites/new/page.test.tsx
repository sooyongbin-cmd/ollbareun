import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InspectionSiteNewPage from "./page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("inspection site new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
    document.head.innerHTML = "";
    delete window.kakao;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            worksites: [{ id: "work-1", name: "Worksite" }],
          });
        }
        if (url.endsWith("/api/inspection/sites")) {
          expect(JSON.parse(String(init?.body))).toEqual({
            worksiteId: "work-1",
            name: "Gate",
          });
          return Response.json({
            site: {
              id: "site-1",
              worksite_id: "work-1",
              worksite_name: "Worksite",
              name: "Gate",
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves a new inspection site without QR print and returns to the list after confirmation", async () => {
    const user = userEvent.setup();
    render(<InspectionSiteNewPage />);

    expect(await screen.findByRole("option", { name: "Worksite" })).toBeInTheDocument();
    expect(screen.queryByLabelText("점검순서")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("현장주소")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("GPS정보")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "QR인쇄" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("점검지명"), "Gate");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("점검지가 저장되었습니다.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "확인" }));

    expect(push).toHaveBeenCalledWith("/manager/inspection/sites");
    expect(refresh).toHaveBeenCalled();
  });
});
