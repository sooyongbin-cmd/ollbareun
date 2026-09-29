import { readAllEducationRows } from "./education-completions";
import { requireEducationType, type EducationType } from "./education-periods";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  created_at: string;
  education_type: EducationType;
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
  return readAllEducationRows<EducationResourceRow>((from, to) => supabase
    .from("education_resources").select("id,title,youtube_link,created_at,education_type")
    .order("created_at", { ascending: false }).order("id").range(from, to));
}

export async function getEducationResourceById(
  resourceId: string,
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(resourceId, "교육자료 ID");
  const { data, error } = await supabase
    .from("education_resources")
    .select("id,title,youtube_link,created_at,education_type")
    .eq("id", id)
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function createEducationResource(
  input: { title: unknown; youtubeLink: unknown; educationType: unknown },
  supabase: SupabaseClient = getSupabase(),
) {
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);
  const educationType = requireEducationType(input.educationType);
  const { data, error } = await supabase
    .from("education_resources")
    .insert({
      title,
      youtube_link: youtubeLink,
      education_type: educationType,
    })
    .select("id,title,youtube_link,created_at,education_type")
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function updateEducationResource(
  input: { id: unknown; title: unknown; youtubeLink: unknown; educationType: unknown },
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(input.id, "교육자료 ID");
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);
  const educationType = requireEducationType(input.educationType);
  const { data, error } = await supabase
    .from("education_resources")
    .update({
      title,
      youtube_link: youtubeLink,
      education_type: educationType,
    })
    .eq("id", id)
    .select("id,title,youtube_link,created_at,education_type")
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
