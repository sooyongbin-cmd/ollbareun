import { readAllEducationRows } from "./education-completions";
import { educationTypes, requireEducationType, type EducationType } from "./education-periods";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  created_at: string;
  education_type: EducationType;
};

const databaseEducationTypes: Record<EducationType, string> = {
  daily: "일일",
  monthly: "월간",
  quarterly: "분기",
  semiannual: "반기",
};
const educationTypesByDatabaseValue = Object.fromEntries(
  Object.entries(databaseEducationTypes).map(([type, label]) => [label, type]),
) as Record<string, EducationType>;

function toEducationResourceRow(row: Omit<EducationResourceRow, "education_type"> & { education_type: string }): EducationResourceRow {
  const educationType = educationTypesByDatabaseValue[row.education_type]
    ?? (educationTypes.includes(row.education_type as EducationType) ? row.education_type as EducationType : null);
  if (!educationType) throw new Error("안전교육구분을 확인할 수 없습니다.");
  return { ...row, education_type: educationType };
}

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
  const resources = await readAllEducationRows<Omit<EducationResourceRow, "education_type"> & { education_type: string }>((from, to) => supabase
    .from("education_resources").select("id,title,youtube_link,created_at,education_type")
    .order("created_at", { ascending: false }).order("id").range(from, to));
  return resources.map(toEducationResourceRow);
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
  return toEducationResourceRow(data as Omit<EducationResourceRow, "education_type"> & { education_type: string });
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
      education_type: databaseEducationTypes[educationType],
    })
    .select("id,title,youtube_link,created_at,education_type")
    .single();

  throwIfError(error);
  return toEducationResourceRow(data as Omit<EducationResourceRow, "education_type"> & { education_type: string });
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
      education_type: databaseEducationTypes[educationType],
    })
    .eq("id", id)
    .select("id,title,youtube_link,created_at,education_type")
    .single();

  throwIfError(error);
  return toEducationResourceRow(data as Omit<EducationResourceRow, "education_type"> & { education_type: string });
}

export async function deleteEducationResource(
  resourceId: unknown,
  supabase: SupabaseClient = getSupabase(),
) {
  const id = requireString(resourceId, "교육자료 ID");
  const { error } = await supabase.from("education_resources").delete().eq("id", id);

  throwIfError(error);
}
