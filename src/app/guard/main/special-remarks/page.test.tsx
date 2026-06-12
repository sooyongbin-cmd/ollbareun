import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardSpecialRemarksPage from "./page";

const realCreateElement = document.createElement.bind(document);

const guardSession = {
  employee: {
    id: "employee-1",
    name: "홍길동",
  },
  worksite: {
    id: "work-1",
    name: "본사",
  },
};

describe("guard special remarks page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
      configurable: true,
      value: 480,
    });
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = realCreateElement(tagName);
      if (tagName === "canvas") {
        Object.assign(element, {
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => "data:image/jpeg;base64,AAAA",
        });
      }
      return element;
    });
  });

  it("captures a photo and shows the disabled Resend report button", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async () => Response.json({ report: { id: "report-1" } }));
    vi.stubGlobal("fetch", fetch);
    render(<GuardSpecialRemarksPage />);

    await user.type(screen.getByLabelText("특이사항 내용"), "문이 파손되었습니다.");
    await user.click(screen.getByRole("button", { name: "촬영" }));
    expect(await screen.findByAltText("촬영된 첨부사진")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "이메일보고(resend)" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits the special remark report through Formspree", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async () => Response.json({ report: { id: "report-1" } }));
    vi.stubGlobal("fetch", fetch);
    render(<GuardSpecialRemarksPage />);

    await user.type(screen.getByLabelText("특이사항 내용"), "문이 파손되었습니다.");
    await user.click(screen.getByRole("button", { name: "촬영" }));

    await user.click(screen.getByRole("button", { name: "이메일(Formspree)" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/guard/special-remarks/report/formspree",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("문이 파손되었습니다."),
        }),
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/guard/special-remarks/report/formspree",
      expect.objectContaining({
        body: expect.stringContaining("data:image/jpeg;base64,AAAA"),
      }),
    );
  });

  it("compresses captured photos until they are under 500KB", async () => {
    const user = userEvent.setup();
    const largeDataUrl = `data:image/jpeg;base64,${"A".repeat(700 * 1024)}`;
    const smallDataUrl = "data:image/jpeg;base64,BBBB";
    const toDataURL = vi
      .fn()
      .mockReturnValueOnce(largeDataUrl)
      .mockReturnValueOnce(smallDataUrl);

    vi.mocked(document.createElement).mockImplementation((tagName: string) => {
      const element = realCreateElement(tagName);
      if (tagName === "canvas") {
        Object.assign(element, {
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL,
        });
      }
      return element;
    });

    render(<GuardSpecialRemarksPage />);

    await user.click(screen.getByRole("button", { name: "촬영" }));

    expect(toDataURL).toHaveBeenNthCalledWith(1, "image/jpeg", 0.82);
    expect(toDataURL).toHaveBeenNthCalledWith(2, "image/jpeg", 0.78);
    expect(await screen.findByAltText("촬영된 첨부사진")).toHaveAttribute("src", smallDataUrl);
  });

  it("adds recognized speech to the text area", async () => {
    const user = userEvent.setup();
    const start = vi.fn(function start(this: { onresult?: (event: unknown) => void; onend?: () => void }) {
      this.onresult?.({ results: [[{ transcript: "음성 내용" }]] });
      this.onend?.();
    });
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(this: Record<string, unknown>) {
        this.start = start;
        this.stop = vi.fn();
      }),
    });

    render(<GuardSpecialRemarksPage />);

    await user.click(screen.getByRole("button", { name: "음성 입력" }));

    expect(start).toHaveBeenCalled();
    expect(await screen.findByDisplayValue("음성 내용")).toBeInTheDocument();
  });
});
