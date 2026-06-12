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
const upload = vi.fn();
const getPublicUrl = vi.fn();
const from = vi.fn();

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from,
    storage: {
      from: () => ({ remove, upload, getPublicUrl }),
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

describe("special remark report Formspree delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
    vi.mocked(getSystemConfigContent).mockResolvedValue("admin@example.com");
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: {
        publicUrl: "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
      },
    });
  });

  it("stores the report and sends the photo URL through Formspree", async () => {
    const insertSingle = vi.fn(async () => ({
      data: {
        id: "report-1",
        reported_at: "2026-06-12T00:00:00.000Z",
      },
      error: null,
    }));
    const updateSingle = vi.fn(async () => ({
      data: {
        id: "report-1",
        email_status: "sent",
        email_sent_at: "2026-06-12T00:00:01.000Z",
        email_error: null,
      },
      error: null,
    }));
    const insert = vi.fn(() => ({ select: () => ({ single: insertSingle }) }));
    const updateEq = vi.fn(() => ({ select: () => ({ single: updateSingle }) }));
    const update = vi.fn(() => ({ eq: updateEq }));
    from.mockReturnValue({ insert, update });

    const result = await createSpecialRemarkReport(
      {
        employeeId: "employee-1",
        employeeName: "홍길동",
        worksiteId: "work-1",
        worksiteName: "본사",
        content: "문이 파손되었습니다.",
        photoDataUrl: "data:image/jpeg;base64,AAAA",
      },
      { emailProvider: "formspree" },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://formspree.io/f/mojzkwbp",
      expect.objectContaining({
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: expect.stringContaining("문이 파손되었습니다."),
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.message).toContain("문이 파손되었습니다.");
    expect(body.message).toContain("https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg");
    expect(body.photoUrl).toBe("https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg");
    expect(body).not.toHaveProperty("photo");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_status: "sent",
        email_error: null,
      }),
    );
    expect(result).toMatchObject({ id: "report-1", email_status: "sent" });
  });

  it("marks the stored report failed when Formspree rejects the submission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: "Formspree rejected the submission",
          },
          { status: 422 },
        ),
      ),
    );
    const insertSingle = vi.fn(async () => ({
      data: {
        id: "report-1",
        reported_at: "2026-06-12T00:00:00.000Z",
      },
      error: null,
    }));
    const insert = vi.fn(() => ({ select: () => ({ single: insertSingle }) }));
    const failedEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: failedEq }));
    from.mockReturnValue({ insert, update });

    await expect(
      createSpecialRemarkReport(
        {
          employeeId: "employee-1",
          employeeName: "홍길동",
          worksiteId: "work-1",
          worksiteName: "본사",
          content: "문이 파손되었습니다.",
          photoDataUrl: "data:image/jpeg;base64,AAAA",
        },
        { emailProvider: "formspree" },
      ),
    ).rejects.toThrow("Formspree rejected the submission");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_status: "failed",
        email_error: "Formspree rejected the submission",
      }),
    );
  });
});
