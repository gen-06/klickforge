"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Captions, Download, Film, Loader2, Pencil, RefreshCw, Share2, Trash2 } from "lucide-react";
import type { Clip, TranscriptSegment, Video } from "@youtubers/shared";
import { useToast } from "@/components/ui/toast";
import { VideoListSkeleton } from "./video-list-skeleton";
import { ShortcutsHelp } from "@/components/ui/shortcuts-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  deleteClip,
  deleteVideo,
  getClipDownloadUrl,
  getJob,
  getTranscript,
  listClips,
  listVideos,
  regenerateClip,
  retryVideo,
  updateClip,
  updateTranscript,
} from "@/lib/api";

interface VideoListProps {
  refreshKey?: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCaptionStyle(video: Video) {
  const pos = video.subtitle_position;
  return `${video.subtitle_font}, ${video.subtitle_size}px, ${pos}, outline ${video.subtitle_outline}`;
}

function formatAudioMode(mode: Video["audio_mode"]) {
  const labels = {
    subtitles_only: "Subtitles only",
    voiceover: "Dubbed voiceover",
    voiceover_with_original: "Voiceover + original",
  };
  return labels[mode] || mode;
}

function statusBadge(status: Video["status"]) {
  const styles: Record<Video["status"], string> = {
    pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    uploaded: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    processing: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    done: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function VideoList({ refreshKey = 0 }: VideoListProps) {
  const { getToken } = useAuth();
  const { success, error } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [clipsByVideo, setClipsByVideo] = useState<Record<string, Clip[]>>({});
  const [loading, setLoading] = useState(true);
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);
  const [retryingVideo, setRetryingVideo] = useState<string | null>(null);
  const [deletingClip, setDeletingClip] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<Record<string, number>>({});
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState<number>(0);
  const [editEnd, setEditEnd] = useState<number>(0);
  const [regeneratingClip, setRegeneratingClip] = useState<string | null>(null);
  const [regenerateJobs, setRegenerateJobs] = useState<Record<string, { jobId: string; videoId: string }>>({});
  const [regenerateProgress, setRegenerateProgress] = useState<Record<string, number>>({});
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptSegment[]>>({});
  const [transcriptExpanded, setTranscriptExpanded] = useState<Record<string, boolean>>({});
  const [transcriptLoading, setTranscriptLoading] = useState<Record<string, boolean>>({});
  const [transcriptSaving, setTranscriptSaving] = useState<Record<string, boolean>>({});
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "?",
      description: "Open keyboard shortcuts",
      action: () => setShortcutsOpen(true),
    },
    {
      key: "r",
      description: "Refresh videos",
      action: () => {
        window.dispatchEvent(new CustomEvent("clipforge-refresh-videos"));
      },
    },
    {
      key: "Escape",
      description: "Close editing or shortcuts",
      action: () => {
        setShortcutsOpen(false);
        if (editingClipId) {
          cancelEditing();
        }
      },
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const token = await getToken();
        const data = await listVideos(token);
        if (cancelled) return;
        setVideos(data);

        const clipsMap: Record<string, Clip[]> = {};
        for (const video of data) {
          if (video.status === "done" || video.status === "processing") {
            clipsMap[video.id] = await listClips(video.id, token);
            if (cancelled) return;
          }
        }
        setClipsByVideo(clipsMap);
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
  }, [refreshKey, getToken]);

  // Auto-refresh while any video is actively processing.
  useEffect(() => {
    const active = videos.some((v) => v.status === "processing" || v.status === "uploaded");
    if (!active) return;

    const interval = setInterval(() => {
      const event = new CustomEvent("clipforge-refresh-videos");
      window.dispatchEvent(event);
    }, 5000);

    return () => clearInterval(interval);
  }, [videos]);

