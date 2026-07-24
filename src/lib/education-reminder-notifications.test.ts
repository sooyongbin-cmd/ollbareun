import webpush from "web-push";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabase } from "@/lib/supabase";
import { sendEducationReminderNotifications } from "./education-reminder-notifications";
import { listEmployeeIdsOffOnDate } from "./assignment-days-off";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./assignment-days-off", () => ({
  listEmployeeIdsOffOnDate: vi.fn(),
}));

function createSelectResult(data: unknown[]) {
  return {
    select: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

describe("sendEducationReminderNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    vi.mocked(listEmployeeIdsOffOnDate).mockResolvedValue([]);

    const from = vi.fn((table: string) => {
      if (table === "employees") {
        return createSelectResult([
          { id: "employee-1", name: "홍길동", is_retired: false },
          { id: "employee-2", name: "이순신", is_retired: false },
          { id: "employee-3", name: "은퇴자", is_retired: true },
        ]);
      }
      if (table === "education_resources") {
        return createSelectResult([{ id: "resource-1" }, { id: "resource-2" }]);
      }
      if (table === "education_completions") {
        return createSelectResult([
          { employee_id: "employee-1", resource_id: "resource-1", is_completed: true },
          { employee_id: "employee-2", resource_id: "resource-1", is_completed: true },
          { employee_id: "employee-2", resource_id: "resource-2", is_completed: true },
        ]);
      }
      if (table === "push_subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  employee_id: "employee-1",
                  endpoint: "https://push.example.test/employee-1",
                  p256dh: "p256dh-key",
                  auth: "auth-secret",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    vi.mocked(getSupabase).mockReturnValue({ from } as never);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
  });

  it("sends reminders to active employees with incomplete education and includes the safety URL", async () => {
    const result = await sendEducationReminderNotifications();

    expect(result.successCount).toBe(1);
    expect(result.notifiedEmployeeIds).toEqual(["employee-1"]);
    expect(result.unregisteredEmployeeIds).toEqual([]);
    expect(result.dayOffExcludedCount).toBe(0);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(vi.mocked(webpush.sendNotification).mock.calls[0][1] as string);
    expect(payload.data.url).toBe("/guard/main/safety");
    expect(payload.title).toContain("안전교육");
  });

  it("limits reminder targets when employeeIds are provided", async () => {
    await sendEducationReminderNotifications({ employeeIds: ["employee-2"] });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("does not send to everyone when an empty employeeIds filter is provided", async () => {
    const result = await sendEducationReminderNotifications({ employeeIds: [] });

    expect(result.successCount).toBe(0);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("excludes employees who are off when invoked by the periodic process", async () => {
    vi.mocked(listEmployeeIdsOffOnDate).mockResolvedValue(["employee-1"]);

    const result = await sendEducationReminderNotifications({ excludeDaysOff: true });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(result.dayOffExcludedCount).toBe(1);
    expect(result.dayOffExcludedEmployeeIds).toEqual(["employee-1"]);
    expect(result.notifiedEmployeeIds).toEqual([]);
    expect(listEmployeeIdsOffOnDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("keeps manual targeted reminders independent from the day-off filter", async () => {
    vi.mocked(listEmployeeIdsOffOnDate).mockResolvedValue(["employee-1"]);

    await sendEducationReminderNotifications({ employeeIds: ["employee-1"] });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(listEmployeeIdsOffOnDate).not.toHaveBeenCalled();
  });
});
