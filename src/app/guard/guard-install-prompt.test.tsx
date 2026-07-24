import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuardInstallPrompt from "./guard-install-prompt";

describe("GuardInstallPrompt", () => {
  it("shows the Android Chrome install prompt and runs the browser install flow", () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    installEvent.preventDefault = vi.fn();

    render(<GuardInstallPrompt />);
    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.getByRole("dialog", { name: "올바름 현장 근로자 설치" })).toBeInTheDocument();
    expect(screen.getByText("휴대폰 홈 화면에 아이콘을 추가합니다.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "설치" }));

    expect(installEvent.preventDefault).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();
  });
});
