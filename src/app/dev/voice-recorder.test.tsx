import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VoiceRecorder from "./voice-recorder";

class MockSpeechRecognition {
  static instance: MockSpeechRecognition;

  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instance = this;
  }
}

describe("VoiceRecorder", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition");
  });

  it("starts Korean speech recognition and shows converted text", () => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    render(<VoiceRecorder />);
    fireEvent.click(screen.getByRole("button", { name: "녹음" }));

    expect(MockSpeechRecognition.instance.lang).toBe("ko-KR");
    expect(MockSpeechRecognition.instance.continuous).toBe(true);
    expect(screen.getByRole("button", { name: "녹음 중지" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    act(() => {
      MockSpeechRecognition.instance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "개발자 음성 테스트" } }],
      });
    });

    expect(screen.getByLabelText("변환된 텍스트")).toHaveTextContent(
      "개발자 음성 테스트",
    );
  });

  it("disables recording when speech recognition is unavailable", async () => {
    render(<VoiceRecorder />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "녹음" })).toBeDisabled();
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "이 브라우저는 음성 인식을 지원하지 않습니다.",
    );
  });
});
