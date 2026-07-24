"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStoredGuardSession } from "../../guard-session-storage";
import { GuardPageHeader } from "@/components/guard/guard-page-header";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, PlayCircle } from "lucide-react";

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
  const [loadedIframeResourceId, setLoadedIframeResourceId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const watchProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchProgressRef = useRef<WatchProgress>(createInitialWatchProgress());
  const completedResourceIdsRef = useRef(new Set<string>());

  const handleIframeLoad = useCallback(() => {
    if (selectedResource) {
      setLoadedIframeResourceId(selectedResource.id);
    }
  }, [selectedResource]);

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
  }, [loadedIframeResourceId, markEducationCompletion, playerReady, selectedResource]);

  return (
    <div className="w-full space-y-6">
      <GuardPageHeader
        title="안전교육"
        description="미이수 법정 안전교육 영상을 시청하고 이수합니다."
      />

      {/* Uncompleted Education List Card */}
      <Card className="w-full shadow-sm border" aria-label="안전교육 목록">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>미이수 안전교육 목록</span>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              미이수 {sortedResources.length}건
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : listError ? (
            <GuardStatusAlert status="error" title="목록 오류" description={listError} />
          ) : sortedResources.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground italic border rounded-lg bg-muted/20">
              이수하지 않은 안전교육 자료가 없습니다.
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-background overflow-hidden">
              {sortedResources.map((resource) => {
                const isSelected = selectedResource?.id === resource.id;
                return (
                  <Button
                    key={resource.id}
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSelectedResource(resource);
                      setMessage("");
                      setCompletionError("");
                    }}
                    className={`w-full h-auto flex items-center justify-between p-3 text-left transition-colors hover:bg-muted/50 rounded-none border-b last:border-0 ${
                      isSelected ? "bg-accent/60 font-semibold" : ""
                    }`}
                  >
                    <span className="text-sm text-foreground truncate flex items-center gap-2">
                      <PlayCircle className={`size-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      {resource.title}
                    </span>
                    {isSelected && (
                      <Badge aria-hidden="true" className="bg-primary text-primary-foreground text-xs shrink-0">
                        선택됨
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Player Card */}
      <Card role="region" aria-label="안전교육 영상" className="w-full shadow-sm border overflow-hidden p-0">
        <CardContent className="p-4 space-y-4">
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/90 relative flex items-center justify-center">
            {selectedResource ? (
              <iframe
                ref={iframeRef}
                title={selectedResource.title}
                src={selectedEmbedUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="text-sm text-white/70">
                상단 목록에서 시청할 교육을 선택해주세요.
              </div>
            )}
          </div>

          {message ? <GuardStatusAlert status="success" title="이수 처리" description={message} /> : null}
          {completionError ? <GuardStatusAlert status="error" title="이수 처리 오류" description={completionError} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
