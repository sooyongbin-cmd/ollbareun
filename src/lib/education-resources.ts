import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  duration_seconds: number | null;
  created_at: string;
};

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을 입력하세요.`);
  }

  return value.trim();
}

function requireYoutubeLink(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("유튜브 링크를 입력하세요.");
  }

  const youtubeLink = value.trim();

  let url: URL;

  try {
    url = new URL(youtubeLink);
  } catch {
    throw new Error("올바른 유튜브 링크를 입력하세요.");
  }

  const hostname = url.hostname.toLowerCase();

  if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname)) {
    throw new Error("유튜브 링크만 등록할 수 있습니다.");
  }

  return youtubeLink;
}

function requireDurationSeconds(value: unknown) {
  const durationSeconds = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(durationSeconds) || durationSeconds < 0) {
    throw new Error("유튜브 동영상 길이 정보를 확인할 수 없습니다.");
  }

  return durationSeconds;
}

function throwIfError(error: { message?: string; hint?: string; code?: string } | null) {
  if (error) {
    const message =
      error.message?.trim() ||
      error.hint?.trim() ||
      error.code?.trim() ||
      "Supabase 요청에 실패했습니다. 네트워크 상태와 테이블 생성 여부를 확인하세요.";
    throw new Error(message);
  }
}

export async function listEducationResources(supabase: SupabaseClient = getSupabase()) {
  const { data, error } = await supabase
    .from("education_resources")
    .select("id,title,youtube_link,duration_seconds,created_at")
    .order("created_at", { ascending: false });

  throwIfError(error);
  return (data ?? []) as EducationResourceRow[];
}

export async function getEducationResourceById(
  resourceId: string,
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(resourceId, "교육자료 ID");
  const { data, error } = await supabase
    .from("education_resources")
    .select("id,title,youtube_link,duration_seconds,created_at")
    .eq("id", id)
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function createEducationResource(
  input: { title: unknown; youtubeLink: unknown; durationSeconds: unknown },
  supabase: SupabaseClient = getSupabase(),
) {
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);
  const durationSeconds = requireDurationSeconds(input.durationSeconds);

  const { data, error } = await supabase
    .from("education_resources")
    .insert({
      title,
      youtube_link: youtubeLink,
      duration_seconds: durationSeconds,
    })
    .select("id,title,youtube_link,duration_seconds,created_at")
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function updateEducationResource(
  input: { id: unknown; title: unknown; youtubeLink: unknown; durationSeconds?: unknown },
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(input.id, "교육자료 ID");
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);
  const durationSeconds = input.durationSeconds === undefined ? undefined : requireDurationSeconds(input.durationSeconds);

  const { data, error } = await supabase
    .from("education_resources")
    .update({
      title,
      youtube_link: youtubeLink,
      ...(durationSeconds === undefined ? {} : { duration_seconds: durationSeconds }),
    })
    .eq("id", id)
    .select("id,title,youtube_link,duration_seconds,created_at")
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function deleteEducationResource(
  resourceId: unknown,
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(resourceId, "교육자료 ID");
  const { error } = await supabase.from("education_resources").delete().eq("id", id);

  throwIfError(error);
}
