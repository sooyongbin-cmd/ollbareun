import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import {
  defaultKakaoOpenGraphMetadata,
  getKakaoOpenGraphMetadata,
} from "./system-configs";

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

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
