"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  created_at: string;
};

type EducationCompletionRow = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
};

type GuardSession = {
  employee?: {
    id?: unknown;
  };
};

type YoutubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
};

type YoutubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YoutubePlayer }) => void;
        onPlaybackRateChange?: (event: { data: number; target: YoutubePlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YoutubePlayer;
};

declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const guardSessionStorageKey = "ollbareun.guard.session";
const youtubeApiScriptId = "youtube-iframe-api";
const youtubePlayerReadyState = 0;
const requiredPlaybackRate = 1;
const watchProgressIntervalMs = 1000;
const maximumAllowedForwardSeconds = 3;
const completionWatchRatio = 0.95;

type WatchProgress = {
  lastAllowedTime: number;
  lastSampleTime: number;
  watchedSeconds: number;
};

function createInitialWatchProgress(): WatchProgress {
  return {
    lastAllowedTime: 0,
    lastSampleTime: 0,
    watchedSeconds: 0,
  };
}

function readGuardEmployeeId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedSession = window.sessionStorage.getItem(guardSessionStorageKey);
    if (!storedSession) {
      return null;
    }

    const session = JSON.parse(storedSession) as GuardSession;
    return typeof session.employee?.id === "string" && session.employee.id.trim() ? session.employee.id.trim() : null;
  } catch {
    return null;
  }
}

function getYoutubeEmbedUrl(youtubeLink: string) {
  try {
    const url = new URL(youtubeLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&controls=0&disablekb=1&modestbranding=1`
        : "";
    }

    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId
          ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&controls=0&disablekb=1&modestbranding=1`
          : "";
      }

      const [section, videoId] = url.pathname.split("/").filter(Boolean);
      if (section === "embed" && videoId) {
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&controls=0&disablekb=1&modestbranding=1`;
      }
      if (section === "shorts" && videoId) {
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&controls=0&disablekb=1&modestbranding=1`;
      }
    }
  } catch {
    return "";
  }

  return "";
}

