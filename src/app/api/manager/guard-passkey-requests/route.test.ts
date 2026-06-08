import { beforeEach, describe, expect, it, vi } from "vitest";
import { listGuardPasskeyRequests } from "@/lib/guard-passkeys";
import { GET } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  listGuardPasskeyRequests: vi.fn(),
}));

describe("manager guard passkey request list route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns passkey request rows", async () => {
    vi.mocked(listGuardPasskeyRequests).mockResolvedValue([
      { id: "req-1", employeeName: "홍길동", status: "pending" },
    ] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ requests: [{ id: "req-1" }] });
  });
});
