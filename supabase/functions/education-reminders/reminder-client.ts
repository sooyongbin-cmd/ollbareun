export type EducationReminderResult = {
  success: true;
  successCount: number;
  failedCount: number;
  unregisteredCount: number;
  notifiedEmployees: string[];
  notifiedEmployeeIds: string[];
  unregisteredEmployees: string[];
  unregisteredEmployeeIds: string[];
  failedEmployees: { employeeId: string; employeeName: string; reason: string }[];
  dayOffExcludedCount: number;
  dayOffExcludedEmployeeIds: string[];
};

type RequestEducationRemindersInput = {
  apiUrl: string;
  cronSecret: string;
  fetchImplementation?: typeof fetch;
};

export async function requestEducationReminders({
  apiUrl,
  cronSecret,
  fetchImplementation = fetch,
}: RequestEducationRemindersInput): Promise<EducationReminderResult> {
  const response = await fetchImplementation(apiUrl, {
    method: "GET",
    headers: {
      "x-cron-secret": cronSecret,
    },
  });
  const body = await response.json().catch(() => null) as EducationReminderResult | { error?: unknown } | null;

  if (!response.ok) {
    const detail = body && "error" in body && typeof body.error === "string"
      ? body.error
      : response.statusText || "Unknown error";
    throw new Error(`Education reminder API failed (HTTP ${response.status}): ${detail}`);
  }

  if (!body || !("success" in body) || body.success !== true) {
    throw new Error("Education reminder API returned an invalid response");
  }

  return body as EducationReminderResult;
}
