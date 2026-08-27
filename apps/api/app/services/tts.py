"""Text-to-speech voiceover generation using OpenAI."""

from pathlib import Path

from openai import OpenAI

from app.config import settings


DEFAULT_VOICE = "alloy"
OPENAI_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}


def _get_client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def validate_voice(voice: str | None) -> str:
    """Return a valid OpenAI TTS voice, falling back to the default."""
    if voice and voice.lower() in OPENAI_VOICES:
        return voice.lower()
    return DEFAULT_VOICE


def voice_for_language(language: str | None) -> str:
    """Suggest a default voice for a target language."""
    mapping = {
        "en": "alloy",
        "es": "nova",
        "fr": "nova",
        "de": "fable",
        "ar": "onyx",
        "hi": "nova",
        "pt": "nova",
        "zh": "nova",
    }
    return mapping.get(language, DEFAULT_VOICE) if language else DEFAULT_VOICE


def generate_voiceover(text: str, output_path: str, voice: str | None = None) -> str:
    """Generate an MP3 voiceover from text and write it to output_path.

    Returns the output path.
    """
    if not text.strip():
        raise ValueError("Voiceover text cannot be empty")

    client = _get_client()
    chosen_voice = validate_voice(voice)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    response = client.audio.speech.create(
        model="tts-1",
        voice=chosen_voice,  # type: ignore[arg-type]
        input=text.strip(),
    )
    response.stream_to_file(output_path)
    return output_path
