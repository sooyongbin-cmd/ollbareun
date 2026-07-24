import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "./route";
import { getManagerUser } from "@/lib/manager-auth";
import { addAssignmentDayOff, removeAssignmentDayOff } from "@/lib/assignment-days-off";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/assignment-days-off", () => ({
  addAssignmentDayOff: vi.fn(),
  removeAssignmentDayOff: vi.fn(),
}));

const context = {
  params: Promise.resolve({ assignmentId: "assign-1", date: "2026-05-22" }),
};

describe("manager assignment day-off date route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated writes", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await PUT(new Request("http://localhost", { method: "PUT" }), context);

    expect(response.status).toBe(401);
    expect(addAssignmentDayOff).not.toHaveBeenCalled();
  });

  it("adds a day off idempotently", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(addAssignmentDayOff).mockResolvedValue({
      id: "day-off-1",
      work_assignment_id: "assign-1",
      day_off_date: "2026-05-22",
      created_at: "2026-05-01T00:00:00.000Z",
    });

    const response = await PUT(new Request("http://localhost", { method: "PUT" }), context);

    expect(response.status).toBe(200);
    expect(addAssignmentDayOff).toHaveBeenCalledWith("assign-1", "2026-05-22");
  });

  it("removes a day off", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(removeAssignmentDayOff).mockResolvedValue();

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), context);

    expect(response.status).toBe(204);
    expect(removeAssignmentDayOff).toHaveBeenCalledWith("assign-1", "2026-05-22");
  });
});
