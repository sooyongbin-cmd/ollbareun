import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSpecialRemarkReport,
  deleteSpecialRemarkReport,
  getSpecialRemarkReport,
  getSpecialRemarkStoragePathFromPublicUrl,
  listSpecialRemarkReports,
} from "./special-remark-reports";
import { getSystemConfigContent } from "./system-configs";

const nodemailerMock = vi.hoisted(() => {
  const sendMail = vi.fn();
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
  };
});
const single = vi.fn();
const selectEq = vi.fn();
const deleteEq = vi.fn();
const select = vi.fn();
const deleteQuery = vi.fn();
const remove = vi.fn();
const upload = vi.fn();
const getPublicUrl = vi.fn();
const createSignedUrl = vi.fn();
const from = vi.fn();

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from,
    storage: {
      from: () => ({ remove, upload, getPublicUrl, createSignedUrl }),
    },
  }),
}));

vi.mock("./system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: nodemailerMock.createTransport,
  },
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

describe("special remark push-only storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
  });

  it("stores the report without loading email configuration or sending email", async () => {
    const insertSingle = vi.fn(async () => ({
      data: {
        id: "report-1",
        employee_name: "홍길동",
        worksite_name: "본사",
        content: "문이 파손되었습니다.",
        email_to: null,
        email_status: "not_requested",
        reported_at: "2026-07-23T00:00:00.000Z",
      },
      error: null,
    }));
    const insert = vi.fn(() => ({ select: () => ({ single: insertSingle }) }));
    from.mockReturnValue({ insert });

    const result = await createSpecialRemarkReport(
      {
        employeeId: "employee-1",
        employeeName: "홍길동",
        worksiteId: "work-1",
        worksiteName: "본사",
        content: "문이 파손되었습니다.",
      },
      { sendEmail: false },
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_to: null,
        email_status: "not_requested",
      }),
    );
    expect(getSystemConfigContent).not.toHaveBeenCalled();
    expect(nodemailerMock.sendMail).not.toHaveBeenCalled();
    expect(result.email_status).toBe("not_requested");
  });
});

describe("special remark report photo access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.supabase.co/storage/v1/object/sign/special-remarks/employee-1/photo.jpg?token=test" },
      error: null,
    });
  });

  it("returns signed URLs for private-bucket photos in the list", async () => {
    const order = vi.fn(async () => ({
      data: [
        {
          id: "report-1",
          photo_url:
            "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
        },
      ],
      error: null,
    }));
    const query = { order, gte: vi.fn(), lt: vi.fn() };
    query.gte.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    select.mockReturnValue(query);
    from.mockReturnValue({ select });

    const reports = await listSpecialRemarkReports();

    expect(createSignedUrl).toHaveBeenCalledWith("employee-1/photo.jpg", 60 * 60);
    expect(reports[0]?.photo_url).toContain("/storage/v1/object/sign/special-remarks/");
  });

  it("returns a signed URL for a private-bucket photo in the detail", async () => {
    selectEq.mockReturnValue({
      single: vi.fn(async () => ({
        data: {
          id: "report-1",
          photo_url:
            "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
        },
        error: null,
      })),
    });
    select.mockReturnValue({ eq: selectEq });
    from.mockReturnValue({ select });

    const report = await getSpecialRemarkReport("report-1");

    expect(createSignedUrl).toHaveBeenCalledWith("employee-1/photo.jpg", 60 * 60);
    expect(report.photo_url).toContain("/storage/v1/object/sign/special-remarks/");
  });
});

describe("special remark report Naver SMTP delivery", () => {
  const previousEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...previousEnv,
      NAVER_SMTP_USER: "sender@naver.com",
      NAVER_SMTP_PASSWORD: "naver-secret",
      NAVER_SMTP_FROM: "올바름 <sender@naver.com>",
      NAVER_SMTP_PORT: "465",
    };
    vi.mocked(getSystemConfigContent).mockResolvedValue("admin@example.com");
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: {
        publicUrl: "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
      },
    });
    nodemailerMock.sendMail.mockResolvedValue({ messageId: "naver-message-1" });
  });

  it("stores the report and sends the same HTML report through Naver SMTP", async () => {
    const insertSingle = vi.fn(async () => ({
      data: {
        id: "report-1",
        employee_name: "홍길동",
        worksite_name: "본사",
        content: "문이 파손되었습니다.",
        photo_url:
          "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
        gps_info: { latitude: 37.5665, longitude: 126.978 },
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
        gpsInfo: { latitude: 37.5665, longitude: 126.978 },
      },
      { emailProvider: "naver" },
    );

    expect(nodemailerMock.createTransport).toHaveBeenCalledWith({
      host: "smtp.naver.com",
      port: 465,
      secure: true,
      auth: {
        user: "sender@naver.com",
        pass: "naver-secret",
      },
    });
    expect(nodemailerMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "올바름 <sender@naver.com>",
        to: "admin@example.com",
        subject: "특이사항보고",
        html: expect.stringContaining("문이 파손되었습니다."),
      }),
    );
    expect(nodemailerMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("보고 위치 (GPS) : 37.566500, 126.978000"),
      }),
    );
    expect(result).toMatchObject({ id: "report-1", email_status: "sent" });
  });

  it("requires Naver SMTP environment variables", async () => {
    process.env = {
      ...previousEnv,
      NAVER_SMTP_USER: "",
      NAVER_SMTP_PASSWORD: "",
      NAVER_SMTP_FROM: "",
      NAVER_SMTP_PORT: "465",
    };
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
        },
        { emailProvider: "naver" },
      ),
    ).rejects.toThrow("NAVER SMTP 환경변수가 설정되지 않았습니다.");

    expect(nodemailerMock.createTransport).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_status: "failed",
        email_error: "NAVER SMTP 환경변수가 설정되지 않았습니다.",
      }),
    );
  });

  it("requires a valid Naver SMTP port", async () => {
    process.env = {
      ...previousEnv,
      NAVER_SMTP_USER: "sender@naver.com",
      NAVER_SMTP_PASSWORD: "naver-secret",
      NAVER_SMTP_PORT: "abc",
    };
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
        },
        { emailProvider: "naver" },
      ),
    ).rejects.toThrow("NAVER_SMTP_PORT 환경변수가 올바르지 않습니다.");

    expect(nodemailerMock.createTransport).not.toHaveBeenCalled();
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
        employee_name: "홍길동",
        worksite_name: "본사",
        content: "문이 파손되었습니다.",
        photo_url:
          "https://example.supabase.co/storage/v1/object/public/special-remarks/employee-1/photo.jpg",
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
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("employeeName");
    expect(body).not.toHaveProperty("worksiteName");
    expect(body).not.toHaveProperty("reportedAt");
    expect(body).not.toHaveProperty("content");
    expect(body).not.toHaveProperty("photoUrl");
    expect(body).not.toHaveProperty("photo");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        email_status: "sent",
        email_error: null,
      }),
    );
    expect(result).toMatchObject({ id: "report-1", email_status: "sent" });
  });

  it("includes gps_info in the database record when gpsInfo is provided", async () => {
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

    await createSpecialRemarkReport(
      {
        employeeId: "employee-1",
        employeeName: "홍길동",
        worksiteId: "work-1",
        worksiteName: "본사",
        content: "문이 파손되었습니다.",
        gpsInfo: { latitude: 37.5665, longitude: 126.978 },
      },
      { emailProvider: "formspree" },
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        gps_info: { latitude: 37.5665, longitude: 126.978 },
      }),
    );
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
