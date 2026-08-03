type CloudflareVideoRow = {
  uid: string;
  title: string;
  status: string;
  pctComplete: string | null;
  uploaded: string | null;
  size: number | null;
  duration: number | null;
  readyToStream: boolean;
};

async function loadCloudflareVideo(uid: string) {
  const response = await fetch(`/api/education/cloudflare/videos/${encodeURIComponent(uid)}`, {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Cloudflare 동영상을 불러오지 못했습니다.");
  }

  return payload.video as CloudflareVideoRow;
}

function getStatusText(video: CloudflareVideoRow) {
  if (video.readyToStream) {
    return "시청 가능";
  }

  if (video.status === "inprogress" && video.pctComplete) {
    return `처리 중 ${video.pctComplete}%`;
  }

  return video.status;
}

export default async function CloudflareVideoWatchPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const video = await loadCloudflareVideo(uid);

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[28px] leading-[1.2]">{video.title}</h1>
        <p className="text-[14px] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[720px]">
          UID {video.uid} · {getStatusText(video)}
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        <div className="aspect-video min-h-[220px] overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            className="h-full w-full"
            src={`https://iframe.videodelivery.net/${video.uid}`}
            title={video.title}
          />
        </div>
      </section>
    </section>
  );
}