function getYoutubeVideoId(youtubeLink: string) {
  try {
    const url = new URL(youtubeLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v") ?? "";
      }

      const [section, videoId] = url.pathname.split("/").filter(Boolean);
      if (section === "embed" || section === "shorts") {
        return videoId ?? "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

export default function GuardSafetyEducationPage() {
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [completedResourceIds, setCompletedResourceIds] = useState<string[]>([]);
  const [selectedResource, setSelectedResource] = useState<EducationResourceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [message, setMessage] = useState("");
  const [playerReady, setPlayerReady] = useState(() => typeof window !== "undefined" && Boolean(window.YT?.Player));
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const watchProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchProgressRef = useRef<WatchProgress>(createInitialWatchProgress());
  const completedResourceIdsRef = useRef(new Set<string>());

  const markEducationCompletion = useCallback(async (resourceId: string) => {
    const employeeId = readGuardEmployeeId();
    if (!employeeId) {
      setCompletionError("경비원 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setCompletionError("");
      const response = await fetch("/api/education/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, resourceId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "교육이수 정보를 저장하지 못했습니다.");
      }

      setMessage("교육이수 처리가 완료되었습니다.");
      completedResourceIdsRef.current.add(resourceId);
      setCompletedResourceIds((previousIds) =>
        previousIds.includes(resourceId) ? previousIds : [...previousIds, resourceId],
      );
      setSelectedResource((currentResource) => {
        if (currentResource?.id !== resourceId) {
          return currentResource;
        }

        return (
          resources.find((resource) => resource.id !== resourceId && !completedResourceIdsRef.current.has(resource.id)) ??
          null
        );
      });
    } catch (completionError) {
      completedResourceIdsRef.current.delete(resourceId);
      setCompletionError(
        completionError instanceof Error ? completionError.message : "교육이수 정보를 저장하지 못했습니다.",
      );
    }
  }, [resources]);

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      try {
        const employeeId = readGuardEmployeeId();
        const [resourcesResponse, completionsResponse] = await Promise.all([
          fetch("/api/education/resources"),
          employeeId ? fetch("/api/education/completions") : Promise.resolve(null),
        ]);
        const resourcesPayload = await resourcesResponse.json();
        const completionsPayload = completionsResponse ? await completionsResponse.json() : { completions: [] };

        if (!resourcesResponse.ok) {
          throw new Error(resourcesPayload.error ?? "안전교육 목록을 불러오지 못했습니다.");
        }
        if (completionsResponse && !completionsResponse.ok) {
          throw new Error(completionsPayload.error ?? "교육이수 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          const nextResources = (resourcesPayload.resources ?? []) as EducationResourceRow[];
          const nextCompletedResourceIds = new Set(
            ((completionsPayload.completions ?? []) as EducationCompletionRow[])
              .filter((completion) => completion.employee_id === employeeId && completion.is_completed)
              .map((completion) => completion.resource_id),
          );
          const firstAvailableResource =
            nextResources.find((resource) => !nextCompletedResourceIds.has(resource.id)) ?? null;

          completedResourceIdsRef.current = nextCompletedResourceIds;
          setResources(nextResources);
          setCompletedResourceIds([...nextCompletedResourceIds]);
          setSelectedResource(firstAvailableResource);
          setMessage("");
        }
      } catch (loadError) {
        if (!ignore) {
          setListError(loadError instanceof Error ? loadError.message : "안전교육 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadResources();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.YT?.Player) {
      return;
    }

    const existingScript = document.getElementById(youtubeApiScriptId);
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      setPlayerReady(true);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = youtubeApiScriptId;
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => setCompletionError("유튜브 플레이어를 불러오지 못했습니다.");
      document.body.appendChild(script);
    }
  }, []);

  const sortedResources = useMemo(
    () =>
      resources
        .filter((resource) => !completedResourceIds.includes(resource.id))
        .sort((left, right) => {
          return left.title.localeCompare(right.title, "ko-KR");
        }),
    [completedResourceIds, resources],
  );
  const selectedEmbedUrl = selectedResource ? getYoutubeEmbedUrl(selectedResource.youtube_link) : "";

  useEffect(() => {
    const clearWatchProgressInterval = () => {
      if (watchProgressIntervalRef.current) {
        clearInterval(watchProgressIntervalRef.current);
        watchProgressIntervalRef.current = null;
      }
    };

    const resetWatchProgress = () => {
      watchProgressRef.current = createInitialWatchProgress();
    };

    if (!selectedResource || !playerReady || !iframeRef.current || !window.YT?.Player) {
      clearWatchProgressInterval();
      resetWatchProgress();
      playerRef.current?.destroy();
      playerRef.current = null;
      return;
    }

    clearWatchProgressInterval();
    resetWatchProgress();
    playerRef.current?.destroy();
    playerRef.current = new window.YT.Player(iframeRef.current, {
      videoId: getYoutubeVideoId(selectedResource.youtube_link),
      playerVars: {
        enablejsapi: 1,
        playsinline: 1,
        rel: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
      },
      events: {
        onReady: (event) => {
          event.target.setPlaybackRate(requiredPlaybackRate);
        },
        onPlaybackRateChange: (event) => {
          if (event.data !== requiredPlaybackRate) {
            event.target.setPlaybackRate(requiredPlaybackRate);
          }
        },
        onStateChange: (event) => {
          if (event.data === youtubePlayerReadyState) {
            const resourceId = selectedResource.id;
            const player = playerRef.current;
            const duration = player?.getDuration() ?? 0;
            const playbackRate = player?.getPlaybackRate() ?? requiredPlaybackRate;
            const hasEnoughWatchTime =
              duration > 0 && watchProgressRef.current.watchedSeconds >= duration * completionWatchRatio;

            if (
              playbackRate === requiredPlaybackRate &&
              hasEnoughWatchTime &&
              !completedResourceIdsRef.current.has(resourceId)
            ) {
              completedResourceIdsRef.current.add(resourceId);
              void markEducationCompletion(resourceId);
            }
          }
        },
      },
    });

    watchProgressIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      const currentTime = player.getCurrentTime();
      const playbackRate = player.getPlaybackRate();
      const progress = watchProgressRef.current;
      const elapsedSinceLastSample = currentTime - progress.lastSampleTime;

      if (playbackRate !== requiredPlaybackRate) {
        player.setPlaybackRate(requiredPlaybackRate);
        progress.lastSampleTime = currentTime;
        return;
      }

      if (elapsedSinceLastSample > maximumAllowedForwardSeconds) {
        player.seekTo(progress.lastAllowedTime, true);
        progress.lastSampleTime = progress.lastAllowedTime;
        progress.watchedSeconds = Math.min(progress.watchedSeconds, progress.lastAllowedTime);
        return;
      }

      if (elapsedSinceLastSample > 0) {
        progress.watchedSeconds += elapsedSinceLastSample;
        progress.lastAllowedTime = currentTime;
      }

      progress.lastSampleTime = currentTime;
    }, watchProgressIntervalMs);

    return () => {
      clearWatchProgressInterval();
      resetWatchProgress();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [markEducationCompletion, playerReady, selectedResource]);

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[56px]">
      <section className="space-y-[24px]">
        <header>
          <h1 className="text-[40px] font-semibold leading-[1.1]">안전교육</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[640px]">
            등록된 안전교육 자료의 제목과 유튜브 링크를 확인합니다.
          </p>
        </header>

        <section
          aria-label="안전교육 목록"
          className="bg-canvas-parchment rounded-[18px] p-[16px] border border-hairline/50"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
            <span>전체 안전교육 {sortedResources.length}</span>
          </div>

          {loading ? (
            <p className="mt-6 text-[16px] text-ink-muted-48">자료조회중입니다...</p>
          ) : listError ? (
            <p className="mt-6 text-[16px] text-status-warn">{listError}</p>
          ) : (
            <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
              <table className="apple-table">
                <thead>
                  <tr>
                    <th className="text-left">제목</th>
                    <th className="text-left">링크</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResources.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-ink-muted-48 italic">
                        이수하지 않은 안전교육 자료가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedResources.map((resource) => (
                      <tr key={resource.id} className="hover:bg-canvas-parchment transition-colors">
                        <td className="font-semibold">
                          <button
                            className="text-left text-primary hover:underline"
                            type="button"
                            onClick={() => {
                              setSelectedResource(resource);
                              setMessage("");
                              setCompletionError("");
                            }}
                          >
                            {resource.title}
                          </button>
                        </td>
                        <td className="text-ink-muted-48">
                          <button
                            className="underline-offset-4 hover:underline"
                            type="button"
                            onClick={() => {
                              setSelectedResource(resource);
                              setMessage("");
                              setCompletionError("");
                            }}
                          >
                            {resource.youtube_link}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          aria-label="안전교육 영상"
          className="bg-canvas-parchment rounded-[18px] p-[16px] border border-hairline/50"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
            <span>{selectedResource ? selectedResource.title : "재생할 교육자료 없음"}</span>
          </div>

          <div className="mt-4 rounded-[16px] border border-hairline bg-canvas p-0">
            {selectedResource && selectedEmbedUrl ? (
              <iframe
                key={selectedResource.id}
                ref={iframeRef}
                className="aspect-video w-full rounded-[12px] border border-hairline bg-surface-black"
                src={selectedEmbedUrl}
                title={selectedResource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <p className="p-8 text-center text-ink-muted-48 italic">
                재생할 안전교육 링크를 선택하세요.
              </p>
            )}
          </div>

          {message ? <p className="mt-4 text-[16px] text-primary">{message}</p> : null}
          {completionError ? <p className="mt-4 text-[16px] text-status-warn">{completionError}</p> : null}
        </section>
      </section>
    </div>
  );
}
