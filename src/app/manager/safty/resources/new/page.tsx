"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const SAVE_TIMEOUT_MS = 70_000;

async function postResource(formData: FormData) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

  const response = await fetch("/api/education/resources", {
    method: "POST",
    body: formData,
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeoutId));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "교재를 저장하지 못했습니다.");
  }

  return payload;
}

export default function EducationResourceNewPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");

    const sourceFormData = new FormData(event.currentTarget);
    const title = String(sourceFormData.get("title") ?? "").trim();
    const youtubeLink = String(sourceFormData.get("youtubeLink") ?? "").trim();

    if (!title) {
      setError("제목을 입력하세요.");
      return;
    }

    if (!youtubeLink) {
      setError("유튜브 링크를 입력하세요.");
      return;
    }

    try {
      const url = new URL(youtubeLink);
      const hostname = url.hostname.toLowerCase();

      if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname)) {
        setError("유튜브 링크만 등록할 수 있습니다.");
        return;
      }
    } catch {
      setError("올바른 유튜브 링크를 입력하세요.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("youtubeLink", youtubeLink);

    try {
      setIsSubmitting(true);
      await postResource(formData);
      window.alert("자료를 저장하였습니다.");
      router.push("/manager/safty/resources");
    } catch (submitError) {
      if (submitError instanceof DOMException && submitError.name === "AbortError") {
        setError("저장 요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.");
      } else {
        setError(submitError instanceof Error ? submitError.message : "교재를 저장하지 못했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">교재등록</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          안전교육 교재 제목과 유튜브 링크를 등록합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="resource-title">
                제목
              </label>
              <input
                className="field"
                id="resource-title"
                name="title"
                placeholder="교육자료 제목을 입력하세요."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="resource-youtube-link">
                유튜브 링크
              </label>
              <input
                className="field"
                id="resource-youtube-link"
                name="youtubeLink"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                type="url"
              />
            </div>
          </div>

          <button className="button-primary w-full md:w-auto" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
        </form>

        {isSubmitting ? <p className="status-ok mt-6 text-center">유튜브 링크를 저장 중입니다.</p> : null}
        {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
      </section>
    </section>
  );
}
