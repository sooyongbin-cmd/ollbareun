import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendSpecialRemarkManagerNotifications } from "@/lib/manager-push-notifications";
import { createSpecialRemarkReport } from "@/lib/special-remark-reports";
import { POST } from "./route";

vi.mock("@/lib/manager-push-notifications", () => ({
  sendSpecialRemarkManagerNotifications: vi.fn(),
}));

vi.mock("@/lib/special-remark-reports", () => ({
  createSpecialRemarkReport: vi.fn(),
}));
vi.mock("@/lib/guard-auth-session", () => ({
  requireGuardWorksite: vi.fn().mockResolvedValue({ employee: { id: "employee-1", name: "홍길동", role: "경비원" }, worksite: { id: "work-1", name: "본사" } }),
  guardAuthErrorStatus: (_error: unknown, fallback: number) => fallback,
}));

describe("POST /api/guard/special-remarks/report/push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves without email and then sends the manager notification", async () => {
    const body = { employeeId: "employee-1", content: "문이 파손되었습니다." };
    const report = {
      id: "report-1",
      employee_name: "홍길동",
      worksite_name: "본사",
      content: body.content,
    };
    vi.mocked(createSpecialRemarkReport).mockResolvedValue(report as never);
    vi.mocked(sendSpecialRemarkManagerNotifications).mockResolvedValue({
      successCount: 2,
      failedCount: 0,
      unregisteredCount: 1,
    });

    const response = await POST(
      new Request("http://localhost/api/guard/special-remarks/report/push", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(createSpecialRemarkReport).toHaveBeenCalledWith(
      { ...body, employeeName: "홍길동", worksiteId: "work-1", worksiteName: "본사" },
      { sendEmail: false },
    );
    expect(sendSpecialRemarkManagerNotifications).toHaveBeenCalledWith(report);
    await expect(response.json()).resolves.toMatchObject({
      report,
      delivery: { successCount: 2, failedCount: 0, unregisteredCount: 1 },
    });
  });

  it("does not send when report saving fails", async () => {
    vi.mocked(createSpecialRemarkReport).mockRejectedValue(new Error("저장 실패"));

    const response = await POST(
      new Request("http://localhost/api/guard/special-remarks/report/push", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(sendSpecialRemarkManagerNotifications).not.toHaveBeenCalled();
  });

  it("keeps the saved report when push delivery fails", async () => {
    const report = {
      id: "report-1",
      employee_name: "홍길동",
      worksite_name: "본사",
      content: "내용",
    };
    vi.mocked(createSpecialRemarkReport).mockResolvedValue(report as never);
    vi.mocked(sendSpecialRemarkManagerNotifications).mockRejectedValue(new Error("VAPID 오류"));

    const response = await POST(
      new Request("http://localhost/api/guard/special-remarks/report/push", {
        method: "POST",
        body: JSON.stringify({ content: "내용" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      report,
      delivery: { successCount: 0, failedCount: 0, unregisteredCount: 0, error: "VAPID 오류" },
    });
  });
});
