"use client";

import { useEffect } from "react";
import { recordClipView } from "@/lib/api";

export function ClipViewTracker({ clipId }: { clipId: string }) {
  useEffect(() => {
    recordClipView(clipId).catch(() => {});
  }, [clipId]);
  return null;
}
