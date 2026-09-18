"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingBoard from "@/components/loading-board";
import { readStoredGuardSession } from "../../guard-session-storage";
import { formatYoutubeDuration, getYoutubeVideoId } from "@/lib/youtube";
import type { YoutubePlayer } from "@/lib/youtube-iframe-types";
import styles from "./page.module.css";

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

type DurationRefreshStatus = "idle" | "loading" | "ready" | "unavailable";

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
  const session = readStoredGuardSession<GuardSession>({ touch: true });
  return typeof session?.employee?.id === "string" && session.employee.id.trim() ? session.employee.id.trim() : null;
}

function getYoutubeEmbedUrl(youtubeLink: string, origin?: string) {
  const createEmbedUrl = (videoId: string) => {
    const params = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      rel: "0",
      controls: "0",
      disablekb: "1",
      modestbranding: "1",
    });

    if (origin) {
      params.set("origin", origin);
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  try {
    const url = new URL(youtubeLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? createEmbedUrl(videoId) : "";
    }

    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId ? createEmbedUrl(videoId) : "";
      }

      const [section, videoId] = url.pathname.split("/").filter(Boolean);
      if (section === "embed" && videoId) {
        return createEmbedUrl(videoId);
      }
      if (section === "shorts" && videoId) {
        return createEmbedUrl(videoId);
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
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState<number | null>(null);
  const [selectedDurationStatus, setSelectedDurationStatus] = useState<DurationRefreshStatus>("idle");
  const [playerReady, setPlayerReady] = useState(() => typeof window !== "undefined" && Boolean(window.YT?.Player));
  const [loadedIframeResourceId, setLoadedIframeResourceId] = useState<string | null>(null);
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

        return null;
      });
    } catch (completionError) {
      completedResourceIdsRef.current.delete(resourceId);
      setCompletionError(
        completionError instanceof Error ? completionError.message : "교육이수 정보를 저장하지 못했습니다.",
      );
    }
  }, []);

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

          completedResourceIdsRef.current = nextCompletedResourceIds;
          setResources(nextResources);
          setCompletedResourceIds([...nextCompletedResourceIds]);
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
      [...resources].sort((left, right) => {
        return left.title.localeCompare(right.title, "ko-KR");
      }),
    [resources],
  );
  const completedResourceIdSet = useMemo(() => new Set(completedResourceIds), [completedResourceIds]);
  const completedResourceCount = resources.filter((resource) => completedResourceIdSet.has(resource.id)).length;
  const completionPercentage = resources.length ? Math.round((completedResourceCount / resources.length) * 100) : 0;
  const selectedEmbedUrl = selectedResource
    ? getYoutubeEmbedUrl(selectedResource.youtube_link, typeof window !== "undefined" ? window.location.origin : "")
    : "";

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

    if (
      !selectedResource ||
      !playerReady ||
      loadedIframeResourceId !== selectedResource.id ||
      !iframeRef.current ||
      !window.YT?.Player
    ) {
      clearWatchProgressInterval();
      resetWatchProgress();
      playerRef.current?.destroy();
      playerRef.current = null;
      return;
    }

    clearWatchProgressInterval();
    resetWatchProgress();
    playerRef.current?.destroy();

    let durationTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshDuration = (player: YoutubePlayer, attempt = 0) => {
      try {
        const duration = player.getDuration();
        if (duration > 0 && Number.isFinite(duration)) {
          setSelectedDurationSeconds(Math.floor(duration));
          setSelectedDurationStatus("ready");
          return;
        }
      } catch {
        setSelectedDurationStatus("unavailable");
        return;
      }

      if (attempt < 20) {
        durationTimer = setTimeout(() => refreshDuration(player, attempt + 1), 250);
        return;
      }

      setSelectedDurationStatus("unavailable");
    };

    playerRef.current = new window.YT.Player(iframeRef.current, {
      videoId: getYoutubeVideoId(selectedResource.youtube_link),
      playerVars: {
        enablejsapi: 1,
        playsinline: 1,
        rel: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          event.target.setPlaybackRate(requiredPlaybackRate);
          refreshDuration(event.target);
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
      if (durationTimer !== null) {
        clearTimeout(durationTimer);
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [loadedIframeResourceId, markEducationCompletion, playerReady, selectedResource]);

  return (
    <main className={styles.safetyPage}>
      <section aria-label="안전교육 목록" className={styles.safetyCard}>
        <div className={styles.headingRow}>
          <h1 className={styles.heading}>안전교육</h1>
          <p className={styles.progress}>
            {completedResourceCount}/{resources.length} 완료 ({completionPercentage}%)
          </p>
        </div>

        <div className={styles.description}>
          <p className={styles.descriptionText}>
            필수 안전교육 영상을 시청하고 이수를 완료해 주세요.
            <br />
            리스트의 각 제목을 터치하면 시청하실 수 있습니다.
          </p>
        </div>

        {loading ? (
          <div className={styles.educationList}>
            <LoadingBoard className={styles.loading} label="안전교육 목록을 불러오는 중입니다." />
          </div>
        ) : listError ? (
          <p className={styles.error} role="alert">{listError}</p>
        ) : sortedResources.length === 0 ? (
          <div className={`${styles.educationList} ${styles.emptyState}`}>
            <p>등록된 안전교육 자료가 없습니다.</p>
          </div>
        ) : (
          <div aria-label="안전교육 자료" className={styles.educationList}>
            {sortedResources.map((resource) => {
              const completed = completedResourceIdSet.has(resource.id);
              const titleId = `education-title-${resource.id}`;
              const statusId = `education-status-${resource.id}`;

              return (
                <button
                  aria-describedby={statusId}
                  aria-labelledby={titleId}
                  className={styles.educationItem}
                  data-completed={completed}
                  key={resource.id}
                  onClick={() => {
                    setLoadedIframeResourceId(null);
                    setSelectedResource(resource);
                    setSelectedDurationStatus("loading");
                    setMessage("");
                    setCompletionError("");
                  }}
                  type="button"
                >
                  <span className={styles.educationTitle} id={titleId}>{resource.title}</span>
                  <span className={`${styles.educationStatus} ${completed ? styles.completedStatus : styles.incompleteStatus}`} id={statusId}>
                    {completed ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" className={styles.checkIcon} height="16" src="/guard-assets/check-square.svg" width="16" />
                        이수 완료
                      </>
                    ) : "미이수"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {message ? <p role="status" className={styles.message}>{message}</p> : null}
      {completionError && !selectedResource ? <p role="alert" className={styles.error}>{completionError}</p> : null}
        <Dialog
          open={selectedResource !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedResource(null);
              setLoadedIframeResourceId(null);
              setSelectedDurationSeconds(null);
              setSelectedDurationStatus("idle");
              setCompletionError("");
            }
          }}
        >
          <DialogContent className="w-screen max-w-[100vw] max-h-[90dvh] overflow-x-hidden overflow-y-auto p-0 sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:p-6">
            <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
              <DialogTitle className="pr-6">{selectedResource?.title ?? "안전교육 영상"}</DialogTitle>
              <DialogDescription>영상을 끝까지 시청하면 교육이수가 처리됩니다.</DialogDescription>
            </DialogHeader>
            <section aria-label="안전교육 영상" className="w-full space-y-4">
              {selectedResource && selectedEmbedUrl ? (
                <>
                  <iframe
                    key={selectedResource.id}
                    ref={iframeRef}
                    className="aspect-video w-full rounded-[0.75rem] border border-border bg-black"
                    src={selectedEmbedUrl}
                    title={selectedResource.title}
                    onLoad={() => setLoadedIframeResourceId(selectedResource.id)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <p className="text-sm text-muted-foreground">
                    동영상 길이: {selectedDurationSeconds === null && selectedDurationStatus === "loading"
                      ? "확인 중..."
                      : formatYoutubeDuration(selectedDurationSeconds)}
                  </p>
                </>
              ) : (
                <p className="p-8 text-center text-muted-foreground">재생할 수 없는 안전교육 링크입니다.</p>
              )}
              {completionError ? <p role="alert" className="text-[1rem] text-destructive">{completionError}</p> : null}
            </section>
          </DialogContent>
        </Dialog>
    </main>
  );
}
