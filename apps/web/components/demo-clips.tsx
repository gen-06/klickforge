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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading demo clips...
      </div>
    );
  }

  if (clips.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
