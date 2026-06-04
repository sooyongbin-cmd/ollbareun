import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardInspectionPage from "./page";

const qrPayload = {
  type: "ollbareun-site-inspection",
  version: 1,
  siteId: "site-1",
  worksiteId: "work-1",
  worksiteName: "본사",
  siteName: "정문",
  gpsInfo: { latitude: 37.5, longitude: 127 },
};

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: vi.fn().mockImplementation(function BrowserQRCodeReader() {
    return {
      decodeFromVideoDevice: vi.fn(async (_deviceId, _video, callback) => {
        callback({ getText: () => JSON.stringify(qrPayload) });
        return { stop: vi.fn() };
      }),
    };
  }),
}));

describe("guard inspection page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "emp-1", name: "홍길동" },
        worksite: { id: "work-1", name: "본사" },
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/api/inspection/logs")) {
          expect(JSON.parse(String(init?.body))).toMatchObject({
            employeeId: "emp-1",
            employeeName: "홍길동",
            qrPayload,
          });
          return Response.json({ log: { id: "log-1" } });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("scans QR and saves inspection with the logged-in guard", async () => {
    const user = userEvent.setup();
    render(<GuardInspectionPage />);

    expect(await screen.findByText("정문")).toBeInTheDocument();
    const captureButton = screen.getByRole("button", { name: "촬영" });
    expect(captureButton).toBeEnabled();

    await user.click(captureButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("현장점검이 저장되었습니다.")).toBeInTheDocument();
  });
});
