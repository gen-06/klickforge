"use client";

import { useEffect } from "react";
import { recordClipView } from "@/lib/api";

export function ClipViewTracker({ clipId }: { clipId: string }) {
  useEffect(() => {
    let cancelled = false;
    recordClipView(clipId).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clipId]);
  return null;
}
