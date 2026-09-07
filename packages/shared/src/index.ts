export interface CaptionStyle {
  font: string;
  size: number;
  color: string;
  position: "bottom" | "middle" | "top";
  outline: number;
  outline_color: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Video {
  id: string;
  user_id: string;
  title: string;
  source_key: string;
  source_url?: string;
  source_language?: string;
  target_language?: string;
  subtitle_font: string;
  subtitle_size: number;
  subtitle_color: string;
  // Backend stores this as a free-form string (see app/models.py); the
  // upload form only ever sends "bottom" | "middle" | "top" (CaptionStyle
  // above), but other values like "bottom-center" are valid and supported
  // by the worker's alignment mapping.
  subtitle_position: string;
  subtitle_outline: number;
  subtitle_outline_color: string;
  audio_mode: "subtitles_only" | "voiceover" | "voiceover_with_original";
  voice?: string;
  status: "pending" | "uploaded" | "processing" | "done" | "failed";
  duration?: number;
  jobs?: Job[];
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  score: number;
  output_url?: string;
  status: "pending" | "processing" | "done" | "failed";
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  video_id: string;
  type: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  plan: string;
  credits_balance: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
}
