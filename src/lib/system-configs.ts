import { getSupabaseAdmin } from "./supabase-admin";
import { isManagerThemeSystemCode } from "./manager-theme";

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

function requireServerStoredSystemCode(value: unknown) {
  const systemCode = requireString(value, "시스템코드");
  if (isManagerThemeSystemCode(systemCode)) {
    throw new Error("THEME_CODE는 이 브라우저에만 저장할 수 있습니다.");
  }
  return systemCode;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function throwIfError(error: { message?: string; hint?: string; code?: string; constraint?: string } | null) {
  if (error) {
    if (error.code === "23503" && error.constraint === "system_configs_parent_system_code_fkey") {
      throw new Error("등록되지 않은 상위시스템코드입니다. 등록된 시스템 코드 중에서 선택하세요.");
    }

    throw new Error(error.message?.trim() || error.hint?.trim() || error.code?.trim() || "Supabase 요청에 실패했습니다.");
  }
}

export async function listSystemConfigs() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select(systemConfigSelect)
    .order("description", { ascending: true });

  throwIfError(error);
  return ((data ?? []) as SystemConfigRow[]).map((config) =>
    isManagerThemeSystemCode(config.system_code) ? { ...config, content: "system" } : config,
  );
}

export async function getSystemConfig(systemCodeInput: unknown) {
  const systemCode = requireServerStoredSystemCode(systemCodeInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select(systemConfigSelect)
    .eq("system_code", systemCode)
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function getSystemConfigDescription(systemCodeInput: unknown) {
  const systemCode = requireString(systemCodeInput, "시스템코드");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select("description")
    .eq("system_code", systemCode)
    .maybeSingle();

  throwIfError(error);
  return data?.description ?? null;
}

export async function getSystemConfigContent(systemCodeInput: unknown) {
  return (await getSystemConfig(systemCodeInput)).content;
}

export async function isSystemConfigEnabled(systemCodeInput: unknown) {
  try {
    return (await getSystemConfigContent(systemCodeInput)).trim().toUpperCase() === "Y";
  } catch {
    return false;
  }
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
  parentSystemCode?: unknown;
  description?: unknown;
  content: unknown;
}) {
  const parent_system_code = optionalString(input.parentSystemCode);
  const description = optionalString(input.description);
  const content = requireString(input.content, "내용");
  const supabase = getSupabaseAdmin();

  // Allocate codes on the server so callers cannot choose or overwrite the code.
  // Re-read after a primary-key collision to handle two concurrent registrations.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing, error: lookupError } = await supabase
      .from("system_configs")
      .select("system_code")
      .like("system_code", "S______");

    throwIfError(lookupError);

    const latestSerial = ((existing ?? []) as Array<{ system_code: string }>).reduce(
      (latest, config) => {
        const match = /^S(\d{6})$/.exec(config.system_code);
        return match ? Math.max(latest, Number(match[1])) : latest;
      },
      0,
    );

    if (latestSerial >= 999999) {
      throw new Error("시스템코드 일련번호가 모두 사용되었습니다.");
    }

    const system_code = `S${String(latestSerial + 1).padStart(6, "0")}`;
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

    if (error?.code === "23505" && attempt < 4) {
      continue;
    }

    throwIfError(error);
    return data as SystemConfigRow;
  }

  throw new Error("시스템코드를 생성하지 못했습니다. 다시 시도하세요.");
}

export async function updateSystemConfig(input: {
  systemCode: unknown;
  parentSystemCode?: unknown;
  description?: unknown;
  content: unknown;
}) {
  const system_code = requireServerStoredSystemCode(input.systemCode);
  const parent_system_code = optionalString(input.parentSystemCode);
  const description = optionalString(input.description);
  const content = requireString(input.content, "내용");
  if (system_code === "S000001" && (!/^[0-9]{1,10}$/.test(content) || Number(content) > 2147483647)) {
    throw new Error("교육 알림 대기시간은 0 이상의 정수(분)로 입력하세요.");
  }
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
  const systemCode = requireServerStoredSystemCode(systemCodeInput);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("system_configs").delete().eq("system_code", systemCode);
  throwIfError(error);
}
