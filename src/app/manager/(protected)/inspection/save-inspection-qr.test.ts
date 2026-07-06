import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveInspectionQrImage } from "./save-inspection-qr";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

describe("saveInspectionQrImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          this.onload?.();
        }
      },
    );
    vi.stubGlobal(
      "URL",
      {
        createObjectURL: vi.fn(() => "blob:qr"),
        revokeObjectURL: vi.fn(),
      },
    );
  });

  it("prints worksite and site labels above the QR code", async () => {
    const fillText = vi.fn();
    const drawImage = vi.fn();
    const context = {
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      fillRect: vi.fn(),
      fillText,
      drawImage,
    };
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => undefined);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => context),
          toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(["qr"]))),
        } as unknown as HTMLCanvasElement;
      }

      if (tagName === "a") {
        return anchor;
      }

      return originalCreateElement(tagName);
    });

    await saveInspectionQrImage({
      payload: {
        type: "ollbareun-site-inspection",
        version: 1,
        siteId: "site-1",
        worksiteId: "work-1",
        worksiteName: "본사",
        siteName: "정문",
        gpsInfo: { latitude: 37.5, longitude: 127 },
      },
      worksiteName: "본사",
      siteName: "정문",
      fileName: "qr",
    });

    expect(fillText).toHaveBeenCalledWith("근무지 : 본사", 210, 32);
    expect(fillText).toHaveBeenCalledWith("현장명 : 정문", 210, 70);
    expect(drawImage).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
