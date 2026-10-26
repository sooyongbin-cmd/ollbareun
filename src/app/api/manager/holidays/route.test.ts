import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { holidayDate, holidayName, insertHolidayRecords } from "@/lib/public-holidays";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/public-holidays", () => ({
  holidayDate: vi.fn(),
  holidayName: vi.fn(),
  holidayYear: vi.fn(),
  insertHolidayRecords: vi.fn(),
}));

describe("/api/manager/holidays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("requires a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(401);
    expect(insertHolidayRecords).not.toHaveBeenCalled();
  });

  it("saves the submitted holiday name with the date", async () => {
    vi.mocked(holidayDate).mockReturnValue("2026-10-03");
    vi.mocked(holidayName).mockReturnValue("개천절");
    vi.mocked(insertHolidayRecords).mockResolvedValue([{ id: "holiday-1", holiday_date: "2026-10-03", name: "개천절", selected: "Y", holiday_type: "public" }]);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ holiday_date: "2026-10-03", name: "개천절", holiday_type: "public" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ inserted: 1, holiday: { id: "holiday-1", holiday_date: "2026-10-03", selected: "Y" } });
    expect(insertHolidayRecords).toHaveBeenCalledWith([
      { holiday_date: "2026-10-03", name: "개천절", selected: "Y", holiday_type: "public" },
    ]);
  });
});
