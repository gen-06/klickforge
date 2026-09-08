"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DemoClip {
  id: string;
  start_time: number;
  end_time: number;
  duration: number;
  output_url: string;
  score: number;
  title: string | null;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DemoClips() {
  const [clips, setClips] = useState<DemoClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/public/demo-clips`);
        if (!res.ok) throw new Error("Failed to load demo clips");
        const data = await res.json();
        if (!cancelled) setClips(data.clips || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Own the whole section, heading included — not just the clip grid — so
  // there's never a "See it in action" heading floating above empty space
  // while nothing has been opted into the public demo yet.
  if (loading) {
    return (
      <section className="border-y border-zinc-200 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading demo clips...
        </div>
      </section>
    );
  }

  if (clips.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-zinc-200 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">See it in action</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-zinc-600 dark:text-zinc-400">
          Real vertical clips created by ClipForge from long-form videos.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <video
                src={clip.output_url}
                controls
                crossOrigin="anonymous"
                className="aspect-[9/16] w-full bg-black object-contain"
              />
              <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                <p className="truncate text-sm font-medium">{clip.title || "Demo clip"}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDuration(clip.duration)} • {formatDuration(clip.start_time)} –{" "}
                  {formatDuration(clip.end_time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
