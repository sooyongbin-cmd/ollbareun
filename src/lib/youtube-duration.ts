"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getYoutubeEmbedUrl, getYoutubeVideoId } from "./youtube";
import type { YoutubeApi, YoutubePlayer } from "./youtube-iframe-types";

const youtubeApiScriptId = "youtube-iframe-api";
const youtubeApiTimeoutMs = 15_000;

let youtubeApiPromise: Promise<YoutubeApi> | null = null;

function loadYoutubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("유튜브 플레이어는 브라우저에서만 불러올 수 있습니다."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YoutubeApi>((resolve, reject) => {
    let settled = false;
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeoutId = window.setTimeout(() => finishError("유튜브 플레이어를 불러오지 못했습니다."), youtubeApiTimeoutMs);
    const intervalId = window.setInterval(checkReady, 100);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    }

    function finishError(message: string) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      youtubeApiPromise = null;
      reject(new Error(message));
    }

    function checkReady() {
      if (settled) {
        return;
      }

      if (window.YT?.Player) {
        settled = true;
        cleanup();
        resolve(window.YT);
      }
    }

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      checkReady();
    };

    const existingScript = document.getElementById(youtubeApiScriptId);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = youtubeApiScriptId;
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finishError("유튜브 플레이어를 불러오지 못했습니다.");
      document.body.appendChild(script);
    }

    checkReady();
  });

  return youtubeApiPromise;
}

export type YoutubeDurationStatus = "idle" | "loading" | "ready" | "error";

export function useYoutubeDuration(youtubeLink: string) {
  const videoId = useMemo(() => getYoutubeVideoId(youtubeLink), [youtubeLink]);
  const [loadedVideoId, setLoadedVideoId] = useState("");
  const [durationResult, setDurationResult] = useState<{ videoId: string; seconds: number } | null>(null);
  const [status, setStatus] = useState<YoutubeDurationStatus>("idle");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const setIframeRef = useCallback((element: HTMLIFrameElement | null) => {
    iframeRef.current = element;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let durationTimer: number | null = null;

    playerRef.current?.destroy();
    playerRef.current = null;

    if (!videoId) {
      return () => {
        cancelled = true;
      };
    }

    if (loadedVideoId !== videoId || !iframeRef.current) {
      return () => {
        cancelled = true;
      };
    }

    void loadYoutubeIframeApi()
      .then((youtubeApi) => {
        if (cancelled || !iframeRef.current) {
          return;
        }

        const readDuration = (attempt = 0) => {
          if (cancelled || !playerRef.current) {
            return;
          }

          const duration = playerRef.current.getDuration();
          if (duration > 0 && Number.isFinite(duration)) {
            setDurationResult({ videoId, seconds: Math.floor(duration) });
            setStatus("ready");
            return;
          }

          if (attempt < 20) {
            durationTimer = window.setTimeout(() => readDuration(attempt + 1), 250);
            return;
          }

          setStatus("error");
        };

        playerRef.current = new youtubeApi.Player(iframeRef.current, {
          videoId,
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
            onReady: () => readDuration(),
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      if (durationTimer !== null) {
        window.clearTimeout(durationTimer);
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [loadedVideoId, videoId]);

  return {
    durationSeconds: durationResult?.videoId === videoId ? durationResult.seconds : null,
    iframeSrc: videoId
      ? getYoutubeEmbedUrl(youtubeLink, typeof window !== "undefined" ? window.location.origin : "")
      : "",
    onIframeLoad: () => {
      if (videoId) {
        setLoadedVideoId(videoId);
        setStatus("loading");
      }
    },
    setIframeRef,
    status: videoId && loadedVideoId !== videoId ? "loading" : videoId ? status : "idle",
    videoId,
  };
}
