import nodemailer from "nodemailer";
import { getSystemConfigContent } from "./system-configs";
import { getSupabaseAdmin } from "./supabase-admin";

const STORAGE_BUCKET = "special-remarks";
const MAX_PHOTO_BYTES = 500 * 1024;
const MAX_PHOTOS_PER_REPORT = 6;
const PHOTO_SIGNED_URL_EXPIRES_IN = 60 * 60;
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mojzkwbp";

type EmailProvider = "resend" | "formspree" | "naver";

export type SpecialRemarkReportRow = {
  id: string;
  worksite_id: string | null;
  employee_id: string | null;
  employee_name: string;
  worksite_name: string;
  content: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
  email_to: string | null;
  email_status: "pending" | "sent" | "failed" | "not_requested";
  email_sent_at: string | null;
  email_error: string | null;
  processing_status?: "Y" | "N";
  reported_at: string;
  gps_info: { latitude: number; longitude: number } | null;
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

function parseDataUrl(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("첨부사진 형식이 올바르지 않습니다.");
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];

  return {
    mimeType,
    extension,
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function uploadPhoto(input: {
  employeeId: string;
  photoDataUrl: unknown;
}) {
  const parsed = parseDataUrl(input.photoDataUrl);
  if (!parsed) {
    return null;
  }

  if (parsed.buffer.length > MAX_PHOTO_BYTES) {
    throw new Error("첨부사진은 500KB 이하만 업로드할 수 있습니다.");
  }

  const supabase = getSupabaseAdmin();
  await ensureSpecialRemarkBucket();
  const path = `${input.employeeId}/${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.mimeType,
    upsert: false,
  });
  throwIfError(error);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function ensureSpecialRemarkBucket() {
  const storage = getSupabaseAdmin().storage;
  const { data: bucket, error: bucketError } = await storage.getBucket(STORAGE_BUCKET);

  if (!bucketError && bucket) {
    if (!bucket.public) {
      const { error: updateError } = await storage.updateBucket(STORAGE_BUCKET, { public: true });
      throwIfError(updateError);
    }
    return;
  }

  const { error: createError } = await storage.createBucket(STORAGE_BUCKET, { public: true });
  if (!createError) {
    return;
  }

  // A concurrent request may have created the bucket between getBucket and createBucket.
  const { data: existingBucket, error: existingBucketError } = await storage.getBucket(STORAGE_BUCKET);
  if (existingBucketError || !existingBucket) {
    throwIfError(createError);
    throwIfError(existingBucketError);
    throw new Error("특이사항 첨부사진 저장소를 확인하지 못했습니다.");
  }

  if (!existingBucket.public) {
    const { error: updateError } = await storage.updateBucket(STORAGE_BUCKET, { public: true });
    throwIfError(updateError);
  }
}

function getPhotoUrls(report: Pick<SpecialRemarkReportRow, "photo_url" | "photo_urls">) {
  const photoUrls = Array.isArray(report.photo_urls)
    ? report.photo_urls.filter((photoUrl): photoUrl is string => typeof photoUrl === "string" && photoUrl.trim() !== "")
    : [];

  if (photoUrls.length > 0) {
    return photoUrls;
  }

  return report.photo_url ? [report.photo_url] : [];
}

function normalizeReportPhotoUrls(report: SpecialRemarkReportRow) {
  const photoUrls = getPhotoUrls(report);
  return {
    ...report,
    photo_url: report.photo_url ?? photoUrls[0] ?? null,
    photo_urls: photoUrls,
  };
}

function getPhotoDataUrls(input: { photoDataUrl?: unknown; photoDataUrls?: unknown }) {
  if (Array.isArray(input.photoDataUrls)) {
    if (input.photoDataUrls.length > MAX_PHOTOS_PER_REPORT) {
      throw new Error(`첨부사진은 최대 ${MAX_PHOTOS_PER_REPORT}장까지 업로드할 수 있습니다.`);
    }
    return input.photoDataUrls;
  }

  return input.photoDataUrl === undefined ? [] : [input.photoDataUrl];
}

function formatKstDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(input: {
  employeeName: string;
  reportedAt: string;
  content: string;
  photoUrls: string[];
  gpsInfo: { latitude: number; longitude: number } | null;
}) {
  const employeeName = escapeHtml(input.employeeName);
  const content = escapeHtml(input.content);
  const photoMarkup = input.photoUrls.length > 0
    ? `<p>첨부사진 :</p>${input.photoUrls
        .map((photoUrl) => {
          const escapedPhotoUrl = escapeHtml(photoUrl);
          return `<p><a href="${escapedPhotoUrl}">${escapedPhotoUrl}</a></p><p><img src="${escapedPhotoUrl}" alt="첨부사진" style="max-width: 640px; width: 100%; height: auto;" /></p>`;
        })
        .join("")}`
    : "<p>첨부사진 : 없음</p>";
  const gpsMarkup = input.gpsInfo
    ? `<p>보고 위치 (GPS) : ${input.gpsInfo.latitude.toFixed(6)}, ${input.gpsInfo.longitude.toFixed(6)}</p>`
    : "<p>보고 위치 (GPS) : 기록 없음</p>";

  return `
    <h1>특이사항보고</h1>
    <p>현장점검자 : ${employeeName}</p>
    <p>점검일시 : ${formatKstDateTime(input.reportedAt)}</p>
    ${gpsMarkup}
    <p>특이사항 내용 :</p>
    <p style="white-space: pre-wrap;">${content}</p>
    ${photoMarkup}
  `;
}

async function sendRemarkEmail(input: {
  to: string;
  employeeName: string;
  worksiteName: string;
  reportedAt: string;
  content: string;
  photoUrls: string[];
  gpsInfo: { latitude: number; longitude: number } | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Resend 환경변수가 설정되지 않았습니다.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "특이사항보고",
      html: buildEmailHtml(input),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "이메일 발송에 실패했습니다.";
    throw new Error(message);
  }
}

function buildFormspreeMessage(input: {
  employeeName: string;
  worksiteName: string;
  reportedAt: string;
  content: string;
  photoUrls: string[];
  gpsInfo: { latitude: number; longitude: number } | null;
}) {
  const gpsString = input.gpsInfo
    ? `${input.gpsInfo.latitude.toFixed(6)}, ${input.gpsInfo.longitude.toFixed(6)}`
    : "기록 없음";
  return [
    "특이사항보고",
    "",
    `현장관리자: ${input.employeeName}`,
    `근무지: ${input.worksiteName}`,
    `보고일시: ${formatKstDateTime(input.reportedAt)}`,
    `보고위치 (GPS): ${gpsString}`,
    "",
    "특이사항 내용:",
    input.content,
    "",
    `첨부사진:\n${input.photoUrls.length > 0 ? input.photoUrls.join("\n") : "없음"}`,
  ].join("\n");
}

function getFormspreeErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Formspree 이메일 발송에 실패했습니다.";
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("errors" in payload && Array.isArray(payload.errors)) {
    const message = payload.errors
      .map((error) => {
        if (error && typeof error === "object" && "message" in error) {
          return String(error.message);
        }
        return "";
      })
      .find(Boolean);

    if (message) {
      return message;
    }
  }

  return "Formspree 이메일 발송에 실패했습니다.";
}

async function sendRemarkEmailWithFormspree(input: {
  to: string;
  employeeName: string;
  worksiteName: string;
  reportedAt: string;
  content: string;
  photoUrls: string[];
  gpsInfo: { latitude: number; longitude: number } | null;
}) {
  const response = await fetch(FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      _subject: "특이사항보고",
      message: buildFormspreeMessage({
        employeeName: input.employeeName,
        worksiteName: input.worksiteName,
        reportedAt: input.reportedAt,
        content: input.content,
        photoUrls: input.photoUrls,
        gpsInfo: input.gpsInfo,
      }),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(getFormspreeErrorMessage(payload));
  }
}

function getNaverSmtpPort() {
  const rawPort = process.env.NAVER_SMTP_PORT;
  const port = Number(rawPort);

  if (!rawPort || !Number.isInteger(port) || port <= 0) {
    throw new Error("NAVER_SMTP_PORT 환경변수가 올바르지 않습니다.");
  }

  return port;
}

async function sendRemarkEmailWithNaver(input: {
  to: string;
  employeeName: string;
  worksiteName: string;
  reportedAt: string;
  content: string;
  photoUrls: string[];
  gpsInfo: { latitude: number; longitude: number } | null;
}) {
  const user = process.env.NAVER_SMTP_USER;
  const password = process.env.NAVER_SMTP_PASSWORD;

  if (!user || !password) {
    throw new Error("NAVER SMTP 환경변수가 설정되지 않았습니다.");
  }

  const port = getNaverSmtpPort();
  const transporter = nodemailer.createTransport({
    host: "smtp.naver.com",
    port,
    secure: port === 465,
    auth: {
      user,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: process.env.NAVER_SMTP_FROM || user,
    to: input.to,
    subject: "특이사항보고",
    html: buildEmailHtml(input),
  });
}

export async function createSpecialRemarkReport(input: {
  employeeId: unknown;
  employeeName: unknown;
  worksiteId: unknown;
  worksiteName: unknown;
  content: unknown;
  photoDataUrl?: unknown;
  photoDataUrls?: unknown;
  gpsInfo?: unknown;
}, options: { emailProvider?: EmailProvider; sendEmail?: boolean } = {}) {
  const employee_id = requireString(input.employeeId, "현장점검자");
  const employee_name = requireString(input.employeeName, "현장점검자명");
  const worksite_id = optionalString(input.worksiteId);
  const worksite_name = requireString(input.worksiteName, "근무지");
  const content = requireString(input.content, "특이사항 내용");
  const shouldSendEmail = options.sendEmail !== false;
  const email_to = shouldSendEmail ? await getSystemConfigContent("manager_email") : null;
  const photoDataUrls = getPhotoDataUrls(input);
  const photo_urls = await Promise.all(
    photoDataUrls.map((photoDataUrl) => uploadPhoto({ employeeId: employee_id, photoDataUrl })),
  ).then((photoUrls) => photoUrls.filter((photoUrl): photoUrl is string => Boolean(photoUrl)));
  const photo_url = photo_urls[0] ?? null;
  const reported_at = new Date().toISOString();

  let gps_info = null;
  if (input.gpsInfo && typeof input.gpsInfo === "object") {
    const rawGps = input.gpsInfo as { latitude?: unknown; longitude?: unknown };
    if (typeof rawGps.latitude === "number" && typeof rawGps.longitude === "number") {
      gps_info = {
        latitude: rawGps.latitude,
        longitude: rawGps.longitude,
      };
    }
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("inspection_special_reports")
    .insert({
      worksite_id,
      employee_id,
      employee_name,
      worksite_name,
      content,
      photo_url,
      photo_urls,
      email_to,
      email_status: shouldSendEmail ? "pending" : "not_requested",
      reported_at,
      gps_info,
    })
    .select("*")
    .single();

  throwIfError(error);
  const report = normalizeReportPhotoUrls(data as SpecialRemarkReportRow);

  if (!shouldSendEmail) {
    return report;
  }

  return sendSpecialRemarkReportEmail(report, options.emailProvider);
}

export async function sendSpecialRemarkReportEmail(report: SpecialRemarkReportRow, emailProvider: EmailProvider = "resend") {
  const supabase = getSupabaseAdmin();
  try {
    const emailTo = report.email_to ?? await getSystemConfigContent("manager_email");
    if (getPhotoUrls(report).length > 0) {
      await ensureSpecialRemarkBucket();
    }
    const emailInput = {
      to: emailTo,
      employeeName: report.employee_name,
      worksiteName: report.worksite_name,
      reportedAt: report.reported_at,
      content: report.content,
      photoUrls: getPhotoUrls(report),
      gpsInfo: report.gps_info,
    };

    if (emailProvider === "formspree") {
      await sendRemarkEmailWithFormspree(emailInput);
    } else if (emailProvider === "naver") {
      await sendRemarkEmailWithNaver(emailInput);
    } else {
      await sendRemarkEmail(emailInput);
    }

    const { data: updated, error: updateError } = await supabase
      .from("inspection_special_reports")
      .update({
        email_to: emailTo,
        email_status: "sent",
        email_sent_at: new Date().toISOString(),
        email_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .select("*")
      .single();

    throwIfError(updateError);
    return normalizeReportPhotoUrls(updated as SpecialRemarkReportRow);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : "이메일 발송에 실패했습니다.";
    await supabase
      .from("inspection_special_reports")
      .update({
        email_status: "failed",
        email_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    throw new Error(message);
  }
}

export async function listSpecialRemarkReports(input: { year?: unknown } = {}) {
  const year = typeof input.year === "string" ? input.year.trim() : "";
  const supabase = getSupabaseAdmin();
  let query = supabase.from("inspection_special_reports").select("*").order("reported_at", { ascending: false });

  if (year) {
    if (!/^\d{4}$/.test(year)) {
      throw new Error("조회연도는 4자리 숫자로 입력하세요.");
    }
    query = query.gte("reported_at", `${year}-01-01T00:00:00+09:00`).lt("reported_at", `${Number(year) + 1}-01-01T00:00:00+09:00`);
  }

  const { data, error } = await query;
  throwIfError(error);
  return Promise.all((data ?? []).map((report) => withSignedPhotoUrls(report as SpecialRemarkReportRow)));
}

export async function completeSpecialRemarkReport(idInput: unknown) {
  const id = requireString(idInput, "특이사항 보고");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("inspection_special_reports")
    .update({ processing_status: "Y", updated_at: new Date().toISOString() })
    .eq("id", id).select("*").single();
  throwIfError(error);
  return withSignedPhotoUrls(data as SpecialRemarkReportRow);
}

async function getSpecialRemarkReportRecord(idInput: unknown) {
  const id = requireString(idInput, "특이사항 보고");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("inspection_special_reports").select("*").eq("id", id).single();

  throwIfError(error);
  return data as SpecialRemarkReportRow;
}

export async function getSpecialRemarkReport(idInput: unknown) {
  return withSignedPhotoUrls(await getSpecialRemarkReportRecord(idInput));
}

export function getSpecialRemarkStoragePathFromPublicUrl(photoUrl: string | null | undefined) {
  if (!photoUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(photoUrl.slice(markerIndex + marker.length));
}

async function withSignedPhotoUrls(report: SpecialRemarkReportRow) {
  const normalizedReport = normalizeReportPhotoUrls(report);
  const signedPhotoUrls = await Promise.all(
    (normalizedReport.photo_urls ?? []).map(async (photoUrl) => {
      const storagePath = getSpecialRemarkStoragePathFromPublicUrl(photoUrl);
      if (!storagePath) {
        return photoUrl;
      }

      const { data, error } = await getSupabaseAdmin().storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, PHOTO_SIGNED_URL_EXPIRES_IN);
      throwIfError(error);
      return data?.signedUrl ?? photoUrl;
    }),
  );

  return {
    ...normalizedReport,
    photo_url: signedPhotoUrls[0] ?? null,
    photo_urls: signedPhotoUrls,
  };
}

export async function deleteSpecialRemarkReport(idInput: unknown) {
  const id = requireString(idInput, "특이사항 보고");
  const supabase = getSupabaseAdmin();
  const report = await getSpecialRemarkReportRecord(id);
  const storagePaths = getPhotoUrls(report)
    .map((photoUrl) => getSpecialRemarkStoragePathFromPublicUrl(photoUrl))
    .filter((storagePath): storagePath is string => Boolean(storagePath));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    throwIfError(storageError);
  }

  const { error } = await supabase.from("inspection_special_reports").delete().eq("id", id);
  throwIfError(error);
}
