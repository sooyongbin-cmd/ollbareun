import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadGuardPasskeyRequestForEmployee } from "@/lib/guard-passkeys";
import { GET } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  loadGuardPasskeyRequestForEmployee: vi.fn(),
}));

describe("guard passkey request status route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the latest request for the employee", async () => {
    vi.mocked(loadGuardPasskeyRequestForEmployee).mockResolvedValue({ id: "req-1", status: "approved" } as never);

    const response = await GET(new Request("http://localhost/api/guard/passkey-requests/me?employeeId=emp-1"));

    expect(response.status).toBe(200);
    expect(loadGuardPasskeyRequestForEmployee).toHaveBeenCalledWith("emp-1");
    await expect(response.json()).resolves.toMatchObject({ request: { status: "approved" } });
  });
});
