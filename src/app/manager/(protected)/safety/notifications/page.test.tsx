import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerSafetyNotificationsPage from "./page";

describe("manager safety notifications page", () => {
  it("guides managers to monthly education attendance", () => {
    render(<ManagerSafetyNotificationsPage />);

    expect(screen.getByRole("heading", { name: "교육알림" })).toBeInTheDocument();
    expect(screen.getByText("발송 이력은 저장하지 않습니다. 교육알림 실행은 월별교육이수 화면에서 할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "월별교육이수로 이동" })).toHaveAttribute("href", "/manager/safety/monthly_edu");
  });
});
