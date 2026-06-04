import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InspectionSiteNewPage from "./page";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

describe("inspection site new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    delete window.kakao;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            worksites: [{ id: "work-1", name: "본사" }],
          });
        }
        if (url.endsWith("/api/inspection/sites")) {
          expect(JSON.parse(String(init?.body))).toMatchObject({
            worksiteId: "work-1",
            name: "정문",
            address: "서울시 중구 세종대로 1",
            gpsInfo: { latitude: 37.5, longitude: 127 },
          });
          return Response.json({
            site: {
              id: "site-1",
              worksite_id: "work-1",
              worksite_name: "본사",
              name: "정문",
              address: "서울시 중구 세종대로 1",
              gps_info: { latitude: 37.5, longitude: 127 },
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("uses worksite choices, read-only address, map picker, save, and QR print activation", async () => {
    const user = userEvent.setup();
    render(<InspectionSiteNewPage />);

    expect(await screen.findByRole("option", { name: "본사" })).toBeInTheDocument();
    expect(screen.getByLabelText("현장주소")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "QR인쇄" })).toBeDisabled();

    await user.type(screen.getByLabelText("현장명"), "정문");
    act(() => {
      window.jusoCallBack?.("서울시 중구 세종대로 1", "서울시 중구 세종대로 1", "", "");
    });
    await user.type(screen.getByLabelText("GPS정보"), "37.5, 127");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("현장이 저장되었습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "QR인쇄" })).toBeEnabled();
  });
});
