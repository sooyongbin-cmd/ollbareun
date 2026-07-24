import { beforeEach, describe, expect, it, vi } from "vitest";
import { InactiveEmployeeError, requireActiveEmployee } from "@/lib/active-employee";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";
import { GET } from "./route";

vi.mock("@/lib/active-employee", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/active-employee")>();
  return {
    ...actual,
    requireActiveEmployee: vi.fn(),
  };
});
vi.mock("@/lib/phase1-data", () => ({
  loadGuardSessionByEmployeeId: vi.fn(),
}));

describe("GET /api/guard/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireActiveEmployee).mockResolvedValue({ id: "employee-1" });
  });

  it("refreshes a durable session for an active employee", async () => {
    vi.mocked(loadGuardSessionByEmployeeId).mockResolvedValue({
      employee: { id: "employee-1", name: "홍길동" },
      assignment: null,
      worksite: null,
      attendance: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/guard/session?employeeId=employee-1"),
    );

    expect(response.status).toBe(200);
    expect(requireActiveEmployee).toHaveBeenCalledWith("employee-1");
    await expect(response.json()).resolves.toMatchObject({
      session: { employee: { id: "employee-1" } },
    });
  });

  it("returns 403 when the employee is retired or deleted", async () => {
    vi.mocked(requireActiveEmployee).mockRejectedValue(
      new InactiveEmployeeError("퇴직 처리된 직원은 이용할 수 없습니다."),
    );

    const response = await GET(
      new Request("http://localhost/api/guard/session?employeeId=employee-1"),
    );

    expect(response.status).toBe(403);
  });
});
