import { requireManagerUser } from "@/lib/manager-auth";
import { getCloudflareVideoByUid, type CloudflareVideoRow } from "@/lib/cloudflare-stream";

async function loadCloudflareVideo(uid: string) {
  await requireManagerUser(`/manager/safety/cloudflare/watch/${encodeURIComponent(uid)}`);
  return getCloudflareVideoByUid(uid) as Promise<CloudflareVideoRow>;
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
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">{video.title}</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[45rem]">
          UID {video.uid} · {getStatusText(video)}
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="aspect-video min-h-[13.75rem] overflow-hidden rounded-lg border border-border bg-black">
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
