import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ManagerNotificationClick from "./manager-notification-click";

vi.mock("@/components/modals/alert-modal", () => ({
  default: ({ isOpen, title, description, onClose }: { isOpen: boolean; title: string; description?: string; onClose: () => void }) => isOpen ? <div role="dialog"><h2>{title}</h2><p>{description}</p><button onClick={onClose}>확인</button></div> : null,
}));

describe("manager notification clicks", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("shows clicked worker notifications in order without navigating the manager", () => {
    const worker = new EventTarget();
    vi.stubGlobal("navigator", { serviceWorker: worker });
    const acknowledge = vi.fn();
    const { unmount } = render(<ManagerNotificationClick />);
    const send = (type: string, body: string) => act(() => {
      worker.dispatchEvent(new MessageEvent("message", { data: { type, title: "교육 알림", body, url: "/guard/main/safety" }, ports: [{ postMessage: acknowledge } as unknown as MessagePort] }));
    });
    send("PUSH_NOTIFICATION_RECEIVED", "ignore");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    send("PUSH_NOTIFICATION_CLICKED", "첫 번째 근무자 알림");
    send("PUSH_NOTIFICATION_CLICKED", "두 번째 근무자 알림");
    expect(screen.getByText("첫 번째 근무자 알림")).toBeInTheDocument();
    expect(acknowledge).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(screen.getByText("두 번째 근무자 알림")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    send("PUSH_NOTIFICATION_CLICKED", "after unmount");
    expect(acknowledge).toHaveBeenCalledTimes(2);
  });
});
