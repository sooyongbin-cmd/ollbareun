import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveGuardPasskeyRequest,
  rejectGuardPasskeyRequest,
  revokeGuardPasskey,
} from "@/lib/guard-passkeys";
import { PATCH } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  approveGuardPasskeyRequest: vi.fn(),
  rejectGuardPasskeyRequest: vi.fn(),
  revokeGuardPasskey: vi.fn(),
}));

describe("manager guard passkey request action route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("approves a request", async () => {
    vi.mocked(approveGuardPasskeyRequest).mockResolvedValue({ id: "req-1", status: "approved" } as never);

    const response = await PATCH(
      new Request("http://localhost/api/manager/guard-passkey-requests/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "approve", reviewedBy: "관리자" }),
      }),
      { params: Promise.resolve({ id: "req-1" }) },
    );

    expect(response.status).toBe(200);
    expect(approveGuardPasskeyRequest).toHaveBeenCalledWith("req-1", "관리자");
  });

  it("rejects and revokes requests", async () => {
    vi.mocked(rejectGuardPasskeyRequest).mockResolvedValue({ id: "req-1", status: "rejected" } as never);
    vi.mocked(revokeGuardPasskey).mockResolvedValue({ id: "req-2", status: "revoked" } as never);

    await PATCH(
      new Request("http://localhost/api/manager/guard-passkey-requests/req-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      }),
      { params: Promise.resolve({ id: "req-1" }) },
    );
    await PATCH(
      new Request("http://localhost/api/manager/guard-passkey-requests/req-2", {
        method: "PATCH",
        body: JSON.stringify({ action: "revoke" }),
      }),
      { params: Promise.resolve({ id: "req-2" }) },
    );

    expect(rejectGuardPasskeyRequest).toHaveBeenCalledWith("req-1", undefined);
    expect(revokeGuardPasskey).toHaveBeenCalledWith("req-2", undefined);
  });
});
