const youtubeHostnames = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function getYoutubeVideoId(youtubeLink: string) {
  try {
    const url = new URL(youtubeLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (!youtubeHostnames.has(hostname)) {
      return "";
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v") ?? "";
    }

    const [section, videoId] = url.pathname.split("/").filter(Boolean);
    return section === "embed" || section === "shorts" ? videoId ?? "" : "";
  } catch {
    return "";
  }
}

export function getYoutubeEmbedUrl(youtubeLink: string, origin?: string) {
  const videoId = getYoutubeVideoId(youtubeLink);
  if (!videoId) {
    return "";
  }

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
}

export function formatYoutubeDuration(durationSeconds: number | null | undefined) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return "-";
  }

  const totalSeconds = Math.floor(durationSeconds);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${totalMinutes}:${seconds}`;
}
