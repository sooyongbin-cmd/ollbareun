import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InspectionSiteDetailPage from "./page";

const push = vi.fn();
const refresh = vi.fn();
const writeText = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

const site = {
  id: "site-1",
  worksite_id: "work-1",
  worksite_name: "Worksite",
  name: "Gate",
  address: "Seoul",
  gps_info: { latitude: 37.5, longitude: 127 },
};

describe("inspection site detail page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    document.head.innerHTML = "";
    delete window.kakao;
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(_value: string) {
          this.onload?.();
        }
      },
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:qr"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({ worksites: [{ id: "work-1", name: "Worksite" }] });
        }
        if (url.endsWith("/api/inspection/sites/site-1") && init?.method === "PATCH") {
          expect(JSON.parse(String(init.body))).toMatchObject({
            worksiteId: "work-1",
            name: "Gate",
            address: "Seoul",
            gpsInfo: { latitude: 37.5, longitude: 127 },
          });
          return Response.json({ site });
        }
        if (url.endsWith("/api/inspection/sites/site-1") && init?.method === "DELETE") {
          return Response.json({ success: true });
        }
        if (url.endsWith("/api/inspection/sites/site-1")) {
          return Response.json({ site });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads without showing the GPS input and returns to the list after save confirmation", async () => {
    const user = userEvent.setup();
    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);

    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seoul")).toHaveAttribute("readonly");
    expect(screen.queryByLabelText("GPS정보")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("현장이 저장되었습니다.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "확인" }));

    expect(push).toHaveBeenCalledWith("/manager/inspection/sites");
    expect(refresh).toHaveBeenCalled();
  });

  it("prints QR and copies the protocol-free short NFC URL", async () => {
    const user = userEvent.setup();
    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);

    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "NFC(URL)" }));
    const nfcUrl = "localhost:3000/guard/main/inspection-nfc?s=site-1";
    expect(await screen.findByDisplayValue(nfcUrl)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "복사" }));
    expect(await screen.findByText("복사되었습니다.")).toBeInTheDocument();

    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => undefined);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            fillStyle: "",
            font: "",
            textAlign: "",
            textBaseline: "",
            fillRect: vi.fn(),
            fillText: vi.fn(),
            drawImage: vi.fn(),
          })),
          toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(["qr"]))),
        } as unknown as HTMLCanvasElement;
      }
      if (tagName === "a") {
        return anchor;
      }
      return originalCreateElement(tagName);
    });
    await user.click(screen.getByRole("button", { name: "QR코드" }));
    expect(click).toHaveBeenCalled();
  });

  it("shows error when attempting NFC write on unsupported browser", async () => {
    const user = userEvent.setup();
    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);

    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "NFC(URL)" }));
    
    const writeBtn = screen.getByRole("button", { name: "NFC 쓰기" });
    expect(writeBtn).toBeInTheDocument();

    await user.click(writeBtn);
    expect(await screen.findByText(/지원하지 않습니다/)).toBeInTheDocument();
  });

  it("successfully writes NFC and closes popup when NDEFReader is supported", async () => {
    const user = userEvent.setup();
    let resolveWrite: () => void = () => {};
    const mockWrite = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveWrite = resolve;
    }));
    vi.stubGlobal("NDEFReader", class {
      write = mockWrite;
    });

    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);
    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "NFC(URL)" }));
    await user.click(screen.getByRole("button", { name: "NFC 쓰기" }));

    expect(screen.getByText("NFC 카드 쓰기")).toBeInTheDocument();
    expect(screen.getByText("인식 대기 중...")).toBeInTheDocument();

    expect(mockWrite).toHaveBeenCalled();
    const writtenUrl = mockWrite.mock.calls[0][0];
    expect(writtenUrl).toContain("localhost:3000/guard/main/inspection-nfc?s=site-1");

    // Resolve the promise to transition to success state
    resolveWrite();

    expect(await screen.findByText("NFC 쓰기 완료!")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("shows error when NFC write fails", async () => {
    const user = userEvent.setup();
    const mockWrite = vi.fn().mockRejectedValue(new Error("Tag connection lost"));
    vi.stubGlobal("NDEFReader", class {
      write = mockWrite;
    });

    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);
    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "NFC(URL)" }));
    await user.click(screen.getByRole("button", { name: "NFC 쓰기" }));

    expect(await screen.findByText("NFC 쓰기 실패")).toBeInTheDocument();
    expect(screen.getByText("Tag connection lost")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByText("NFC 카드 쓰기")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("shows a success message before returning to the list after deleting a site", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<InspectionSiteDetailPage params={Promise.resolve({ id: "site-1" })} />);

    expect(await screen.findByDisplayValue("Gate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByText("현장이 삭제되었습니다.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "확인" }));

    expect(push).toHaveBeenCalledWith("/manager/inspection/sites");
    expect(refresh).toHaveBeenCalled();
  });
});
