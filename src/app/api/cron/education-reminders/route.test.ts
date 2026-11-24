import { beforeEach, describe, expect, it, vi } from "vitest";
import { processDueEducationReminderJobs, processMonthEndEducationReminders } from "@/lib/education-reminder-notifications";
import { GET } from "./route";

vi.mock("@/lib/education-reminder-notifications", () => ({
  processDueEducationReminderJobs: vi.fn(),
  processMonthEndEducationReminders: vi.fn(),
}));

describe("GET /api/cron/education-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processMonthEndEducationReminders).mockResolvedValue({ sent: 1, skipped: 0, retried: 0, failed: 0 });
    process.env.EDUCATION_REMINDER_CRON_SECRET = "cron-secret";
    vi.mocked(processDueEducationReminderJobs).mockResolvedValue({
      success: true,
      successCount: 1,
      failedCount: 0,
      unregisteredCount: 0,
      notifiedEmployees: ["홍길동"],
      notifiedEmployeeIds: ["employee-1"],
      unregisteredEmployees: [],
      unregisteredEmployeeIds: [],
      failedEmployees: [],
    });
  });

  it("runs from the Vercel cron user agent", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/education-reminders", {
        headers: { "user-agent": "vercel-cron/1.0" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, successCount: 1 });
    expect(processDueEducationReminderJobs).toHaveBeenCalledWith();
  });

  it("runs from the Supabase Edge Function with the shared cron secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/education-reminders", {
        headers: { "x-cron-secret": "cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, successCount: 1 });
    expect(processDueEducationReminderJobs).toHaveBeenCalledWith();
  });

  it("includes month-end processing for authenticated cron requests", async () => {
    const response = await GET(new Request("http://localhost/api/cron/education-reminders", {
      headers: { "x-cron-secret": "cron-secret" },
    }));
    await expect(response.json()).resolves.toMatchObject({ monthEnd: { sent: 1 } });
    expect(processMonthEndEducationReminders).toHaveBeenCalledOnce();
  });

  it("rejects non-cron requests", async () => {
    const response = await GET(new Request("http://localhost/api/cron/education-reminders"));

    expect(response.status).toBe(403);
    expect(processDueEducationReminderJobs).not.toHaveBeenCalled();
  });
});
