import { act, render, screen } from "@testing-library/react";
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
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/worksites")) {
          const body = JSON.parse(String(init?.body));
          expect(body).toMatchObject({
            name: "인천 현장",
            address: "인천광역시 동구 송림로 1",
            gpsInfo: {
              latitude: 37.1,
              longitude: 126.7,
            },
            radiusMeters: "100",
          });
          return Response.json({
            worksite: {
              id: "work-3",
              name: "인천 현장",
              address: "인천광역시 동구 송림로 1",
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

    expect(screen.getByLabelText("근무지주소").parentElement).toHaveClass(
      "md:grid-cols-[minmax(0,1fr)_132px]",
    );
    expect(screen.getByRole("button", { name: "주소 검색" })).toHaveClass("md:w-full", "whitespace-nowrap");

    await user.type(screen.getByLabelText("근무지명"), "인천 현장");
    await user.type(screen.getByLabelText("근무지주소"), "인천광역시 동구 송림로 1");
    expect(screen.getByText("주소 기준 GPS")).toBeInTheDocument();
    expect(screen.getByTestId("worksite-map")).toBeInTheDocument();
    await user.type(screen.getByLabelText("GPS정보"), "37.1, 126.7");
    await user.type(screen.getByLabelText("허용반경(m)"), "100");
    await user.click(screen.getByRole("button", { name: "근무지 등록" }));

    expect(alert).toHaveBeenCalledWith("자료를 저장하였습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/worksites");
  });

  it("opens the juso popup and fills the selected address", async () => {
    const user = userEvent.setup();
    const popup = { focus: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);

    render(<WorksiteNewPage />);

    await user.click(screen.getByRole("button", { name: "주소 검색" }));

    expect(open).toHaveBeenCalledWith(
      "/api/juso/popup",
      "jusoPopup",
      "width=570,height=620,scrollbars=yes,resizable=yes",
    );
    expect(popup.focus).toHaveBeenCalled();

    act(() => {
      window.jusoCallBack?.("서울특별시 중구 세종대로 110", "서울특별시 중구 세종대로 110", "", "");
    });

    expect(screen.getByLabelText("근무지주소")).toHaveValue("서울특별시 중구 세종대로 110");
  });
});
