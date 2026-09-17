import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { holidayDate, holidayName, insertHolidays } from "@/lib/public-holidays";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/public-holidays", () => ({
  holidayDate: vi.fn(),
  holidayName: vi.fn(),
  holidayYear: vi.fn(),
  insertHolidays: vi.fn(),
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
    expect(insertHolidays).not.toHaveBeenCalled();
  });

  it("saves the submitted holiday name with the date", async () => {
    vi.mocked(holidayDate).mockReturnValue("2026-10-03");
    vi.mocked(holidayName).mockReturnValue("개천절");
    vi.mocked(insertHolidays).mockResolvedValue(1);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ holiday_date: "2026-10-03", name: "개천절" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(insertHolidays).toHaveBeenCalledWith([
      { holiday_date: "2026-10-03", name: "개천절", selected: "Y" },
    ]);
  });
});
