import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INSPECTION_QR_TYPE,
  buildInspectionQrPayload,
  createInspectionLog,
  createInspectionSite,
  deleteInspectionSite,
  listInspectionLogs,
  listInspectionSites,
  parseInspectionQrPayload,
  updateInspectionSite,
} from "./inspection";
import { getSupabase } from "./supabase";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

describe("inspection data helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds and validates the inspection QR payload", () => {
    const payload = buildInspectionQrPayload({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "본사",
      name: "지하 1층",
      gps_info: { latitude: 37.5, longitude: 127.1 },
    });

    expect(payload).toEqual({
      type: INSPECTION_QR_TYPE,
      version: 1,
      siteId: "site-1",
      worksiteId: "work-1",
      worksiteName: "본사",
      siteName: "지하 1층",
      gpsInfo: { latitude: 37.5, longitude: 127.1 },
    });
    expect(parseInspectionQrPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it("rejects QR payloads from another source", () => {
    expect(() =>
      parseInspectionQrPayload(JSON.stringify({ type: "other", version: 1, siteId: "site-1" })),
    ).toThrow("현장점검 QR 코드가 아닙니다.");
  });

  it("creates an inspection site under a worksite", async () => {
    const insertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "site-1",
          worksite_id: "work-1",
          name: "정문",
          address: "서울시 중구 세종대로 1",
          gps_info: { latitude: 37.5, longitude: 127 },
          created_at: "2026-06-04T00:00:00Z",
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "work-1", name: "본사" },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(insertQuery).mockReturnValueOnce(worksiteQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      createInspectionSite({
        worksiteId: "work-1",
        name: "정문",
        address: "서울시 중구 세종대로 1",
        gpsInfo: { latitude: 37.5, longitude: 127 },
      }),
    ).resolves.toMatchObject({
      id: "site-1",
      worksite_name: "본사",
    });
    expect(insertQuery.insert).toHaveBeenCalledWith({
      worksite_id: "work-1",
      name: "정문",
      address: "서울시 중구 세종대로 1",
      gps_info: { latitude: 37.5, longitude: 127 },
    });
  });

  it("updates an inspection site under a worksite", async () => {
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "site-1",
          worksite_id: "work-1",
          name: "Gate",
          address: "Seoul",
          gps_info: { latitude: 37.5, longitude: 127 },
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "work-1", name: "Worksite" },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(updateQuery).mockReturnValueOnce(worksiteQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      updateInspectionSite({
        id: "site-1",
        worksiteId: "work-1",
        name: "Gate",
        address: "Seoul",
        gpsInfo: { latitude: 37.5, longitude: 127 },
      }),
    ).resolves.toMatchObject({ id: "site-1", worksite_name: "Worksite" });
    expect(updateQuery.update).toHaveBeenCalledWith({
      worksite_id: "work-1",
      name: "Gate",
      address: "Seoul",
      gps_info: { latitude: 37.5, longitude: 127 },
    });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "site-1");
  });

  it("deletes an inspection site", async () => {
    const deleteQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(deleteQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(deleteInspectionSite("site-1")).resolves.toBeUndefined();
    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "site-1");
  });

  it("lists inspection sites with worksite names and search filter", async () => {
    const sitesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({
        data: [
          {
            id: "site-1",
            worksite_id: "work-1",
            name: "정문",
            address: "서울시 중구 세종대로 1",
            gps_info: { latitude: 37.5, longitude: 127 },
            created_at: "2026-06-04T00:00:00Z",
          },
        ],
        error: null,
      }),
    };
    const worksitesQuery = {
      select: vi.fn().mockResolvedValue({
        data: [{ id: "work-1", name: "본사" }],
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(sitesQuery).mockReturnValueOnce(worksitesQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(listInspectionSites({ name: "정" })).resolves.toMatchObject([
      { id: "site-1", name: "정문", worksite_name: "본사" },
    ]);
    expect(sitesQuery.ilike).toHaveBeenCalledWith("name", "%정%");
  });

  it("saves an inspection log with canonical site and worksite data", async () => {
    const payload = buildInspectionQrPayload({
      id: "site-1",
      worksite_id: "work-wrong",
      worksite_name: "조작",
      name: "조작",
      gps_info: { latitude: 1, longitude: 1 },
    });
    const siteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "site-1",
          worksite_id: "work-1",
          name: "정문",
          gps_info: { latitude: 37.5, longitude: 127 },
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "work-1", name: "본사" },
        error: null,
      }),
    };
    const insertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "log-1", site_name: "정문" },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValueOnce(siteQuery).mockReturnValueOnce(worksiteQuery).mockReturnValueOnce(insertQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      createInspectionLog({
        employeeId: "emp-1",
        employeeName: "홍길동",
        qrPayload: JSON.stringify(payload),
      }),
    ).resolves.toMatchObject({ id: "log-1" });
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        inspection_site_id: "site-1",
        worksite_id: "work-1",
        employee_id: "emp-1",
        employee_name: "홍길동",
        worksite_name: "본사",
        site_name: "정문",
        site_gps_info: { latitude: 37.5, longitude: 127 },
      }),
    );
  });

  it("filters inspection logs by worksite", async () => {
    const logsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "log-1", worksite_id: "work-1", site_name: "정문", employee_name: "홍길동" }],
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(logsQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(listInspectionLogs({ worksiteId: "work-1" })).resolves.toHaveLength(1);
    expect(logsQuery.eq).toHaveBeenCalledWith("worksite_id", "work-1");
  });
});
