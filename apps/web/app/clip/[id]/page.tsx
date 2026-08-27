import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ArrowLeft, Clock, Eye, Scissors } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { ClipViewTracker } from "@/components/clip-view-tracker";

interface Props {
  params: Promise<{ id: string }>;
}

interface PublicClip {
  id: string;
  start_time: number;
  end_time: number;
  duration: number;
  output_url: string;
  score: number;
  title: string | null;
  view_count: number;
  download_count: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function fetchClip(id: string): Promise<PublicClip | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/clips/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.clip;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const clip = await fetchClip(id);
  const title = clip?.title || "Shared clip";
  return {
    title: `${title} — ClipForge`,
    description: `Watch this vertical clip created with ClipForge.`,
    openGraph: {
      title: `${title} — ClipForge`,
      description: `Watch this vertical clip created with ClipForge.`,
      type: "video.other",
      videos: clip
        ? [
            {
              url: clip.output_url,
              width: 1080,
              height: 1920,
              type: "video/mp4",
            },
          ]
        : undefined,
    },
  };
}

export default async function ClipSharePage({ params }: Props) {
  const { id } = await params;
  const clip = await fetchClip(id);

  if (!clip) {
    notFound();
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/clip/${id}`;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <ClipViewTracker clipId={id} />
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Back home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href="/" className="text-lg font-semibold">
            ClipForge
          </Link>
        </div>
        <Link
          href="/"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Create your own clips
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-xl dark:border-zinc-800">
            <video
              src={clip.output_url}
              controls
              autoPlay
              muted
              loop
              playsInline
              crossOrigin="anonymous"
              className="aspect-[9/16] w-full object-contain"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-lg font-semibold">{clip.title || "Shared clip"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(clip.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5" />
                {formatDuration(clip.start_time)} – {formatDuration(clip.end_time)}
              </span>
              <span className="flex items-center gap-1" title="Views">
                <Eye className="h-3.5 w-3.5" />
                {clip.view_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1" title="Downloads">
                <Download className="h-3.5 w-3.5" />
                {clip.download_count.toLocaleString()}
              </span>
              {clip.score > 0 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                  Score {(clip.score * 100).toFixed(0)}
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={clip.output_url}
                download={`${clip.title || "clip"}.mp4`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <ShareButton url={shareUrl} />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Created with{" "}
        <Link href="/" className="font-medium text-zinc-900 hover:underline dark:text-zinc-200">
          ClipForge
        </Link>
      </footer>
    </div>
  );
}
