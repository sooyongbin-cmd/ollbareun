import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerInstallPrompt from "./manager-install-prompt";

describe("ManagerInstallPrompt", () => {
  it("shows the Android Chrome install prompt and runs the browser install flow", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    installEvent.preventDefault = vi.fn();

    render(<ManagerInstallPrompt />);
    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.getByRole("dialog", { name: "올바름 관리자 설치" })).toBeInTheDocument();
    expect(screen.getByText("휴대폰 홈 화면에 관리자 아이콘을 추가합니다.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "설치" }));

    expect(installEvent.preventDefault).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "올바름 관리자 설치" })).not.toBeInTheDocument();
    });
  });
});
