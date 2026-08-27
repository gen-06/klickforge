"""Subtitle generation: Whisper transcription + OpenAI translation."""

from pathlib import Path

from openai import OpenAI

from app.config import settings


def _get_client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def transcribe_to_segments(audio_path: str, language: str) -> list[dict]:
    """Transcribe an audio file into timestamped segments using Whisper."""
    client = _get_client()
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = []
    for seg in transcript.segments:
        text = (seg.text or "").strip()
        if text:
            segments.append(
                {
                    "start": float(seg.start),
                    "end": float(seg.end),
                    "text": text,
                }
            )
    return segments


def translate_segments(segments: list[dict], target_language: str) -> list[dict]:
    """Translate a list of subtitle segments to the target language."""
    if not segments:
        return []

    client = _get_client()
    source_texts = [seg["text"] for seg in segments]
    joined = "\n".join(source_texts)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"Translate the following subtitle lines to {target_language}. "
                    "Preserve meaning and keep each line roughly the same length. "
                    "Return exactly the same number of lines as the input, one translation per line. "
                    "Do not add numbering, prefixes, or extra commentary."
                ),
            },
            {"role": "user", "content": joined},
        ],
        temperature=0.3,
    )

    translated_text = response.choices[0].message.content or ""
    translated_lines = translated_text.strip().splitlines()

    # If the model didn't preserve line count, fall back to original text.
    if len(translated_lines) != len(source_texts):
        translated_lines = source_texts

    return [
        {
            "start": seg["start"],
            "end": seg["end"],
            "text": line.strip(),
        }
        for seg, line in zip(segments, translated_lines)
    ]


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp HH:MM:SS,mmm."""
    milliseconds = int(round((seconds % 1) * 1000))
    total_seconds = int(seconds)
    hrs = total_seconds // 3600
    mins = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{milliseconds:03d}"


def write_srt(segments: list[dict], path: str):
    """Write segments to an SRT subtitle file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, start=1):
            f.write(f"{i}\n")
            f.write(f"{_format_srt_time(seg['start'])} --> {_format_srt_time(seg['end'])}\n")
            f.write(f"{seg['text']}\n\n")


def filter_and_shift_segments(
    segments: list[dict], start: float, end: float
) -> list[dict]:
    """Return segments that overlap [start, end], with timestamps shifted."""
    result = []
    for seg in segments:
        if seg["end"] <= start or seg["start"] >= end:
            continue
        result.append(
            {
                "start": max(0.0, seg["start"] - start),
                "end": min(end - start, seg["end"] - start),
                "text": seg["text"],
            }
        )
    return result
