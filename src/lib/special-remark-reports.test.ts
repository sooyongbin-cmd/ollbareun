import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSpecialRemarkReport,
  deleteSpecialRemarkReport,
  getSpecialRemarkStoragePathFromPublicUrl,
} from "./special-remark-reports";
import { getSystemConfigContent } from "./system-configs";

const single = vi.fn();
const selectEq = vi.fn();
const deleteEq = vi.fn();
const select = vi.fn();
const deleteQuery = vi.fn();
const remove = vi.fn();
const from = vi.fn();

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from,
    storage: {
      from: () => ({ remove }),
    },
  }),
}));

vi.mock("./system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

describe("special remark report storage deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    select.mockReturnValue({ eq: selectEq });
    selectEq.mockReturnValue({ single });
    deleteQuery.mockReturnValue({ eq: deleteEq });
    deleteEq.mockResolvedValue({ error: null });
    from.mockReturnValue({ select, delete: deleteQuery });
    single.mockResolvedValue({
      data: {
        id: "report-1",
        photo_url:
          "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
      },
      error: null,
    });
    remove.mockResolvedValue({ error: null });
  });

  it("extracts a storage object path from a public special remarks URL", () => {
    expect(
      getSpecialRemarkStoragePathFromPublicUrl(
        "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
      ),
    ).toBe("employee-1/photo.jpg");
  });

  it("removes the storage object before deleting the report row", async () => {
    const calls: string[] = [];
    remove.mockImplementation(async () => {
      calls.push("storage");
      return { error: null };
    });
    deleteEq.mockImplementation(() => {
      calls.push("db");
      return { error: null };
    });

    await deleteSpecialRemarkReport("report-1");

    expect(remove).toHaveBeenCalledWith(["employee-1/photo.jpg"]);
    expect(calls).toEqual(["storage", "db"]);
  });

  it("does not delete the report row when storage removal fails", async () => {
    remove.mockResolvedValue({ error: { message: "storage failed" } });

    await expect(deleteSpecialRemarkReport("report-1")).rejects.toThrow("storage failed");

    expect(deleteEq).not.toHaveBeenCalled();
  });

  it("rejects images larger than 500KB before uploading them", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("admin@example.com");

    await expect(
      createSpecialRemarkReport({
        employeeId: "employee-1",
        employeeName: "홍길동",
        worksiteId: "work-1",
        worksiteName: "본사",
        content: "특이사항",
        photoDataUrl: `data:image/jpeg;base64,${"A".repeat(700 * 1024)}`,
      }),
    ).rejects.toThrow("첨부사진은 500KB 이하만 업로드할 수 있습니다.");

    expect(remove).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
