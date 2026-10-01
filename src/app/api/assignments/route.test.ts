import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { listAssignmentManagementData } from "@/lib/phase1-data";
import { GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  listAssignmentManagementData: vi.fn(),
}));

describe("/api/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns assignments for an authenticated manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(listAssignmentManagementData).mockResolvedValue({
      assignments: [{ id: "assignment-1" }],
      employeeNames: ["홍길동"],
      worksiteNames: ["본사"],
    } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assignments: [{ id: "assignment-1" }],
      employeeNames: ["홍길동"],
      worksiteNames: ["본사"],
    });
  });

  it("denies assignment access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listAssignmentManagementData).not.toHaveBeenCalled();
  });
});
