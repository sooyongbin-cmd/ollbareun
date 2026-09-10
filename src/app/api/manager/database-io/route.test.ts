import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { loadDatabaseIoStats } from "@/lib/database-io";
import { GET } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/database-io", () => ({
  loadDatabaseIoStats: vi.fn(),
}));

describe("/api/manager/database-io", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("denies GET if not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(loadDatabaseIoStats).not.toHaveBeenCalled();
  });

  it("returns database I/O statistics for a manager", async () => {
    const stats = {
      tables: [],
      queries: [],
      queryStatsAvailable: true,
      generatedAt: "2026-09-10T01:00:00.000Z",
    };
    vi.mocked(loadDatabaseIoStats).mockResolvedValue(stats);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ stats });
  });
});
