import type { CaptionStyle, TranscriptSegment } from "@youtubers/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown, status?: number): boolean {
  if (status !== undefined) {
    return status >= 500 || status === 429;
  }
  return (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network|abort/i.test(error.message))
  );
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok && isRetryable(null, res.status) && attempt < retries) {
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        await sleep(delay);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt >= retries) {
        throw error;
      }
      const delay = RETRY_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Fallback for refreshing an expired Clerk token outside of React: the
// ClerkProvider exposes a global `window.Clerk` once loaded, whose session
// always returns a live (auto-refreshed) token. Used to retry requests that
// fail because the token passed in by the caller went stale mid-flight
// (e.g. a long-running upload holding a token fetched at the start).
async function getFreshTokenFallback(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const clerk = (window as unknown as { Clerk?: { session?: { getToken(): Promise<string | null> } } }).Clerk;
  try {
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetchWithRetry(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && token) {
    const text = await res.text();
    if (/expired/i.test(text)) {
      const freshToken = await getFreshTokenFallback();
      if (freshToken && freshToken !== token) {
        res = await fetchWithRetry(`${API_URL}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${freshToken}` },
        });
      } else {
        throw new ApiError(text || `Request failed: ${res.status}`, res.status);
      }
    } else {
      throw new ApiError(text || `Request failed: ${res.status}`, res.status);
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || `Request failed: ${res.status}`, res.status);
  }
  if (res.status === 204) {
    return undefined;
  }
  return res.json();
}

export async function getPresignedUploadUrl(
  filename: string,
  fileSize?: number,
  contentType?: string,
  token?: string | null
) {
  const params = new URLSearchParams();
  params.set("filename", filename);
  if (fileSize !== undefined) params.set("file_size", String(fileSize));
  if (contentType) params.set("content_type", contentType);

  return apiFetch(`/api/v1/videos/presigned-upload?${params.toString()}`, { method: "POST" }, token) as Promise<{
    key: string;
    url: string;
  }>;
}

export async function createVideo(
  title: string,
  sourceKey: string,
  sourceLanguage: string,
  targetLanguage: string | null,
  subtitleStyle: CaptionStyle,
  audioMode: "subtitles_only" | "voiceover" | "voiceover_with_original" = "subtitles_only",
  voice: string = "alloy",
  token?: string | null
) {
  return apiFetch(
    "/api/v1/videos",
    {
      method: "POST",
      body: JSON.stringify({
        title,
        source_key: sourceKey,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        subtitle_font: subtitleStyle.font,
        subtitle_size: subtitleStyle.size,
        subtitle_color: subtitleStyle.color,
        subtitle_position: subtitleStyle.position,
        subtitle_outline: subtitleStyle.outline,
        subtitle_outline_color: subtitleStyle.outline_color,
        audio_mode: audioMode,
        voice,
      }),
    },
    token
  );
}

export interface ClipUpdatePayload {
  start_time: number;
  end_time: number;
}

export async function updateClip(
  clipId: string,
  payload: ClipUpdatePayload,
  token?: string | null
) {
  return apiFetch(`/api/v1/clips/${clipId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function regenerateClip(clipId: string, token?: string | null) {
  return apiFetch(`/api/v1/clips/${clipId}/regenerate`, { method: "POST" }, token) as Promise<{
    id: string;
    video_id: string;
    type: string;
    status: string;
    progress: number;
  }>;
}

export async function completeUpload(videoId: string, token?: string | null) {
  return apiFetch(`/api/v1/videos/${videoId}/complete`, { method: "POST" }, token);
}

export async function retryVideo(videoId: string, token?: string | null) {
  return apiFetch(`/api/v1/videos/${videoId}/retry`, { method: "POST" }, token) as Promise<{
    id: string;
    video_id: string;
    type: string;
    status: string;
    progress: number;
  }>;
}

export async function listVideos(token?: string | null) {
  return apiFetch("/api/v1/videos", {}, token);
}

export async function listClips(videoId: string, token?: string | null) {
  return apiFetch(`/api/v1/videos/${videoId}/clips`, {}, token);
}

export async function getJob(jobId: string, token?: string | null) {
  return apiFetch(`/api/v1/jobs/${jobId}`, {}, token);
}

export async function getClipDownloadUrl(clipId: string, token?: string | null) {
  return apiFetch(`/api/v1/clips/${clipId}/download`, {}, token) as Promise<{ url: string }>;
}

export async function recordClipView(clipId: string) {
  return apiFetch(`/api/v1/clips/${clipId}/view`, { method: "POST" }, null);
}

export async function deleteVideo(videoId: string, token?: string | null) {
  return apiFetch(`/api/v1/videos/${videoId}`, { method: "DELETE" }, token);
}

export async function deleteClip(clipId: string, token?: string | null) {
  return apiFetch(`/api/v1/clips/${clipId}`, { method: "DELETE" }, token);
}

export async function getTranscript(videoId: string, token?: string | null) {
  return apiFetch(`/api/v1/videos/${videoId}/transcript`, {}, token) as Promise<{
    segments: TranscriptSegment[];
    language: string | null;
  }>;
}

export async function updateTranscript(
  videoId: string,
  segments: TranscriptSegment[],
  token?: string | null
) {
  return apiFetch(
    `/api/v1/videos/${videoId}/transcript`,
    { method: "PUT", body: JSON.stringify({ segments }) },
    token
  ) as Promise<{ segments: TranscriptSegment[]; language: string | null }>;
}

export async function getCurrentUser(token?: string | null) {
  return apiFetch("/api/v1/users/me", {}, token) as Promise<{
    id: string;
    credits_balance: number;
    credits_used: number;
  }>;
}

export interface ActivityItem {
  type: "video_upload" | "job_update";
  title: string;
  status: string;
  progress?: number;
  error_message?: string;
  created_at: string;
}

export async function getActivity(token?: string | null) {
  return apiFetch("/api/v1/users/me/activity", {}, token) as Promise<{
    items: ActivityItem[];
  }>;
}

export async function joinWaitlist(email: string, source?: string) {
  return apiFetch("/api/v1/waitlist", {
    method: "POST",
    body: JSON.stringify({ email, source }),
  }) as Promise<{ status: string; email: string }>;
}

export interface WaitlistEntry {
  email: string;
  source: string | null;
  created_at: string;
}

export async function getWaitlist(token?: string | null) {
  return apiFetch("/api/v1/waitlist", {}, token) as Promise<{
    count: number;
    emails: WaitlistEntry[];
  }>;
}

export interface Subscription {
  subscription_id: string;
  status: string;
  tier: "starter" | "pro" | "advanced" | null;
  plan_name: string | null;
  next_billed_at: string | null;
  scheduled_change_action: string | null;
  scheduled_change_at: string | null;
}

export interface CreditPack {
  price_id: string;
  credits: number;
  label: string;
}

export async function getSubscription(token?: string | null) {
  return apiFetch("/api/v1/billing/subscription", {}, token) as Promise<Subscription>;
}

export async function openCustomerPortal(token?: string | null) {
  return apiFetch("/api/v1/billing/portal", { method: "POST" }, token) as Promise<{
    url: string;
  }>;
}

export async function getCreditPacks(token?: string | null) {
  return apiFetch("/api/v1/billing/credits/packs", {}, token) as Promise<CreditPack[]>;
}

