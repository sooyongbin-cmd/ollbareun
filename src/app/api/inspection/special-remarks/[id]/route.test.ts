import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSpecialRemarkReport, getSpecialRemarkReport } from "@/lib/special-remark-reports";
import { getManagerUser } from "@/lib/manager-auth";
import { DELETE, GET } from "./route";

vi.mock("@/lib/special-remark-reports", () => ({
  deleteSpecialRemarkReport: vi.fn(),
  getSpecialRemarkReport: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

const context = {
  params: Promise.resolve({ id: "report-1" }),
};

describe("/api/inspection/special-remarks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("returns a single special remark report", async () => {
    vi.mocked(getSpecialRemarkReport).mockResolvedValue({ id: "report-1", content: "전체 내용" } as never);

    const response = await GET(new Request("http://localhost/api/inspection/special-remarks/report-1"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ report: { id: "report-1", content: "전체 내용" } });
    expect(getSpecialRemarkReport).toHaveBeenCalledWith("report-1");
  });

  it("deletes a single special remark report", async () => {
    vi.mocked(deleteSpecialRemarkReport).mockResolvedValue(undefined as never);

    const response = await DELETE(new Request("http://localhost/api/inspection/special-remarks/report-1"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(deleteSpecialRemarkReport).toHaveBeenCalledWith("report-1");
  });
});
