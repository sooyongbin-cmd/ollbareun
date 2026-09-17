import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { listAssignments } from "@/lib/phase1-data";
import { GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  listAssignments: vi.fn(),
}));

describe("/api/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns assignments for an authenticated manager", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(listAssignments).mockResolvedValue([{ id: "assignment-1" }] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assignments: [{ id: "assignment-1" }] });
  });

  it("denies assignment access without a manager session", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listAssignments).not.toHaveBeenCalled();
  });
});
