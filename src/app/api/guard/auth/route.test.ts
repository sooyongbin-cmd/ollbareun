import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard } from "@/lib/phase1-data";
import { createGuardAuthSession } from "@/lib/guard-auth-session";
import { POST } from "./route";

vi.mock("@/lib/phase1-data", () => ({
  authenticateGuard: vi.fn(),
}));

vi.mock("@/lib/guard-auth-session", () => ({
  createGuardAuthSession: vi.fn().mockResolvedValue({ setCookie: "test-cookie" }),
}));

describe("guard auth route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an authenticated session on success", async () => {
    vi.mocked(authenticateGuard).mockResolvedValue({
      employee: { id: "emp-1", name: "홍길동" },
      assignment: null,
      worksite: null,
      attendance: null,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/auth", {
        method: "POST",
        body: JSON.stringify({ name: "홍길동", phone: "010-1234-5678" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createGuardAuthSession).toHaveBeenCalledWith("emp-1");
    expect(response.headers.get("Set-Cookie")).toBe("test-cookie");
    await expect(response.json()).resolves.toMatchObject({
      employee: { id: "emp-1", name: "홍길동" },
    });
  });

  it("returns an authentication error when credentials are invalid", async () => {
    vi.mocked(authenticateGuard).mockRejectedValue(new Error("등록된 직원 정보와 일치하지 않습니다."));

    const response = await POST(
      new Request("http://localhost/api/guard/auth", {
        method: "POST",
        body: JSON.stringify({ name: "홍길동", phone: "010-0000-0000" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "등록된 직원 정보와 일치하지 않습니다.",
    });
  });
});
