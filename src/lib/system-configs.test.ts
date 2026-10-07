import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import {
  defaultKakaoOpenGraphMetadata,
  getKakaoOpenGraphMetadata,
  isSystemConfigEnabled,
  updateSystemConfig,
} from "./system-configs";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("education reminder delay setting", () => {
  it.each(["0", "7", "45"])("saves valid delay %s minutes", async (content) => {
    const single = vi.fn().mockResolvedValue({ data: { system_code: "S000001", content }, error: null });
    const update = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ update })) } as never);
    await expect(updateSystemConfig({ systemCode: "S000001", content })).resolves.toMatchObject({ content });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ content }));
  });

  it("preserves text values for other system settings", async () => {
    const single = vi.fn().mockResolvedValue({ data: { content: "admin@example.com" }, error: null });
    const update = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ update })) } as never);
    await expect(updateSystemConfig({ systemCode: "manager_email", content: "admin@example.com" })).resolves.toMatchObject({ content: "admin@example.com" });
  });

  it.each(["-1", "1.5", "abc", "2147483648"])("rejects invalid minutes %s before writing", async (content) => {
    const from = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await expect(updateSystemConfig({ systemCode: "S000001", content })).rejects.toThrow("0 이상의 정수");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("Kakao Open Graph system configs", () => {
  const inFilter = vi.fn();
  const select = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  });

  it("loads the configured title and description by their system codes", async () => {
    inFilter.mockResolvedValue({
      data: [
        { system_code: "kakao_og_title", content: "  카카오 제목  " },
        { system_code: "kakao_og_description", content: "  카카오 설명  " },
      ],
      error: null,
    });

    await expect(getKakaoOpenGraphMetadata()).resolves.toEqual({
      title: "카카오 제목",
      description: "카카오 설명",
    });
    expect(from).toHaveBeenCalledWith("system_configs");
    expect(select).toHaveBeenCalledWith("system_code,content");
    expect(inFilter).toHaveBeenCalledWith("system_code", [
      "kakao_og_title",
      "kakao_og_description",
    ]);
  });

  it("uses the current metadata defaults when either config is missing", async () => {
    inFilter.mockResolvedValue({
      data: [{ system_code: "kakao_og_title", content: "카카오 제목" }],
      error: null,
    });

    await expect(getKakaoOpenGraphMetadata()).resolves.toEqual({
      title: "카카오 제목",
      description: defaultKakaoOpenGraphMetadata.description,
    });
  });
});

describe("listSystemConfigs", () => {
  it("orders system configs by description ascending", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          system_code: "manager_email",
          parent_system_code: null,
          description: "관리자 알림 이메일 주소",
          content: "admin@example.com",
        },
      ],
      error: null,
    });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const { listSystemConfigs } = await import("./system-configs");
    const result = await listSystemConfigs();

    expect(result).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("system_configs");
    expect(order).toHaveBeenCalledWith("description", { ascending: true });
  });
});

describe("isSystemConfigEnabled", () => {
  it("returns true only when the setting is Y, ignoring whitespace and case", async () => {
    const single = vi.fn().mockResolvedValue({ data: { content: " y " }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    await expect(isSystemConfigEnabled("test_feature_enabled")).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("system_configs");
    expect(eq).toHaveBeenCalledWith("system_code", "test_feature_enabled");
  });

  it("returns false for N or an unavailable setting", async () => {
    const single = vi.fn().mockResolvedValue({ data: { content: "N" }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await expect(isSystemConfigEnabled("system_log_002")).resolves.toBe(false);

    single.mockResolvedValue({ data: null, error: { message: "not found" } });
    await expect(isSystemConfigEnabled("system_log_002")).resolves.toBe(false);
  });
});
