import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSpecialRemarkReports } from "@/lib/special-remark-reports";
import { getManagerUser } from "@/lib/manager-auth";
import { GET } from "./route";

vi.mock("@/lib/special-remark-reports", () => ({
  listSpecialRemarkReports: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("GET /api/inspection/special-remarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("passes the selected month filter to the report loader", async () => {
    vi.mocked(listSpecialRemarkReports).mockResolvedValue([{ id: "report-1" }] as never);

    const response = await GET(new Request("http://localhost/api/inspection/special-remarks?yearMonth=2026-10"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reports: [{ id: "report-1" }] });
    expect(listSpecialRemarkReports).toHaveBeenCalledWith({ yearMonth: "2026-10" });
  });
});
