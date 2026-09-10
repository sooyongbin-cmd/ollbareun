"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";

type EducationResource = {
  id: string;
  title: string;
  youtube_link: string;
};

type EducationResourceResponse = {
  resource: EducationResource;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "교육자료 정보를 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "교육자료를 삭제하지 못했습니다.");
  }
}

function getYoutubeLinkError(youtubeLink: string) {
  if (!youtubeLink) {
    return "유튜브 링크를 입력하세요.";
  }

  try {
    const url = new URL(youtubeLink);
    const hostname = url.hostname.toLowerCase();

    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname)) {
      return "유튜브 링크만 등록할 수 있습니다.";
    }
  } catch {
    return "올바른 유튜브 링크를 입력하세요.";
  }

  return "";
}

export default function EducationResourceSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const resourceId = params.id;
  const [title, setTitle] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [loading, setLoading] = useState(Boolean(resourceId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const routeError = resourceId ? error : "교육자료 정보를 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadResource() {
      try {
        const data = await fetchJson<EducationResourceResponse>(`/api/education/resources/${resourceId}`);
        if (!ignore) {
          setTitle(data.resource.title);
          setYoutubeLink(data.resource.youtube_link);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "교육자료 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!resourceId) {
      return () => {
        ignore = true;
      };
    }

    void loadResource();

    return () => {
      ignore = true;
    };
  }, [resourceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextTitle = title.trim();
    const nextYoutubeLink = youtubeLink.trim();

    if (!nextTitle) {
      setError("제목을 입력하세요.");
      return;
    }

    const youtubeLinkError = getYoutubeLinkError(nextYoutubeLink);
    if (youtubeLinkError) {
      setError(youtubeLinkError);
      return;
    }

    try {
      await fetchJson<EducationResourceResponse>(`/api/education/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, youtubeLink: nextYoutubeLink }),
      });

      setAlertMessage("수정이 완료되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "교육자료 정보를 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/education/resources/${resourceId}`);
      setAlertMessage("자료가 삭제되었습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "교육자료를 삭제하지 못했습니다.");
      setDeleteConfirmOpen(false);
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">교육자료 상세</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            선택한 교육자료의 제목과 유튜브 링크를 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" noValidate onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="resource-title">
                  제목
                </label>
                <Input
                  className="w-full"
                  id="resource-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
                  value={youtubeLink}
                  onChange={(event) => setYoutubeLink(event.target.value)}
                  required
                  type="url"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="자료를 삭제하시겠습니까?"
        description="삭제하면 해당 교육자료가 시스템에서 완전히 제거됩니다."
        loading={deleting}
      />

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
