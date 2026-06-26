import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSpecialRemarkReport } from "@/lib/special-remark-reports";
import { POST } from "./route";

vi.mock("@/lib/special-remark-reports", () => ({
  createSpecialRemarkReport: vi.fn(),
}));

describe("POST /api/guard/special-remarks/report/naver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a special remark report through Naver SMTP", async () => {
    vi.mocked(createSpecialRemarkReport).mockResolvedValue({ id: "report-1" } as never);

    const body = {
      employeeId: "employee-1",
      employeeName: "홍길동",
      worksiteId: "work-1",
      worksiteName: "본사",
      content: "특이사항 내용",
      photoDataUrl: "data:image/jpeg;base64,AAAA",
    };
    const response = await POST(
      new Request("http://localhost/api/guard/special-remarks/report/naver", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ report: { id: "report-1" } });
    expect(createSpecialRemarkReport).toHaveBeenCalledWith(body, { emailProvider: "naver" });
  });
});
