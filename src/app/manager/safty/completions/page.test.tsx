import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationCompletionsPage from "./page";

describe("education completions page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/manager/safty/completions");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/education/completions")) {
          return Response.json({
            completions: [
              {
                employee_id: "employee-1",
                employee_name: "홍길동",
                resource_id: "resource-1",
                resource_title: "화재 안전 교육",
                resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                is_completed: true,
                completed_at: "2026-05-27T09:10:00.000Z",
              },
              {
                employee_id: "employee-2",
                employee_name: "이순신",
                resource_id: "resource-2",
                resource_title: "순찰 안전 교육",
                resource_youtube_link: "https://youtu.be/patrolSafety",
                is_completed: false,
                completed_at: null,
              },
            ],
          });
        }
        if (url.endsWith("/api/education/resources")) {
          return Response.json({
            resources: [
              {
                id: "resource-1",
                title: "화재 안전 교육",
                youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-2",
                title: "순찰 안전 교육",
                youtube_link: "https://youtu.be/patrolSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-3",
                title: "감전 예방 교육",
                youtube_link: "https://www.youtube.com/watch?v=electricSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
            ],
          });
        }
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "employee-1", name: "홍길동", phone: "", phone_normalized: "", is_retired: false },
              { id: "employee-2", name: "이순신", phone: "", phone_normalized: "", is_retired: false },
              { id: "employee-3", name: "퇴직자", phone: "", phone_normalized: "", is_retired: true },
            ],
            worksites: [],
            assignments: [],
            summary: { totalEmployees: 3, currentlyClockedIn: 0 },
          });
        }
        if (url.endsWith("/api/notifications/subscriptions")) {
          return Response.json({ employeeIds: ["employee-1"] });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the employee education completions summary list", async () => {
    render(<EducationCompletionsPage />);

    expect(await screen.findByRole("heading", { name: "교육이수관리" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "직원" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "이수현황" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "구독상태" })).toBeInTheDocument();

    // Active employees
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("이순신")).toBeInTheDocument();
    expect(screen.getByText("구독중")).toBeInTheDocument();
    expect(screen.getByText("미구독")).toBeInTheDocument();

    // Retired employee should NOT be rendered
    expect(screen.queryByText("퇴직자")).not.toBeInTheDocument();

    // Completion Status links
    expect(screen.getByRole("link", { name: "1/3" })).toHaveAttribute(
      "href",
      "/manager/safty/completions/detail?name=%ED%99%8D%EA%B8%B8%EB%8F%99",
    );
    expect(screen.getByRole("link", { name: "0/3" })).toHaveAttribute(
      "href",
      "/manager/safty/completions/detail?name=%EC%9D%B4%EC%88%9C%EC%8B%A0",
    );
  });

  it("filters employees by name search input", async () => {
    const user = userEvent.setup();

    render(<EducationCompletionsPage />);

    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("이순신")).toBeInTheDocument();

    await user.type(screen.getByLabelText("직원 이름"), "홍길동");

    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.queryByText("이순신")).not.toBeInTheDocument();
  });

  it("sorts employees by name when clicking the '직원' column header", async () => {
    const user = userEvent.setup();

    render(<EducationCompletionsPage />);

    // By default, sorted ASC: 이순신 (이) should be before 홍길동 (홍)
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("이순신")).toBeInTheDocument();
    expect(within(rows[2]).getByText("홍길동")).toBeInTheDocument();

    // Click the "직원" header to sort DESC
    const employeeHeader = screen.getByRole("columnheader", { name: "직원" });
    await user.click(employeeHeader);

    const updatedRows = screen.getAllByRole("row");
    expect(within(updatedRows[1]).getByText("홍길동")).toBeInTheDocument();
    expect(within(updatedRows[2]).getByText("이순신")).toBeInTheDocument();

    // Click again to sort ASC
    await user.click(employeeHeader);
    const updatedRows2 = screen.getAllByRole("row");
    expect(within(updatedRows2[1]).getByText("이순신")).toBeInTheDocument();
    expect(within(updatedRows2[2]).getByText("홍길동")).toBeInTheDocument();
  });

  it("sorts employees by completion status when clicking the '이수현황' column header", async () => {
    const user = userEvent.setup();

    render(<EducationCompletionsPage />);

    // Initially sorted by name ASC: 이순신 (0/3), 홍길동 (1/3)
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("이순신")).toBeInTheDocument();
    expect(within(rows[2]).getByText("홍길동")).toBeInTheDocument();

    // Click "이수현황" to sort by completion status ASC: 이순신 (0/3) first, then 홍길동 (1/3)
    const completionHeader = screen.getByRole("columnheader", { name: "이수현황" });
    await user.click(completionHeader);

    const updatedRows = screen.getAllByRole("row");
    expect(within(updatedRows[1]).getByText("이순신")).toBeInTheDocument();
    expect(within(updatedRows[2]).getByText("홍길동")).toBeInTheDocument();

    // Click again to sort DESC: 홍길동 (1/3) first, then 이순신 (0/3)
    await user.click(completionHeader);

    const updatedRows2 = screen.getAllByRole("row");
    expect(within(updatedRows2[1]).getByText("홍길동")).toBeInTheDocument();
    expect(within(updatedRows2[2]).getByText("이순신")).toBeInTheDocument();
  });

  it("sends push notifications when clicking the '교육알림' button", async () => {
    const user = userEvent.setup();
    const sendMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        successCount: 1,
        failedCount: 1,
        unregisteredCount: 1,
        notifiedEmployees: ["이순신"],
        unregisteredEmployees: ["홍길동"],
        failedEmployees: [{ employeeName: "임꺽정", reason: "네트워크 오류" }],
      }),
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/notifications/send")) {
          return sendMock(input, init);
        }
        return originalFetch(input, init);
      }),
    );

    render(<EducationCompletionsPage />);

    expect(await screen.findByText("홍길동")).toBeInTheDocument();

    const pushButton = screen.getByRole("button", { name: "교육알림" });
    expect(pushButton).toBeInTheDocument();

    await user.click(pushButton);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const callArgs = sendMock.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ employeeName: "홍길동", uncompletedCount: 2 }),
        expect.objectContaining({ employeeName: "이순신", uncompletedCount: 3 }),
      ]),
    );

    expect(await screen.findByText("교육 알림 전송 결과")).toBeInTheDocument();
    expect(screen.getByText("성공 건수")).toBeInTheDocument();
    expect(screen.getAllByText("1건").length).toBe(2);
    expect(screen.getByText("미등록 인원")).toBeInTheDocument();
    expect(screen.getByText("1명")).toBeInTheDocument();

    expect(screen.getByText("알림 전송 완료 (1명)")).toBeInTheDocument();
    expect(screen.getAllByText("이순신").length).toBe(2);

    expect(screen.getByText("알림 미수신 대상 - 기기 미등록 (1명)")).toBeInTheDocument();
    expect(screen.getAllByText("홍길동").length).toBe(2);

    expect(screen.getByText("알림 전송 실패 (1명)")).toBeInTheDocument();
    expect(screen.getByText("임꺽정")).toBeInTheDocument();
    expect(screen.getByText("네트워크 오류")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: "닫기" });
    await user.click(closeButtons[0]);

    expect(screen.queryByText("교육 알림 전송 결과")).not.toBeInTheDocument();
  });
});