  // Poll active jobs for processing videos to show real progress bars.
  useEffect(() => {
    const activeJobs = videos
      .filter((v) => v.status === "processing" || v.status === "uploaded")
      .map((v) => {
        const job = v.jobs?.find((j) => j.status === "queued" || j.status === "processing");
        return job ? { videoId: v.id, jobId: job.id } : null;
      })
      .filter(Boolean) as { videoId: string; jobId: string }[];

    if (activeJobs.length === 0) return;

    async function poll() {
      const token = await getToken();
      if (!token) return;
      const updates: Record<string, number> = {};
      await Promise.all(
        activeJobs.map(async ({ videoId, jobId }) => {
          try {
            const job = await getJob(jobId, token);
            updates[videoId] = job.progress;
          } catch (err) {
            console.error(err);
          }
        })
      );
      setJobProgress((prev) => ({ ...prev, ...updates }));
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [videos, getToken]);

  // Poll regenerate jobs and refresh clips when they finish.
  useEffect(() => {
    const entries = Object.entries(regenerateJobs);
    if (entries.length === 0) return;

    let cancelled = false;
    async function poll() {
      const token = await getToken();
      if (!token || cancelled) return;
      await Promise.all(
        entries.map(async ([clipId, { jobId, videoId }]) => {
          try {
            const job = await getJob(jobId, token);
            if (cancelled) return;
            setRegenerateProgress((prev) => ({ ...prev, [clipId]: job.progress }));
            if (job.status === "done" || job.status === "failed") {
              setRegenerateJobs((prev) => {
                const next = { ...prev };
                delete next[clipId];
                return next;
              });
              setRegenerateProgress((prev) => {
                const next = { ...prev };
                delete next[clipId];
                return next;
              });
              try {
                const clips = await listClips(videoId, token);
                if (!cancelled) {
                  setClipsByVideo((prev) => ({ ...prev, [videoId]: clips }));
                }
              } catch (err) {
                console.error(err);
              }
            }
          } catch (err) {
            console.error(err);
          }
        })
      );
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [regenerateJobs, getToken]);

  // Listen for refresh events from the auto-refresh interval.
  useEffect(() => {
    function handleRefresh() {
      const token = getToken();
      token.then((t) => {
        listVideos(t)
          .then((data: Video[]) => {
            setVideos(data);
            const clipsMap: Record<string, Clip[]> = {};
            return Promise.all(
              data.map(async (video) => {
                if (video.status === "done" || video.status === "processing") {
                  clipsMap[video.id] = await listClips(video.id, t);
                }
              })
            ).then(() => setClipsByVideo(clipsMap));
          })
          .catch(console.error);
      });
    }

    window.addEventListener("clipforge-refresh-videos", handleRefresh);
    return () => window.removeEventListener("clipforge-refresh-videos", handleRefresh);
  }, [getToken]);

  async function handleDownload(clipId: string) {
    const token = await getToken();
    const { url } = await getClipDownloadUrl(clipId, token);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clip.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleShare(clipId: string) {
    const url = `${window.location.origin}/clip/${clipId}`;
    try {
      await navigator.clipboard.writeText(url);
      success("Share link copied to clipboard!");
    } catch {
      // Fallback for browsers that block clipboard access.
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      success("Share link copied to clipboard!");
    }
  }

  async function handleDeleteVideo(videoId: string) {
    if (!confirm("Delete this video and all its clips? This cannot be undone.")) return;
    setDeletingVideo(videoId);
    try {
      const token = await getToken();
      await deleteVideo(videoId, token);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setClipsByVideo((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
    } catch (err) {
      console.error(err);
      error("Failed to delete video.");
    } finally {
      setDeletingVideo(null);
    }
  }

  async function handleRetryVideo(videoId: string) {
    if (!confirm("Retry processing this video? This will use credits again.")) return;
    setRetryingVideo(videoId);
    try {
      const token = await getToken();
      await retryVideo(videoId, token);
      success("Video queued for retry.");
      window.dispatchEvent(new CustomEvent("clipforge-refresh-videos"));
    } catch (err) {
      console.error(err);
      error("Failed to retry video.");
    } finally {
      setRetryingVideo(null);
    }
  }

  async function handleDeleteClip(videoId: string, clipId: string) {
    if (!confirm("Delete this clip? This cannot be undone.")) return;
    setDeletingClip(clipId);
    try {
      const token = await getToken();
      await deleteClip(clipId, token);
      setClipsByVideo((prev) => ({
        ...prev,
        [videoId]: prev[videoId].filter((c) => c.id !== clipId),
      }));
    } catch (err) {
      console.error(err);
      error("Failed to delete clip.");
    } finally {
      setDeletingClip(null);
    }
  }

  function startEditing(clip: Clip) {
    setEditingClipId(clip.id);
    setEditStart(clip.start_time);
    setEditEnd(clip.end_time);
  }

  function cancelEditing() {
    setEditingClipId(null);
  }

  async function loadTranscript(videoId: string) {
    setTranscriptLoading((prev) => ({ ...prev, [videoId]: true }));
    try {
      const token = await getToken();
      const data = await getTranscript(videoId, token);
      setTranscripts((prev) => ({ ...prev, [videoId]: data.segments }));
    } catch (err) {
      console.error(err);
    } finally {
      setTranscriptLoading((prev) => ({ ...prev, [videoId]: false }));
    }
  }

  function toggleClipSelection(clipId: string) {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });
  }

  function selectAllClips(videoId: string, clipIds: string[]) {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      clipIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearVideoSelection(videoId: string) {
    setSelectedClips((prev) => {
      const next = new Set(prev);
      clipsByVideo[videoId]?.forEach((clip) => next.delete(clip.id));
      return next;
    });
  }

  async function handleBulkDelete(videoId: string) {
    const clipsToDelete = clipsByVideo[videoId]?.filter((c) => selectedClips.has(c.id)) ?? [];
    if (clipsToDelete.length === 0) return;
    if (!confirm(`Delete ${clipsToDelete.length} selected clip${clipsToDelete.length === 1 ? "" : "s"}? This cannot be undone.`))
      return;

    const token = await getToken();
    const results = await Promise.allSettled(
      clipsToDelete.map((clip) => deleteClip(clip.id, token))
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    setClipsByVideo((prev) => ({
      ...prev,
      [videoId]: prev[videoId].filter((c) => !selectedClips.has(c.id)),
    }));
    setSelectedClips((prev) => {
      const next = new Set(prev);
      clipsToDelete.forEach((c) => next.delete(c.id));
      return next;
    });

    if (failed > 0) {
      error(`${failed} clip${failed === 1 ? "" : "s"} failed to delete.`);
    }
  }

  function toggleTranscript(videoId: string) {
    setTranscriptExpanded((prev) => {
      const expanded = !prev[videoId];
      if (expanded) {
        loadTranscript(videoId);
      }
      return { ...prev, [videoId]: expanded };
    });
  }

  function updateSegmentText(videoId: string, index: number, text: string) {
    setTranscripts((prev) => {
      const segments = prev[videoId];
      if (!segments) return prev;
      const next = [...segments];
      next[index] = { ...next[index], text };
      return { ...prev, [videoId]: next };
    });
  }

  async function saveTranscript(videoId: string) {
    const segments = transcripts[videoId];
    if (!segments) return;
    setTranscriptSaving((prev) => ({ ...prev, [videoId]: true }));
    try {
      const token = await getToken();
      const data = await updateTranscript(videoId, segments, token);
      setTranscripts((prev) => ({ ...prev, [videoId]: data.segments }));
    } catch (err) {
      console.error(err);
      error("Failed to save captions.");
    } finally {
      setTranscriptSaving((prev) => ({ ...prev, [videoId]: false }));
    }
  }

  async function handleRegenerate(clipId: string, videoId: string) {
    if (editStart >= editEnd) {
      error("Start time must be before end time.");
      return;
    }

    setRegeneratingClip(clipId);
    try {
      const token = await getToken();
      await updateClip(clipId, { start_time: editStart, end_time: editEnd }, token);
      const job = await regenerateClip(clipId, token);
      setRegenerateJobs((prev) => ({ ...prev, [clipId]: { jobId: job.id, videoId } }));
      setRegenerateProgress((prev) => ({ ...prev, [clipId]: 0 }));
      setClipsByVideo((prev) => ({
        ...prev,
        [videoId]: prev[videoId].map((c) =>
          c.id === clipId ? { ...c, status: "processing" as const, output_url: undefined } : c
        ),
      }));
      setEditingClipId(null);
    } catch (err) {
      console.error(err);
      error("Failed to regenerate clip.");
    } finally {
      setRegeneratingClip(null);
    }
  }

  if (loading) {
    return <VideoListSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700 sm:p-12">
        <Film className="mx-auto h-12 w-12 text-zinc-400" />
        <h3 className="mt-5 text-lg font-semibold">No videos yet</h3>
        <p className="mx-auto mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Upload your first long-form video and ClipForge will generate vertical clips with captions.
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold dark:bg-zinc-800">
              1
            </span>
            Upload a video above
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold dark:bg-zinc-800">
              2
            </span>
            Choose language, captions, and voiceover
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold dark:bg-zinc-800">
              3
            </span>
            Download your clips
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your videos</h2>
      </div>

      {videos.map((video) => (
        <div
          key={video.id}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{video.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                {statusBadge(video.status)}
                {video.duration ? <span>• {formatDuration(video.duration)}</span> : null}
                {video.target_language ? (
                  <span>
                    • {video.source_language || "en"} → {video.target_language}
                  </span>
                ) : null}
                {video.audio_mode !== "subtitles_only" ? (
                  <span>• {formatAudioMode(video.audio_mode)}</span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-zinc-300 dark:border-zinc-700"
                  style={{ backgroundColor: video.subtitle_color }}
                />
                <span>Captions: {formatCaptionStyle(video)}</span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteVideo(video.id)}
              disabled={deletingVideo === video.id}
              className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950 sm:px-2"
              aria-label="Delete video"
            >
              {deletingVideo === video.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>

          {(video.status === "processing" || video.status === "uploaded") && (
            <div className="space-y-1.5 border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating clips... this page will refresh automatically.</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Longer videos or voiceover mode take more time. Credits are deducted when processing starts.
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-white"
                    style={{ width: `${jobProgress[video.id] ?? 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {jobProgress[video.id] ?? 0}%
                </span>
              </div>
            </div>
          )}

          {video.status === "failed" && (
            <div className="space-y-2 border-b border-zinc-100 bg-red-50 px-4 py-3 dark:border-zinc-800 dark:bg-red-950 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-red-700 dark:text-red-200">
                  <p className="font-medium">Processing failed</p>
                  {video.jobs?.[video.jobs.length - 1]?.error_message && (
                    <p className="mt-0.5 text-xs opacity-90">
                      {video.jobs[video.jobs.length - 1].error_message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRetryVideo(video.id)}
                  disabled={retryingVideo === video.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
                >
                  {retryingVideo === video.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Retry
                </button>
              </div>
            </div>
          )}

          {(video.status === "done" || video.status === "processing") && (
            <div className="border-b border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => toggleTranscript(video.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 sm:px-5"
              >
                <span className="flex items-center gap-2">
                  <Captions className="h-4 w-4 text-zinc-500" />
                  Captions
                </span>
                <span className="text-xs text-zinc-500">
                  {transcriptExpanded[video.id] ? "Hide" : "Edit"}
                </span>
              </button>

              {transcriptExpanded[video.id] && (
                <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
                  {transcriptLoading[video.id] ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading captions...
                    </div>
                  ) : transcripts[video.id]?.length ? (
                    <>
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        {transcripts[video.id].map((seg, idx) => (
                          <div key={idx} className="grid gap-2 sm:grid-cols-[80px_1fr]">
                            <div className="text-xs text-zinc-500">
                              {formatDuration(seg.start)} – {formatDuration(seg.end)}
                            </div>
                            <input
                              type="text"
                              value={seg.text}
                              onChange={(e) => updateSegmentText(video.id, idx, e.target.value)}
                              disabled={video.status === "processing" || transcriptSaving[video.id]}
                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-900 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => saveTranscript(video.id)}
                          disabled={video.status === "processing" || transcriptSaving[video.id]}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                        >
                          {transcriptSaving[video.id] && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Save captions
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No captions available yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {clipsByVideo[video.id]?.length > 0 && (
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {selectedClips.size > 0
                    ? `${selectedClips.size} selected`
                    : `${clipsByVideo[video.id].length} clip${clipsByVideo[video.id].length === 1 ? "" : "s"}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllClips(video.id, clipsByVideo[video.id].map((c) => c.id))}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={() => clearVideoSelection(video.id)}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Clear
                  </button>
                  {selectedClips.size > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBulkDelete(video.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete {selectedClips.size}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clipsByVideo[video.id].map((clip) => (
                  <div
                    key={clip.id}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <label className="absolute left-2 top-2 z-10 flex cursor-pointer items-center rounded-md bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 has-[:checked]:opacity-100">
                      <input
                        type="checkbox"
                        checked={selectedClips.has(clip.id)}
                        onChange={() => toggleClipSelection(clip.id)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </label>

                    {clip.output_url && clip.status !== "processing" ? (
                    <video
                      src={clip.output_url}
                      controls
                      crossOrigin="anonymous"
                      className="aspect-[9/16] w-full bg-black object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  )}

                  {editingClipId === clip.id ? (
                    <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Edit clip times</span>
                        <button
                          onClick={cancelEditing}
                          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="flex items-center justify-between text-xs text-zinc-500">
                            <span>Start</span>
                            <span>{formatDuration(editStart)}</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={video.duration ?? Math.max(editEnd, clip.end_time)}
                            step={0.1}
                            value={editStart}
                            onChange={(e) => setEditStart(Number(e.target.value))}
                            className="w-full"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={editStart}
                            onChange={(e) => setEditStart(Number(e.target.value))}
                            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-xs text-zinc-500">
                            <span>End</span>
                            <span>{formatDuration(editEnd)}</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={video.duration ?? Math.max(editEnd, clip.end_time)}
                            step={0.1}
                            value={editEnd}
                            onChange={(e) => setEditEnd(Number(e.target.value))}
                            className="w-full"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={editEnd}
                            onChange={(e) => setEditEnd(Number(e.target.value))}
                            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        {editStart >= editEnd && (
                          <p className="text-xs text-red-600">Start must be before end.</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRegenerate(clip.id, video.id)}
                        disabled={regeneratingClip === clip.id || editStart >= editEnd}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                      >
                        {regeneratingClip === clip.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {regeneratingClip === clip.id ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="text-xs text-zinc-500">
                        <div>
                          {formatDuration(clip.start_time)} – {formatDuration(clip.end_time)}
                        </div>
                        {clip.score > 0 ? <div>Score: {clip.score.toFixed(2)}</div> : null}
                        <div className="mt-0.5 flex items-center gap-2">
                          <span title="Views">{clip.view_count.toLocaleString()} views</span>
                          <span>•</span>
                          <span title="Downloads">{clip.download_count.toLocaleString()} downloads</span>
                        </div>
                        {regenerateProgress[clip.id] !== undefined && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className="h-1.5 rounded-full bg-zinc-900 dark:bg-white"
                                style={{ width: `${regenerateProgress[clip.id]}%` }}
                              />
                            </div>
                            <span className="text-[10px]">{regenerateProgress[clip.id]}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {clip.output_url && clip.status === "done" && (
                          <>
                            <button
                              onClick={() => handleShare(clip.id)}
                              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                              title="Share clip"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(clip.id)}
                              className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                              title="Download clip"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => startEditing(clip)}
                          disabled={clip.status === "processing"}
                          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                          title="Edit clip"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClip(video.id, clip.id)}
                          disabled={deletingClip === clip.id}
                          className="rounded-md p-1.5 text-zinc-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                          title="Delete clip"
                        >
                          {deletingClip === clip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {video.status === "done" && !clipsByVideo[video.id]?.length && (
            <div className="space-y-2 border-t border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">
              <p className="font-medium">No clips were generated</p>
              <p>
                This usually happens when the video is very short, has no detectable speech, or no
                strong hook moments. Try a longer video or adjust the caption/voiceover settings and
                re-upload.
              </p>
            </div>
          )}
        </div>
      ))}

      {shortcutsOpen && (
        <ShortcutsHelp
          shortcuts={[
            { key: "?", description: "Open keyboard shortcuts", action: () => {} },
            { key: "r", description: "Refresh videos", action: () => {} },
            { key: "Escape", description: "Close editing or shortcuts", action: () => {} },
          ]}
          onClose={() => setShortcutsOpen(false)}
        />
      )}
    </div>
  );
}
