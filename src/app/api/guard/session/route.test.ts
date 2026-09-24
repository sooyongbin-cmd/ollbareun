import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";
import { GET } from "./route";

vi.mock("@/lib/guard-auth-session", () => ({
  requireGuardEmployee: vi.fn(),
  guardAuthErrorStatus: (error: { status?: number }) => error?.status ?? 500,
}));
vi.mock("@/lib/phase1-data", () => ({
  loadGuardSessionByEmployeeId: vi.fn(),
}));

describe("GET /api/guard/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "employee-1", name: "홍길동", role: "경비원", is_retired: false });
  });

  it("refreshes a durable session for an active employee", async () => {
    vi.mocked(loadGuardSessionByEmployeeId).mockResolvedValue({
      employee: { id: "employee-1", name: "홍길동" },
      assignment: null,
      worksite: null,
      attendance: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/guard/session", { headers: { Cookie: "ollbareun_guard_session=test" } }),
    );

    expect(response.status).toBe(200);
    expect(requireGuardEmployee).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      session: { employee: { id: "employee-1" } },
    });
  });

  it("returns 403 when the employee is retired or deleted", async () => {
    vi.mocked(requireGuardEmployee).mockRejectedValue(
      Object.assign(new Error("퇴직 처리된 직원은 이용할 수 없습니다."), { status: 403 }),
    );

    const response = await GET(
      new Request("http://localhost/api/guard/session", { headers: { Cookie: "ollbareun_guard_session=test" } }),
    );

    expect(response.status).toBe(403);
  });
});
