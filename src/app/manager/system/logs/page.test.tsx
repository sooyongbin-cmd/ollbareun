import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerSystemLogsPage from "./page";

describe("manager system logs page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders guard session logs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          logs: [
            {
              id: "log-1",
              employee_id: "emp-1",
              guard_name: "홍길동",
              login_status: "success",
              login_at: "2026-06-03T09:00:00.000Z",
              login_error: null,
              main_push_processed_at: "2026-06-03T09:00:03.000Z",
              main_push_status: "success",
              main_push_result: null,
              logout_at: "2026-06-03T18:00:00.000Z",
              logout_browser_push_status: "removed",
              logout_server_push_status: "removed",
              logout_session_status: "removed",
              logout_push_result: null,
            },
          ],
        }),
      ),
    );

    render(<ManagerSystemLogsPage />);

    expect(await screen.findByRole("heading", { name: "로그현황" })).toBeInTheDocument();
    expect(screen.getByText(/최신 100건만 유지합니다/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "경비원" })).toBeInTheDocument();
    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText(/2026\. 6\. 3\./)).toBeInTheDocument();
    expect(screen.getAllByText(/오/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("img", { name: "성공" })).toHaveLength(2);
    expect(screen.getByText("브라우저 removed / 서버 removed / 세션 removed")).toBeInTheDocument();
  });

  it("renders xmark icons for failed login and failed push statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          logs: [
            {
              id: "log-2",
              employee_id: null,
              guard_name: "실패사용자",
              login_status: "failed",
              login_at: "2026-06-03T09:00:00.000Z",
              login_error: "등록된 직원 정보와 일치하지 않습니다.",
              main_push_processed_at: "2026-06-03T09:00:03.000Z",
              main_push_status: "error",
              main_push_result: null,
              logout_at: null,
              logout_browser_push_status: null,
              logout_server_push_status: null,
              logout_session_status: null,
              logout_push_result: null,
            },
          ],
        }),
      ),
    );

    render(<ManagerSystemLogsPage />);

    expect(await screen.findByText("실패사용자")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "실패" })).toHaveLength(2);
  });

  it("reloads logs when filters change", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ logs: [] }))
      .mockResolvedValue(Response.json({ logs: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerSystemLogsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/guard/session-logs");
    });

    await user.type(screen.getByLabelText("경비원 이름"), "홍");
    await user.selectOptions(screen.getByLabelText("로그인 상태"), "failed");
    await user.selectOptions(screen.getByLabelText("Push 상태"), "warning");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("/api/guard/session-logs?guardName=%ED%99%8D&loginStatus=failed&pushStatus=warning"),
      );
    });
  });
});
