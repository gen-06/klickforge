"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Activity, Film, CheckCircle, AlertCircle } from "lucide-react";
import { getActivity, type ActivityItem } from "@/lib/api";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusIcon(status: string, type: ActivityItem["type"]) {
  if (status === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (status === "done" || status === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (type === "video_upload") return <Film className="h-4 w-4 text-blue-500" />;
  return <Activity className="h-4 w-4 text-amber-500" />;
}

function activityText(item: ActivityItem) {
  if (item.type === "video_upload") {
    return `Uploaded "${item.title}"`;
  }
  if (item.status === "processing") {
    return `Processing "${item.title}"${item.progress ? ` (${item.progress}%)` : ""}`;
  }
  if (item.status === "done") {
    return `Finished "${item.title}"`;
  }
  if (item.status === "failed") {
    return `Failed to process "${item.title}"`;
  }
  return `Updated "${item.title}"`;
}

export function ActivityFeed() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await getActivity(token);
        if (!cancelled) setItems(data.items);
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
  }, [getToken]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold">Recent activity</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 shrink-0">{statusIcon(item.status, item.type)}</div>
            <div className="flex-1">
              <p className="text-zinc-800 dark:text-zinc-200">{activityText(item)}</p>
              <p className="text-xs text-zinc-500">{formatTime(item.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
