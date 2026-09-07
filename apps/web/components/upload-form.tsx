"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, Loader2, Upload } from "lucide-react";
import type { CaptionStyle } from "@youtubers/shared";
import { completeUpload, createVideo, getCurrentUser, getPresignedUploadUrl } from "@/lib/api";

function uploadFileWithProgress(
  file: File,
  url: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload to storage failed: ${xhr.statusText || xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload to storage failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}

interface UploadFormProps {
  onUploaded?: () => void;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
];

const AUDIO_MODES: { value: "subtitles_only" | "voiceover" | "voiceover_with_original"; label: string }[] = [
  { value: "subtitles_only", label: "Subtitles only (original audio)" },
  { value: "voiceover", label: "AI voiceover (translated audio)" },
  { value: "voiceover_with_original", label: "AI voiceover + original background" },
];

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  font: "Arial",
  size: 56,
  color: "#FFFFFF",
  position: "bottom",
  outline: 2,
  outline_color: "#000000",
};

export function UploadForm({ onUploaded }: UploadFormProps) {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [showStyles, setShowStyles] = useState(false);
  const [audioMode, setAudioMode] = useState<"subtitles_only" | "voiceover" | "voiceover_with_original">("subtitles_only");
  const [voice, setVoice] = useState("alloy");
  const [credits, setCredits] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const MAX_SIZE_MB = 2048;
  const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
  const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv"];

  useEffect(() => {
    let cancelled = false;
    async function loadCredits() {
      try {
        const token = await getToken();
        const user = await getCurrentUser(token);
        if (!cancelled) setCredits(user.credits_balance);
      } catch (err) {
        console.error(err);
      }
    }
    loadCredits();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const [duration, setDuration] = useState<number | null>(null);

  const estimatedCost =
    duration !== null
      ? Math.max(1, Math.ceil(duration * (audioMode === "subtitles_only" ? 1 : 2)))
      : null;

  function loadDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  }

  function validateFile(file: File): string | null {
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      return `File is too large (${sizeMb.toFixed(1)} MB). Max size is ${MAX_SIZE_MB} MB.`;
    }
    const isAcceptedType = ACCEPTED_TYPES.includes(file.type);
    const hasAcceptedExt = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!isAcceptedType && !hasAcceptedExt) {
      return "Please upload a video file (MP4, MOV, WebM, or MKV).";
    }
    return null;
  }

  async function handleFile(file: File | null) {
    setFileError(null);
    if (!file) {
      setFile(null);
      setDuration(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      setFile(null);
      setDuration(null);
      return;
    }
    setFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    const loaded = await loadDuration(file);
    setDuration(loaded);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0] || null;
    handleFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    if (fileError) return;
    if (credits !== null && estimatedCost !== null && estimatedCost > credits) {
      setError("Not enough credits. Upgrade your plan to upload this video.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(15);
      const { key, url: uploadUrl } = await getPresignedUploadUrl(
        file.name,
        file.size,
        file.type,
        await getToken()
      );

      await uploadFileWithProgress(file, uploadUrl, (uploadPercent) => {
        // Show real bytes-uploaded progress while leaving room for the
        // post-upload server steps.
        setProgress(15 + Math.round(uploadPercent * 0.55));
      });

      // Fetch a fresh token for each call below — the R2 upload above can take
      // a while for large files, long enough for the previous Clerk session
      // token to expire.
      const video = await createVideo(
        title,
        key,
        sourceLanguage,
        targetLanguage || null,
        captionStyle,
        audioMode,
        voice,
        await getToken()
      );
      setProgress(80);
      await completeUpload(video.id, await getToken());
      setProgress(100);
      setFile(null);
      setTitle("");
      setCaptionStyle(DEFAULT_CAPTION_STYLE);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-lg font-semibold">Upload a long video</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Turn one video into multiple vertical clips with captions and voiceovers.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Source language</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Translate subtitles to</label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const value = e.target.value;
                setTargetLanguage(value);
                if (!value) {
                  setAudioMode("subtitles_only");
                }
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Original audio (no subtitles)</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Audio</label>
            <select
              value={audioMode}
              onChange={(e) =>
                setAudioMode(e.target.value as "subtitles_only" | "voiceover" | "voiceover_with_original")
              }
              disabled={!targetLanguage}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {AUDIO_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            {!targetLanguage && (
              <p className="mt-1 text-xs text-zinc-500">Select a target language to enable voiceover.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              disabled={audioMode === "subtitles_only" || !targetLanguage}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-zinc-900 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Video file</label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              dragActive
                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            }`}
          >
            <Upload className="h-8 w-8 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {file ? (
                <span className="font-medium text-zinc-900 dark:text-white">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-zinc-900 dark:text-white">Click to upload</span>{" "}
                  or drag and drop
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              MP4, MOV, WebM, or MKV up to {MAX_SIZE_MB} MB
            </p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              required
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
          {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowStyles((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span>Caption style</span>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${showStyles ? "rotate-180" : ""}`}
            />
          </button>
          {showStyles && (
            <div className="space-y-4 border-t border-zinc-200 px-4 pb-4 pt-3 dark:border-zinc-800">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium">Font</label>
                  <input
                    type="text"
                    value={captionStyle.font}
                    onChange={(e) =>
                      setCaptionStyle((s) => ({ ...s, font: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Size (px)</label>
                  <input
                    type="number"
                    min={12}
                    max={120}
                    value={captionStyle.size}
                    onChange={(e) =>
                      setCaptionStyle((s) => ({ ...s, size: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium">Text color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={captionStyle.color}
                      onChange={(e) =>
                        setCaptionStyle((s) => ({ ...s, color: e.target.value }))
                      }
                      className="h-9 w-9 rounded border border-zinc-300 bg-transparent p-0.5 dark:border-zinc-700"
                    />
                    <span className="text-xs text-zinc-500">{captionStyle.color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium">Outline color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={captionStyle.outline_color}
                      onChange={(e) =>
                        setCaptionStyle((s) => ({ ...s, outline_color: e.target.value }))
                      }
                      className="h-9 w-9 rounded border border-zinc-300 bg-transparent p-0.5 dark:border-zinc-700"
                    />
                    <span className="text-xs text-zinc-500">{captionStyle.outline_color}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium">Outline width</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={captionStyle.outline}
                    onChange={(e) =>
                      setCaptionStyle((s) => ({ ...s, outline: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Position</label>
                  <select
                    value={captionStyle.position}
                    onChange={(e) =>
                      setCaptionStyle((s) => ({
                        ...s,
                        position: e.target.value as CaptionStyle["position"],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="middle">Middle</option>
                    <option value="top">Top</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {uploading && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-zinc-900 transition-all dark:bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">Processing... {progress}%</p>
          </div>
        )}

        {estimatedCost !== null && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Estimated cost: <span className="font-medium">{estimatedCost} credits</span>
            {credits !== null && (
              <span className="ml-2 text-zinc-500">(balance: {credits})</span>
            )}
          </p>
        )}

        {credits !== null && credits <= 0 && (
          <p className="text-sm text-red-600">
            You have no credits left.{" "}
            <a href="/pricing" className="underline">
              Upgrade plan
            </a>
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={uploading || !file || !title || (credits !== null && credits <= 0)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload & Split"}
        </button>
      </div>
    </form>
  );
}
