"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SaveIcon } from "@/components/icons/save-icon";

const MAX_CLOUDFLARE_UPLOAD_BYTES = 200 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120_000;

type DirectUploadResult = {
  uid: string;
  uploadURL: string;
  maxUploadBytes: number;
};

function validateVideoFile(file: File | null) {
  if (!file) {
    throw new Error("동영상 파일을 선택하세요.");
  }

  const hasVideoExtension = /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name);

  if (file.type && !file.type.startsWith("video/") && !hasVideoExtension) {
    throw new Error("동영상 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_CLOUDFLARE_UPLOAD_BYTES) {
    throw new Error("200MB 이하의 동영상 파일만 업로드할 수 있습니다.");
  }

  return file;
}

async function requestDirectUpload(file: File) {
  const response = await fetch("/api/education/cloudflare/direct-upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Cloudflare 업로드 URL을 생성하지 못했습니다.");
  }

  return payload.directUpload as DirectUploadResult;
}

async function uploadToCloudflare(file: File, uploadURL: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(uploadURL, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error("Cloudflare 동영상 업로드에 실패했습니다.");
  }
}

export default function CloudflareVideoNewPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUid, setUploadedUid] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    setError("");
    setUploadedUid("");

    try {
      const file = validateVideoFile(selectedFile);

      setIsUploading(true);
      const directUpload = await requestDirectUpload(file);
      await uploadToCloudflare(file, directUpload.uploadURL);
      setUploadedUid(directUpload.uid);
    } catch (submitError) {
      if (submitError instanceof DOMException && submitError.name === "AbortError") {
        setError("업로드 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도하세요.");
      } else {
        setError(submitError instanceof Error ? submitError.message : "동영상을 업로드하지 못했습니다.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">(cloudflare)등록화면</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          로컬 PC의 동영상 파일을 Cloudflare Stream으로 업로드합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="cloudflare-video-file">
              동영상 파일
            </label>
            <input
              accept="video/*"
              className="field"
              id="cloudflare-video-file"
              name="videoFile"
              onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
              required
              type="file"
            />
            <p className="text-[13px] text-ink-muted-48">200MB 이하 동영상 파일을 업로드할 수 있습니다.</p>
          </div>

          <button
            className="button-primary w-full md:w-auto disabled:opacity-50 gap-2"
            type="submit"
            disabled={isUploading}
          >
            <SaveIcon size={20} />
            <span>업로드</span>
          </button>
        </form>

        {isUploading ? <p className="status-ok mt-6 text-center">Cloudflare로 업로드 중입니다.</p> : null}
        {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
        {uploadedUid ? (
          <div className="mt-6 rounded-[16px] border border-hairline bg-canvas p-5">
            <p className="status-ok">업로드가 완료되었습니다. Cloudflare에서 처리 중일 수 있습니다.</p>
            <dl className="mt-4 grid gap-2 text-[14px]">
              <div className="flex flex-wrap gap-2">
                <dt className="font-semibold text-ink-muted-48">UID</dt>
                <dd className="font-semibold text-ink">{uploadedUid}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="text-primary font-semibold hover:underline" href="/manager/safty/cloudflare">
                목록으로 이동
              </Link>
              <Link
                className="text-primary font-semibold hover:underline"
                href={`/manager/safty/cloudflare/watch/${uploadedUid}`}
              >
                시청 화면으로 이동
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
