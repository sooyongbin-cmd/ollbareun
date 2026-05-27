import { getSupabase } from "./supabase";

export type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
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

export async function listEducationResources() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("education_resources")
    .select("id,title,youtube_link,created_at")
    .order("created_at", { ascending: false });

  throwIfError(error);
  return (data ?? []) as EducationResourceRow[];
}

export async function getEducationResourceById(resourceId: string) {
  const id = requireString(resourceId, "교육자료 ID");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("education_resources")
    .select("id,title,youtube_link,created_at")
    .eq("id", id)
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function createEducationResource(input: { title: unknown; youtubeLink: unknown }) {
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("education_resources")
    .insert({
      title,
      youtube_link: youtubeLink,
    })
    .select("id,title,youtube_link,created_at")
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}

export async function updateEducationResource(input: { id: unknown; title: unknown; youtubeLink: unknown }) {
  const id = requireString(input.id, "교육자료 ID");
  const title = requireString(input.title, "제목");
  const youtubeLink = requireYoutubeLink(input.youtubeLink);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("education_resources")
    .update({
      title,
      youtube_link: youtubeLink,
    })
    .eq("id", id)
    .select("id,title,youtube_link,created_at")
    .single();

  throwIfError(error);
  return data as EducationResourceRow;
}
