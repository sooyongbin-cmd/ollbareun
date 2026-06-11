import { getSupabaseAdmin } from "./supabase-admin";

export type SystemConfigRow = {
  system_code: string;
  parent_system_code: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
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
    .select("system_code,parent_system_code,content,created_at,updated_at")
    .order("system_code", { ascending: true });

  throwIfError(error);
  return (data ?? []) as SystemConfigRow[];
}

export async function getSystemConfig(systemCodeInput: unknown) {
  const systemCode = requireString(systemCodeInput, "시스템코드");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .select("system_code,parent_system_code,content,created_at,updated_at")
    .eq("system_code", systemCode)
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function getSystemConfigContent(systemCodeInput: unknown) {
  return (await getSystemConfig(systemCodeInput)).content;
}

export async function createSystemConfig(input: {
  systemCode: unknown;
  parentSystemCode?: unknown;
  content: unknown;
}) {
  const system_code = requireString(input.systemCode, "시스템코드");
  const parent_system_code = optionalString(input.parentSystemCode);
  const content = requireString(input.content, "내용");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .insert({
      system_code,
      parent_system_code,
      content,
    })
    .select("system_code,parent_system_code,content,created_at,updated_at")
    .single();

  throwIfError(error);
  return data as SystemConfigRow;
}

export async function updateSystemConfig(input: {
  systemCode: unknown;
  parentSystemCode?: unknown;
  content: unknown;
}) {
  const system_code = requireString(input.systemCode, "시스템코드");
  const parent_system_code = optionalString(input.parentSystemCode);
  const content = requireString(input.content, "내용");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("system_configs")
    .update({
      parent_system_code,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("system_code", system_code)
    .select("system_code,parent_system_code,content,created_at,updated_at")
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
