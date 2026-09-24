import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard } from "@/lib/phase1-data";
import { createGuardSessionLog } from "@/lib/guard-session-logs";
import { createGuardAuthSession } from "@/lib/guard-auth-session";
import { POST } from "./route";

vi.mock("@/lib/phase1-data", () => ({
  authenticateGuard: vi.fn(),
}));

vi.mock("@/lib/guard-session-logs", () => ({
  createGuardSessionLog: vi.fn(),
}));
vi.mock("@/lib/guard-auth-session", () => ({ createGuardAuthSession: vi.fn().mockResolvedValue({ setCookie: "test-cookie" }) }));

describe("guard auth route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a success login log and returns its id", async () => {
    vi.mocked(authenticateGuard).mockResolvedValue({
      employee: { id: "emp-1", name: "홍길동" },
      assignment: null,
      worksite: null,
      attendance: null,
    } as never);
    vi.mocked(createGuardSessionLog).mockResolvedValue({ id: "log-1" } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/auth", {
        method: "POST",
        body: JSON.stringify({ name: "홍길동", phone: "010-1234-5678" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createGuardSessionLog).toHaveBeenCalledWith({
      employeeId: "emp-1",
      guardName: "홍길동",
      loginStatus: "success",
    });
    await expect(response.json()).resolves.toMatchObject({ sessionLogId: "log-1" });
  });

  it("creates a failed login log when authentication fails", async () => {
    vi.mocked(authenticateGuard).mockRejectedValue(new Error("등록된 직원 정보와 일치하지 않습니다."));
    vi.mocked(createGuardSessionLog).mockResolvedValue({ id: "log-2" } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/auth", {
        method: "POST",
        body: JSON.stringify({ name: "홍길동", phone: "010-0000-0000" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createGuardSessionLog).toHaveBeenCalledWith({
      guardName: "홍길동",
      loginStatus: "failed",
      loginError: "등록된 직원 정보와 일치하지 않습니다.",
    });
  });
});
