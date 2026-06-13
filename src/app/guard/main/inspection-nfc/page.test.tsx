import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardInspectionNfcPage from "./page";

const qrPayload = {
  type: "ollbareun-site-inspection",
  version: 1,
  siteId: "site-1",
  worksiteId: "work-1",
  worksiteName: "본사",
  siteName: "정문",
  gpsInfo: { latitude: 37.5, longitude: 127 },
};

function setGuardSession() {
  window.sessionStorage.setItem(
    "ollbareun.guard.session",
    JSON.stringify({
      employee: { id: "emp-1", name: "홍길동" },
      worksite: { id: "work-1", name: "본사" },
    }),
  );
}

function stubInspectionLogFetch() {
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/api/inspection/logs")) {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        employeeId: "emp-1",
        employeeName: "홍길동",
        qrPayload,
      });
      return Response.json({ log: { id: "log-1" } });
    }
    return Response.json({}, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("guard inspection NFC page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    setGuardSession();
    window.history.pushState({}, "", "/guard/main/inspection-nfc");
    Reflect.deleteProperty(window, "NDEFReader");
  });

  it("saves inspection from the payload query parameter", async () => {
    const fetch = stubInspectionLogFetch();
    const encodedPayload = encodeURIComponent(JSON.stringify(qrPayload));
    window.history.pushState({}, "", `/guard/main/inspection-nfc?payload=${encodedPayload}`);

    render(<GuardInspectionNfcPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("NFC 태그 점검이 저장되었습니다.")).toBeInTheDocument();
  });

  it("saves inspection from a short site id query parameter", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/inspection/sites/site-1")) {
        return Response.json({
          site: {
            id: "site-1",
            worksite_id: "work-1",
            worksite_name: "蹂몄궗",
            name: "?뺣Ц",
            address: "釉뚮씪?곗?",
            gps_info: { latitude: 37.5, longitude: 127 },
          },
        });
      }

      if (url.endsWith("/api/inspection/logs")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          employeeId: "emp-1",
          employeeName: expect.any(String),
          qrPayload,
        });
        return Response.json({ log: { id: "log-1" } });
      }

      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    window.history.pushState({}, "", "/guard/main/inspection-nfc?s=site-1");

    render(<GuardInspectionNfcPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/inspection/sites/site-1");
    });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("removes the initial site query parameter and reloads after confirming a successful save", async () => {
    const reload = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/inspection/sites/site-1")) {
        return Response.json({
          site: {
            id: "site-1",
            worksite_id: "work-1",
            worksite_name: "Worksite",
            name: "Gate",
            address: "Address",
            gps_info: { latitude: 37.5, longitude: 127 },
          },
        });
      }

      if (url.endsWith("/api/inspection/logs")) {
        return Response.json({ log: { id: "log-1" } });
      }

      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    window.history.pushState({}, "", "/guard/main/inspection-nfc?s=site-1");

    render(<GuardInspectionNfcPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(window.location.pathname).toBe("/guard/main/inspection-nfc");
    expect(window.location.search).toBe("");
    act(() => {
      screen.getByRole("button", { name: "확인" }).click();
    });
    expect(reload).toHaveBeenCalledWith(0);
  });

  it("keeps the initial site query parameter when saving fails", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/inspection/sites/site-1")) {
        return Response.json({
          site: {
            id: "site-1",
            worksite_id: "work-1",
            worksite_name: "Worksite",
            name: "Gate",
            address: "Address",
            gps_info: { latitude: 37.5, longitude: 127 },
          },
        });
      }

      if (url.endsWith("/api/inspection/logs")) {
        return Response.json({ error: "save failed" }, { status: 400 });
      }

      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    window.history.pushState({}, "", "/guard/main/inspection-nfc?s=site-1");

    render(<GuardInspectionNfcPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(window.location.search).toBe("?s=site-1");
  });

  it("saves inspection when Web NFC reads a URL record", async () => {
    const fetch = stubInspectionLogFetch();
    let reader: { scan: ReturnType<typeof vi.fn>; onreading: ((event: unknown) => void) | null } | null = null;
    Object.defineProperty(window, "NDEFReader", {
      configurable: true,
      value: vi.fn(function NDEFReader(this: typeof reader) {
        reader = {
          scan: vi.fn(async () => undefined),
          onreading: null,
        };
        return reader;
      }),
    });
    const nfcUrl = `https://example.com/guard/main/inspection-nfc?payload=${encodeURIComponent(JSON.stringify(qrPayload))}`;

    render(<GuardInspectionNfcPage />);

    await waitFor(() => {
      expect(reader?.scan).toHaveBeenCalled();
    });
    act(() => {
      reader?.onreading?.({
        message: {
          records: [
            {
              recordType: "url",
              data: new TextEncoder().encode(nfcUrl).buffer,
            },
          ],
        },
      });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/inspection/logs",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("shows guidance when Web NFC is not supported", async () => {
    const fetch = stubInspectionLogFetch();

    render(<GuardInspectionNfcPage />);

    expect(await screen.findByText("이 브라우저에서는 NFC 태그 읽기를 사용할 수 없습니다.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not save invalid NFC payloads", async () => {
    const fetch = stubInspectionLogFetch();
    window.history.pushState({}, "", "/guard/main/inspection-nfc?payload=not-json");

    render(<GuardInspectionNfcPage />);

    expect(await screen.findByText("QR 코드 내용을 읽을 수 없습니다.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
