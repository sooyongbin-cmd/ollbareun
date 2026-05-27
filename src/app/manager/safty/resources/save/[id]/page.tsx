"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";

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

      window.alert("수정이 완료되었습니다.");
      router.push("/manager/safty/resources");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "교육자료 정보를 저장하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <p className="text-[14px] font-semibold text-ink-muted-48 uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육자료수정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            선택한 교육자료의 제목과 유튜브 링크를 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[16px] text-status-warn">{routeError}</p>
        ) : (
          <form className="space-y-6" noValidate onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="resource-title">
                  제목
                </label>
                <input
                  className="field"
                  id="resource-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
                  value={youtubeLink}
                  onChange={(event) => setYoutubeLink(event.target.value)}
                  required
                  type="url"
                />
              </div>
            </div>

            <button className="button-primary w-full md:w-auto" type="submit">
              저장
            </button>
          </form>
        )}

        {error ? <p className="mt-6 text-[16px] text-status-warn">{error}</p> : null}
      </section>
    </section>
  );
}
