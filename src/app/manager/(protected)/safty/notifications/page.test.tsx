import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerSafetyNotificationsPage from "./page";

describe("manager safety notifications page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders automatic notification runs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          runs: [
            {
              id: "run-1",
              notification_code: "education_reminder",
              scheduled_date: "2026-06-15",
              scheduled_time: "09:10",
              status: "sent",
              sent_at: "2026-06-15T00:10:05.000Z",
              error_message: null,
              result: {
                successCount: 3,
                failedCount: 1,
                unregisteredCount: 2,
              },
              created_at: "2026-06-15T00:10:00.000Z",
              updated_at: "2026-06-15T00:10:05.000Z",
            },
          ],
        }),
      ),
    );

    render(<ManagerSafetyNotificationsPage />);

    expect(await screen.findByRole("heading", { name: "자동알림" })).toBeInTheDocument();
    expect(screen.getAllByText(/최근 100건/).length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "예약일" })).toBeInTheDocument();
    expect(screen.getByText("education_reminder")).toBeInTheDocument();
    expect(screen.getByText("09:10")).toBeInTheDocument();
    expect(screen.getByText("성공 3 / 실패 1 / 미등록 2")).toBeInTheDocument();
  });

  it("reloads when the status filter changes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ runs: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerSafetyNotificationsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/runs");
    });

    await user.selectOptions(screen.getByLabelText("상태"), "failed");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/notifications/runs?status=failed");
    });
  });

  it("reloads when the notification code filter changes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ runs: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerSafetyNotificationsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/notifications/runs");
    });

    await user.selectOptions(screen.getByLabelText("알림코드"), "education_reminder");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/notifications/runs?notificationCode=education_reminder");
    });
  });

  it("shows an empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ runs: [] })));

    render(<ManagerSafetyNotificationsPage />);

    expect(await screen.findByText("조회 결과에 해당하는 자동알림 로그가 없습니다.")).toBeInTheDocument();
  });
});
