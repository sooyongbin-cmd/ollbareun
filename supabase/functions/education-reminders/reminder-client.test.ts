import { describe, expect, it, vi } from "vitest";
import { requestEducationReminders } from "./reminder-client";

describe("requestEducationReminders", () => {
  it("calls the shared server sender with the cron secret", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        successCount: 2,
        failedCount: 0,
        unregisteredCount: 0,
        notifiedEmployees: ["이순신", "이순자"],
        notifiedEmployeeIds: ["employee-1", "employee-2"],
        unregisteredEmployees: [],
        unregisteredEmployeeIds: [],
        failedEmployees: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const result = await requestEducationReminders({
      apiUrl: "https://ollbareun.vercel.app/api/cron/education-reminders",
      cronSecret: "cron-secret",
      fetchImplementation,
    });

    expect(result.successCount).toBe(2);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://ollbareun.vercel.app/api/cron/education-reminders",
      {
        method: "GET",
        headers: {
          "x-cron-secret": "cron-secret",
        },
      },
    );
  });

  it("throws the downstream response detail when sending fails", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      requestEducationReminders({
        apiUrl: "https://ollbareun.vercel.app/api/cron/education-reminders",
        cronSecret: "wrong-secret",
        fetchImplementation,
      }),
    ).rejects.toThrow("Education reminder API failed (HTTP 403): Forbidden");
  });
});
