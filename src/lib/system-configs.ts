import { getSupabaseAdmin } from "./supabase-admin";

export type SystemConfigRow = {
  system_code: string;
  parent_system_code: string | null;
  description: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
};

const systemConfigSelect = "system_code,parent_system_code,description,content,created_at,updated_at";

export const defaultKakaoOpenGraphMetadata = {
  title: "올바름 | 프리미엄 시설관리 전문기업",
  description:
    "사람을 향한 신뢰, 공간을 채우는 투명함. 체계적인 교육과 철저한 현장관리로 깨끗하고 안전한 공간을 만듭니다.",
};

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을 입력하세요.`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function throwIfError(error: { message?: string; hint?: string; code?: string } | null) {
  if (error) {
    throw new Error(error.message?.trim() || error.hint?.trim() || error.code?.trim() || "Supabase 요청에 실패했습니다.");
  }
}

export async function listSystemConfigs() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select(systemConfigSelect)
    .order("system_code", { ascending: true });

  throwIfError(error);
  return (data ?? []) as SystemConfigRow[];
}

export async function getSystemConfig(systemCodeInput: unknown) {
  const systemCode = requireString(systemCodeInput, "시스템코드");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select(systemConfigSelect)
    .eq("system_code", systemCode)
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function getSystemConfigContent(systemCodeInput: unknown) {
  return (await getSystemConfig(systemCodeInput)).content;
}

export async function getKakaoOpenGraphMetadata() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select("system_code,content")
    .in("system_code", ["kakao_og_title", "kakao_og_description"]);

  throwIfError(error);

  const configs = new Map(
    (data ?? []).map((config) => [config.system_code, config.content.trim()]),
  );

  return {
    title: configs.get("kakao_og_title") || defaultKakaoOpenGraphMetadata.title,
    description:
      configs.get("kakao_og_description") || defaultKakaoOpenGraphMetadata.description,
  };
}

export async function createSystemConfig(input: {
  systemCode: unknown;
  parentSystemCode?: unknown;
  description?: unknown;
  content: unknown;
}) {
  const system_code = requireString(input.systemCode, "시스템코드");
  const parent_system_code = optionalString(input.parentSystemCode);
  const description = optionalString(input.description);
  const content = requireString(input.content, "내용");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .insert({
      system_code,
      parent_system_code,
      description,
      content,
    })
    .select(systemConfigSelect)
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function updateSystemConfig(input: {
  systemCode: unknown;
  parentSystemCode?: unknown;
  description?: unknown;
  content: unknown;
}) {
  const system_code = requireString(input.systemCode, "시스템코드");
  const parent_system_code = optionalString(input.parentSystemCode);
  const description = optionalString(input.description);
  const content = requireString(input.content, "내용");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .update({
      parent_system_code,
      description,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("system_code", system_code)
    .select(systemConfigSelect)
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function deleteSystemConfig(systemCodeInput: unknown) {
  const systemCode = requireString(systemCodeInput, "시스템코드");
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("system_configs").delete().eq("system_code", systemCode);
  throwIfError(error);
}
