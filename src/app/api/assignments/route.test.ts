import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { AssignmentOverlapError, createAssignment, listAssignmentManagementData } from "@/lib/phase1-data";
import { GET, POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/phase1-data")>();
  return {
    ...actual,
    createAssignment: vi.fn(),
    listAssignmentManagementData: vi.fn(),
  };
});

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

    const response = await GET(new Request("http://localhost/api/assignments"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assignments: [{ id: "assignment-1" }],
      employeeNames: ["홍길동"],
      worksiteNames: ["본사"],
    });
  });

  it("denies assignment access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/assignments"));

    expect(response.status).toBe(401);
    expect(listAssignmentManagementData).not.toHaveBeenCalled();
  });

  it("returns overlapping assignment details with HTTP 409", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    const conflict = {
      id: "assignment-1",
      employeeId: "employee-1",
      employeeName: "홍길동",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };
    vi.mocked(createAssignment).mockRejectedValue(new AssignmentOverlapError(conflict));

    const response = await POST(new Request("http://localhost/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "employee-1" }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "해당 직원의 근무기간이 기존 배정과 겹칩니다.",
      conflict,
    });
  });
});
