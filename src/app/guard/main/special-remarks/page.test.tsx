import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GuardSpecialRemarksPage from "./page";

const realCreateElement = document.createElement.bind(document);
const push = vi.fn();
let currentDataUrls = ["data:image/jpeg;base64,AAAA"];
let dataUrlIndex = 0;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    currentDataUrls = ["data:image/jpeg;base64,AAAA"];
    dataUrlIndex = 0;
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
          toDataURL: () => currentDataUrls[Math.min(dataUrlIndex++, currentDataUrls.length - 1)],
        });
      }
      return element;
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps the capture button before the attachment list and supports multiple photos", async () => {
    currentDataUrls = [
      "data:image/jpeg;base64,AAAA",
      "data:image/jpeg;base64,BBBB",
    ];
    const user = userEvent.setup();
    render(<GuardSpecialRemarksPage />);

    const captureButton = screen.getByRole("button", { name: "촬영" });
    await user.click(captureButton);
    await user.click(captureButton);

    const photos = screen.getAllByRole("img", { name: /촬영된 첨부사진/ });
    expect(photos).toHaveLength(2);
    expect(captureButton.compareDocumentPosition(photos[0]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("sends all selected photos in one report", async () => {
    currentDataUrls = [
      "data:image/jpeg;base64,AAAA",
      "data:image/jpeg;base64,BBBB",
    ];
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init;
      if (String(input) === "/api/guard/configs/special_001") {
        return Response.json({ enabled: false });
      }
      return Response.json({
        report: { id: "report-1" },
        delivery: { successCount: 1, failedCount: 0, unregisteredCount: 0 },
        email: { status: "sent" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GuardSpecialRemarksPage />);

    const captureButton = screen.getByRole("button", { name: "촬영" });
    await user.click(captureButton);
    await user.click(captureButton);
    await user.click(screen.getByRole("button", { name: "사진 1 선택" }));
    await user.click(screen.getByRole("button", { name: "사진 2 선택" }));
    await user.type(screen.getByLabelText("특이사항 내용"), "문이 파손되었습니다.");
    await user.click(screen.getByRole("button", { name: "보고하기" }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/guard/special-remarks/report/push")).toBe(true);
    });
    const reportCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/guard/special-remarks/report/push");
    const reportInit = reportCall?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(reportInit?.body));
    expect(body.photoDataUrls).toEqual(currentDataUrls);
    expect(body.photoDataUrl).toBe(currentDataUrls[0]);
  });

  it("uses continuous speech recognition when special_001 is enabled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json({ enabled: true }));
    vi.stubGlobal("fetch", fetchMock);
    const start = vi.fn(function start(this: { onresult?: (event: unknown) => void }) {
      this.onresult?.({ results: [[{ transcript: "음성 내용" }]] });
    });
    const recognitions: Array<Record<string, unknown>> = [];
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(this: Record<string, unknown>) {
        this.start = start;
        this.stop = vi.fn();
        recognitions.push(this);
      }),
    });
    render(<GuardSpecialRemarksPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/guard/configs/special_001",
      expect.objectContaining({ cache: "no-store" }),
    ));
    await user.click(screen.getByRole("button", { name: "음성 입력" }));

    expect(start).toHaveBeenCalled();
    expect(recognitions[0]?.continuous).toBe(true);
  });

  it("converts speech after five seconds of silence and flushes sooner when stopped", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: false })));
    const start = vi.fn();
    const stop = vi.fn();
    const recognitions: Array<Record<string, unknown> & {
      onresult?: (event: unknown) => void;
    }> = [];
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(
        this: Record<string, unknown> & { onresult?: (event: unknown) => void },
      ) {
        this.start = start;
        this.stop = stop;
        recognitions.push(this);
      }),
    });
    render(<GuardSpecialRemarksPage />);

    const speechButton = screen.getByRole("button", { name: "음성 입력" });
    await user.click(speechButton);
    vi.useFakeTimers();
    recognitions[0]?.onresult?.({ results: [[{ transcript: "첫 번째 문장" }]] });

    expect(screen.getByLabelText("특이사항 내용")).toHaveValue("");
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByLabelText("특이사항 내용")).toHaveValue("");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByLabelText("특이사항 내용")).toHaveValue("첫 번째 문장");

    recognitions[0]?.onresult?.({ results: [[{ transcript: "두 번째 문장" }]] });
    fireEvent.click(speechButton);

    expect(stop).toHaveBeenCalled();
    expect(screen.getByLabelText("특이사항 내용")).toHaveValue("첫 번째 문장\n두 번째 문장");
  });

  it("restarts continuous recognition after an unexpected end until stopped", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json({ enabled: true }));
    vi.stubGlobal("fetch", fetchMock);
    const start = vi.fn();
    const stop = vi.fn();
    const recognitions: Array<Record<string, unknown> & { onend?: () => void }> = [];
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(
        this: Record<string, unknown> & { onend?: () => void },
      ) {
        this.start = start;
        this.stop = stop;
        recognitions.push(this);
      }),
    });
    render(<GuardSpecialRemarksPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const speechButton = screen.getByRole("button", { name: "음성 입력" });
    await user.click(speechButton);
    expect(recognitions[0]?.continuous).toBe(true);

    recognitions[0]?.onend?.();
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(speechButton).toHaveAttribute("aria-pressed", "true");

    await user.click(speechButton);
    expect(stop).toHaveBeenCalled();
    expect(speechButton).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps one-shot speech recognition when special_001 is not enabled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => Response.json({ enabled: false }));
    vi.stubGlobal("fetch", fetchMock);
    const start = vi.fn();
    const recognitions: Array<Record<string, unknown>> = [];
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(this: Record<string, unknown>) {
        this.start = start;
        this.stop = vi.fn();
        recognitions.push(this);
      }),
    });
    render(<GuardSpecialRemarksPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "음성 입력" }));

    expect(start).toHaveBeenCalled();
    expect(recognitions[0]?.continuous).toBe(false);
  });

  it("keeps the microphone icon and Figma active styling while listening", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: false })));
    const start = vi.fn();
    Object.assign(window, {
      webkitSpeechRecognition: vi.fn(function SpeechRecognition(this: Record<string, unknown>) {
        this.start = start;
        this.stop = vi.fn();
      }),
    });
    render(<GuardSpecialRemarksPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const speechButton = screen.getByRole("button", { name: "음성 입력" });
    await user.click(speechButton);

    expect(speechButton).toHaveAttribute("aria-pressed", "true");
    expect(speechButton).toHaveClass("is-listening");
    expect(speechButton).toHaveTextContent("음성 입력");
    expect(speechButton.querySelector("svg.lucide-mic")).toBeInTheDocument();
    expect(speechButton.querySelector("svg.lucide-square")).not.toBeInTheDocument();
  });

  it("compresses captured photos until they are under 500KB", async () => {
    const largeDataUrl = `data:image/jpeg;base64,${"A".repeat(700 * 1024)}`;
    currentDataUrls = [largeDataUrl, "data:image/jpeg;base64,BBBB"];
    const user = userEvent.setup();
    render(<GuardSpecialRemarksPage />);

    await user.click(screen.getByRole("button", { name: "촬영" }));

    expect(screen.getByAltText("촬영된 첨부사진 1")).toHaveAttribute("src", "data:image/jpeg;base64,BBBB");
  });
});
