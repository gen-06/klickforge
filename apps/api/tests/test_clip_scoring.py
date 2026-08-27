"""Unit tests for clip scoring heuristics."""

from app.services.clip_scoring import score_segments


def _segments_from_texts(texts: list[str], duration_per_seg: float = 3.0) -> list[dict]:
    segments = []
    start = 0.0
    for text in texts:
        end = start + duration_per_seg
        segments.append({"start": start, "end": end, "text": text})
        start = end
    return segments


def test_prefers_hook_phrases():
    texts = [
        "So today I want to talk about something boring.",
        "Here's the thing, most people get this wrong.",
        "They think it's about luck but it's not.",
        "Let me show you exactly what I mean.",
        "This is why the strategy works every time.",
        "Anyway, thanks for watching.",
    ]
    segments = _segments_from_texts(texts)
    duration = segments[-1]["end"]
    clips = score_segments(segments, duration, 5, 10, 2)

    assert len(clips) == 2
    # The best clip should start around the hook phrase "Here's the thing".
    best_start, best_end, best_score = clips[0]
    assert best_start <= 3.0  # second segment starts at 3s
    assert best_score > 0


def test_spreads_clips_across_video():
    texts = [
        "Here's the thing, part one is amazing.",
        "Let me show you why.",
        "Some filler content here.",
        "More filler content here.",
        "And now here's the thing again later.",
        "This part is also great.",
    ]
    segments = _segments_from_texts(texts)
    duration = segments[-1]["end"]
    clips = score_segments(segments, duration, 5, 10, 2)

    assert len(clips) == 2
    starts = [c[0] for c in clips]
    # Clips should cover different parts of the video, not be clustered together.
    assert max(starts) - min(starts) >= 3.0


def test_complete_thought_bonus():
    texts = [
        "So why does this matter?",
        "Here's what it means for you.",
        "You can apply this today.",
        "Random other stuff here.",
        "That's why I recommend it.",
    ]
    segments = _segments_from_texts(texts)
    duration = segments[-1]["end"]
    clips = score_segments(segments, duration, 5, 10, 1)

    assert len(clips) == 1
    start, end, score = clips[0]
    # The clip should include both a question segment and a payoff segment.
    clip_texts = [seg["text"] for seg in segments if seg["end"] > start and seg["start"] < end]
    assert any("?" in t for t in clip_texts)
    assert any(any(p in t.lower() for p in ["here's what", "that's why"]) for t in clip_texts)


def test_respects_duration_bounds():
    texts = [f"Sentence number {i} in this video." for i in range(20)]
    segments = _segments_from_texts(texts)
    duration = segments[-1]["end"]
    clips = score_segments(segments, duration, 5, 10, 3)

    assert len(clips) <= 3
    for start, end, _ in clips:
        clip_dur = end - start
        assert 5 <= clip_dur <= 10


def test_no_segments_returns_empty():
    assert score_segments([], 0, 5, 10, 3) == []


def test_energy_words_boost_score():
    texts = [
        "This is a normal sentence.",
        "This is an absolutely incredible result.",
        "You won't believe what happened next.",
    ]
    segments = _segments_from_texts(texts)
    duration = segments[-1]["end"]
    clips = score_segments(segments, duration, 5, 10, 1)

    assert len(clips) == 1
    # Should pick a clip that includes the energy words (not the boring first segment alone).
    start, end, _ = clips[0]
    clip_texts = [seg["text"] for seg in segments if seg["end"] > start and seg["start"] < end]
    assert any("absolutely incredible" in t.lower() for t in clip_texts)
