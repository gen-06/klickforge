"""Billing helpers: credit cost calculation."""


# Cost in credits per source video second.
CREDIT_RATES = {
    "subtitles_only": 1,
    "voiceover": 2,
    "voiceover_with_original": 2,
}


def calculate_cost(duration_seconds: float, audio_mode: str) -> int:
    """Return the credit cost for processing a video of the given duration."""
    rate = CREDIT_RATES.get(audio_mode, 1)
    return max(1, int(duration_seconds * rate))
