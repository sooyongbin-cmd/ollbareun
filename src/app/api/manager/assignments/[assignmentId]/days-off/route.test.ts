import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getManagerUser } from "@/lib/manager-auth";
import { listAssignmentDaysOff } from "@/lib/assignment-days-off";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/assignment-days-off", () => ({
  listAssignmentDaysOff: vi.fn(),
}));

const context = {
  params: Promise.resolve({ assignmentId: "assign-1" }),
};

describe("manager assignment days-off route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), context);

    expect(response.status).toBe(401);
    expect(listAssignmentDaysOff).not.toHaveBeenCalled();
  });

  it("returns the assignment days off", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(listAssignmentDaysOff).mockResolvedValue([
      {
        id: "day-off-1",
        work_assignment_id: "assign-1",
        day_off_date: "2026-05-22",
        created_at: "2026-05-01T00:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      daysOff: [{ day_off_date: "2026-05-22" }],
    });
  });
});
