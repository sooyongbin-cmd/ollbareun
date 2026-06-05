export const MAX_CLOUDFLARE_UPLOAD_BYTES = 200 * 1024 * 1024;
const CLOUDFLARE_STREAM_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const DIRECT_UPLOAD_MAX_DURATION_SECONDS = 3600;

export type CloudflareVideoRow = {
  uid: string;
  title: string;
  status: string;
  pctComplete: string | null;
  uploaded: string | null;
  size: number | null;
  duration: number | null;
  readyToStream: boolean;
};

type CloudflareApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
  messages?: Array<{ message?: string }>;
};

type CloudflareStreamVideo = {
  uid?: string;
  meta?: {
    name?: string;
  };
  status?: {
    state?: string;
    pctComplete?: string;
  };
  uploaded?: string;
  size?: number;
  duration?: number;
  readyToStream?: boolean;
};

function getCloudflareConfig() {
  const accountId = process.env.cloudflare_account_id;
  const token = process.env.cloudflare_token;

  if (!accountId || !token) {
    throw new Error("Cloudflare 환경 변수가 설정되지 않았습니다.");
  }

  return { accountId, token };
}

function getCloudflareErrorMessage(payload: CloudflareApiEnvelope<unknown>, fallback: string) {
  const apiMessage =
    payload.errors?.map((error) => error.message?.trim()).find(Boolean) ??
    payload.messages?.map((message) => message.message?.trim()).find(Boolean);

  if (apiMessage?.includes("Authorization Failure")) {
    return "Cloudflare API 토큰에 Stream 권한이 없습니다. Cloudflare 대시보드에서 해당 Account 범위에 Stream Read와 Stream Edit 권한을 추가하세요.";
  }

  return apiMessage ?? fallback;
}

async function requestCloudflare<T>(path: string, init?: RequestInit) {
  const { accountId, token } = getCloudflareConfig();
  const response = await fetch(`${CLOUDFLARE_STREAM_API_BASE}/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as CloudflareApiEnvelope<T>;

  if (!response.ok || payload.success === false) {
    throw new Error(getCloudflareErrorMessage(payload, "Cloudflare 요청에 실패했습니다."));
  }

  return payload.result as T;
}

function normalizeCloudflareVideo(video: CloudflareStreamVideo): CloudflareVideoRow {
  const uid = typeof video.uid === "string" && video.uid.trim() ? video.uid.trim() : "";
  const title = video.meta?.name?.trim() || uid;

  return {
    uid,
    title,
    status: video.status?.state ?? "unknown",
    pctComplete: video.status?.pctComplete ?? null,
    uploaded: video.uploaded ?? null,
    size: typeof video.size === "number" ? video.size : null,
    duration: typeof video.duration === "number" ? video.duration : null,
    readyToStream: Boolean(video.readyToStream),
  };
}

function requireFileName(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("파일명을 확인할 수 없습니다.");
  }

  return value.trim();
}

function requireFileSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("파일 크기를 확인할 수 없습니다.");
  }

  if (value > MAX_CLOUDFLARE_UPLOAD_BYTES) {
    throw new Error("200MB 이하의 동영상 파일만 업로드할 수 있습니다.");
  }

  return value;
}

export async function listCloudflareVideos() {
  const result = await requestCloudflare<CloudflareStreamVideo[]>("/stream");
  return (result ?? []).map(normalizeCloudflareVideo).filter((video) => video.uid);
}

export async function getCloudflareVideoByUid(uid: unknown) {
  const videoUid = requireFileName(uid);
  const result = await requestCloudflare<CloudflareStreamVideo>(`/stream/${encodeURIComponent(videoUid)}`);
  return normalizeCloudflareVideo(result ?? { uid: videoUid });
}

export async function createCloudflareDirectUpload(input: { fileName: unknown; fileSize: unknown }) {
  const fileName = requireFileName(input.fileName);
  requireFileSize(input.fileSize);

  const result = await requestCloudflare<{ uid?: string; uploadURL?: string }>("/stream/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds: DIRECT_UPLOAD_MAX_DURATION_SECONDS,
      meta: { name: fileName },
    }),
  });

  if (!result?.uid || !result.uploadURL) {
    throw new Error("Cloudflare 업로드 URL을 생성하지 못했습니다.");
  }

  return {
    uid: result.uid,
    uploadURL: result.uploadURL,
    maxUploadBytes: MAX_CLOUDFLARE_UPLOAD_BYTES,
  };
}
