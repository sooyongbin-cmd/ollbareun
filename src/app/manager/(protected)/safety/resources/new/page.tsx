"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";
import { useYoutubeDuration } from "@/lib/youtube-duration";
import { formatYoutubeDuration } from "@/lib/youtube";

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
  const [alertMessage, setAlertMessage] = useState("");
  const router = useRouter();
  const [youtubeLink, setYoutubeLink] = useState("");
  const {
    durationSeconds,
    iframeSrc,
    onIframeLoad,
    setIframeRef,
    status: youtubeDurationStatus,
    videoId,
  } = useYoutubeDuration(youtubeLink);
  const hasYoutubeDuration = youtubeDurationStatus === "ready" && durationSeconds !== null;

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

    if (!hasYoutubeDuration) {
      setError("유튜브 동영상 길이를 확인한 뒤 저장하세요.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("youtubeLink", youtubeLink);
    formData.set("durationSeconds", String(durationSeconds));

    try {
      setIsSubmitting(true);
      await postResource(formData);
      setAlertMessage("자료를 저장하였습니다.");
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
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">교재등록</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[37.5rem]">
          안전교육 교재 제목과 유튜브 링크를 등록합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="resource-title">
                제목
              </label>
              <Input
                className="w-full"
                id="resource-title"
                name="title"
                placeholder="교육자료 제목을 입력하세요."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="resource-youtube-link">
                유튜브 링크
              </label>
              <Input
                className="w-full"
                id="resource-youtube-link"
                name="youtubeLink"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                type="url"
                value={youtubeLink}
                onChange={(event) => {
                  setYoutubeLink(event.target.value);
                  setError("");
                }}
              />
            </div>
          </div>

          {youtubeLink.trim() ? (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {youtubeDurationStatus === "loading"
                ? "유튜브 동영상 길이를 확인 중입니다."
                : youtubeDurationStatus === "ready"
                  ? `동영상 길이: ${formatYoutubeDuration(durationSeconds)}`
                  : "유튜브 동영상 길이를 확인하지 못했습니다. 링크를 확인해 주세요."}
            </p>
          ) : null}

          <Button
            aria-label="저장"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto disabled:opacity-50"
            type="submit"
            disabled={isSubmitting || !hasYoutubeDuration}
          >
            <SaveIcon size={20} />
          </Button>
        </form>

        {isSubmitting ? <p className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground mt-6 text-center">유튜브 링크를 저장 중입니다.</p> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      {videoId ? (
        <iframe
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
          ref={setIframeRef}
          src={iframeSrc}
          tabIndex={-1}
          title="유튜브 동영상 길이 확인"
          onLoad={onIframeLoad}
        />
      ) : null}

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/manager/safety/resources");
        }}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
