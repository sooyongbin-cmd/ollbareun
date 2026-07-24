import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEducationReminderNotifications } from "@/lib/education-reminder-notifications";
import { POST } from "./route";

vi.mock("@/lib/education-reminder-notifications", () => ({
  sendEducationReminderNotifications: vi.fn(),
}));

describe("POST /api/education/reminders/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendEducationReminderNotifications).mockResolvedValue({
      success: true,
      successCount: 1,
      failedCount: 0,
      unregisteredCount: 0,
      notifiedEmployees: ["홍길동"],
      notifiedEmployeeIds: ["employee-1"],
      unregisteredEmployees: [],
      unregisteredEmployeeIds: [],
      failedEmployees: [],
      dayOffExcludedCount: 0,
      dayOffExcludedEmployeeIds: [],
    });
  });

  it("passes employee ids to the reminder sender", async () => {
    const response = await POST(
      new Request("http://localhost/api/education/reminders/send", {
        method: "POST",
        body: JSON.stringify({ employeeIds: ["employee-1"] }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({ success: true, successCount: 1 });
    expect(sendEducationReminderNotifications).toHaveBeenCalledWith({ employeeIds: ["employee-1"] });
  });
});
