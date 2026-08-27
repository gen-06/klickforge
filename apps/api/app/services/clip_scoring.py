"""Transcript-aware clip detection and scoring."""

import re


# Hook phrases that tend to indicate an engaging moment.
_HOOK_PHRASES = [
    "here's the thing",
    "the thing is",
    "the secret",
    "wait",
    "imagine",
    "you won't believe",
    "you will not believe",
    "this is why",
    "the reason",
    "listen",
    "look",
    "okay so",
    "ok so",
    "let me tell you",
    "let me show you",
    "the truth is",
    "the problem is",
    "the best part",
    "the crazy part",
    "what most people don't know",
    "what if i told you",
    "the real reason",
    "the hidden",
    "nobody talks about",
    "most people",
    "the mistake",
    "the biggest mistake",
    "the key",
    "the trick",
    "the hack",
    "the shortcut",
    "the reality",
    "the fact is",
    "here's why",
    "this changes everything",
    "i'm going to show you",
    "watch this",
    "check this out",
    "listen carefully",
    "pay attention",
    "the bottom line",
    "at the end of the day",
    "it all comes down to",
    "the one thing",
    "the only thing",
    "you need to know",
    "don't miss",
    "the surprising",
    "the shocking",
    "the unexpected",
    "the worst part",
    "the hardest part",
]

# Words that signal high energy or strong emotion.
_ENERGY_WORDS = [
    "amazing",
    "incredible",
    "insane",
    "crazy",
    "unbelievable",
    "shocking",
    "surprising",
    "mind-blowing",
    "game-changing",
    "revolutionary",
    "powerful",
    "massive",
    "huge",
    "essential",
    "critical",
    "urgent",
    "must",
    "never",
    "always",
    "definitely",
    "absolutely",
    "literally",
    "seriously",
    "honestly",
    "frankly",
]

# Phrases that suggest a complete thought or payoff.
_PAYOFF_PHRASES = [
    "so here's",
    "so the",
    "so what",
    "that's why",
    "which means",
    "this means",
    "as a result",
    "in conclusion",
    "to sum up",
    "the bottom line is",
    "what this means",
    "here's what",
]

# Common stopwords to exclude from density scoring.
_STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "for",
    "with",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "from",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "can",
    "will",
    "just",
    "should",
    "now",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "them",
    "their",
    "this",
    "that",
    "these",
    "those",
    "am",
    "has",
    "have",
    "had",
    "do",
    "does",
    "did",
    "would",
    "could",
}


def _segment_texts(segments: list[dict], start: float, end: float) -> list[str]:
    """Return subtitle texts that overlap with the given time window."""
    return [
        seg["text"]
        for seg in segments
        if seg["end"] > start and seg["start"] < end
    ]


def _is_sentence_start(segments: list[dict], index: int) -> bool:
    """Heuristic: a subtitle starts a sentence if it's the first one, follows a pause,
    or follows a sentence-ending punctuation."""
    if index <= 0:
        return True
    prev = segments[index - 1]
    curr = segments[index]
    if curr["start"] - prev["end"] > 0.4:
        return True
    return bool(re.search(r"[.!?]\s*$", prev["text"]))


def _is_sentence_end(segments: list[dict], index: int) -> bool:
    """Heuristic: a subtitle ends a sentence if it's the last one, is followed by a pause,
    or ends with sentence-ending punctuation."""
    if index >= len(segments) - 1:
        return True
    curr = segments[index]
    nxt = segments[index + 1]
    if nxt["start"] - curr["end"] > 0.4:
        return True
    return bool(re.search(r"[.!?]\s*$", curr["text"]))


def _boundary_score(segments: list[dict], start: float, end: float) -> float:
    """Score how well the window boundaries align with sentence boundaries."""
    if not segments:
        return 0.0

    start_index = None
    end_index = None
    for i, seg in enumerate(segments):
        if start_index is None and seg["start"] >= start - 0.5:
            start_index = i
        if seg["end"] <= end + 0.5:
            end_index = i

    if start_index is None or end_index is None or start_index > end_index:
        return 0.0

    score = 0.0
    if _is_sentence_start(segments, start_index):
        score += 0.5
    if _is_sentence_end(segments, end_index):
        score += 0.5
    return score


def _engagement_score(texts: list[str]) -> float:
    """Score based on hook phrases, energy words, questions, and exclamations."""
    if not texts:
        return 0.0

    joined = " ".join(texts).lower()
    score = 0.0

    for phrase in _HOOK_PHRASES:
        score += joined.count(phrase) * 1.0

    for word in _ENERGY_WORDS:
        score += joined.count(f" {word} ") * 0.8

    for phrase in _PAYOFF_PHRASES:
        score += joined.count(phrase) * 1.0

    full_text = " ".join(texts)
    score += full_text.count("?") * 0.6
    score += full_text.count("!") * 0.4
    return score


def _density_score(texts: list[str], duration: float) -> float:
    """Content words per second."""
    if not texts or duration <= 0:
        return 0.0

    words = re.findall(r"\b[a-zA-Z']+\b", " ".join(texts).lower())
    content_words = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    return len(content_words) / duration


def _position_score(start: float, duration: float) -> float:
    """Slight preference for earlier segments."""
    if duration <= 0:
        return 0.0
    return max(0.0, 1.0 - (start / duration))


def _complete_thought_score(segments: list[dict], start: float, end: float) -> float:
    """Reward clips that contain a question followed by an answer or problem + payoff."""
    clip_segments = [
        seg for seg in segments if seg["end"] > start and seg["start"] < end
    ]
    if len(clip_segments) < 2:
        return 0.0

    has_question = any("?" in seg["text"] for seg in clip_segments[:-1])
    has_payoff = any(
        any(p in seg["text"].lower() for p in _PAYOFF_PHRASES)
        for seg in clip_segments[1:]
    )

    score = 0.0
    if has_question and has_payoff:
        score += 1.0
    elif has_question:
        score += 0.3
    return score


def _diversity_score(start: float, end: float, selected_ranges: list[tuple[float, float]], duration: float) -> float:
    """Reward candidates that are far from already-selected clips so the final set spans the video."""
    if not selected_ranges or duration <= 0:
        return 1.0

    center = (start + end) / 2
    min_distance = min(abs(center - (s + e) / 2) for s, e in selected_ranges)
    normalized = min(min_distance / (duration * 0.25), 1.0)
    return normalized


def score_segments(
    segments: list[dict],
    duration: float,
    min_dur: int,
    max_dur: int,
    target: int,
    step: float = 5.0,
) -> list[tuple[float, float, float]]:
    """Generate and score candidate clip windows, then return the best non-overlapping ones."""
    if duration <= 0 or not segments:
        return []

    candidates = []
    window_sizes = list(range(min_dur, min(max_dur, int(duration)) + 1, 5))
    if not window_sizes:
        window_sizes = [min_dur]

    for window in window_sizes:
        start = 0.0
        while start + min_dur <= duration:
            end = min(start + window, duration)
            if end - start < min_dur:
                start += step
                continue

            texts = _segment_texts(segments, start, end)
            seg_duration = end - start

            boundary = _boundary_score(segments, start, end)
            engagement = _engagement_score(texts)
            density = _density_score(texts, seg_duration)
            position = _position_score(start, duration)
            complete = _complete_thought_score(segments, start, end)

            # Combined score with tuned weights.
            score = (
                boundary * 2.0
                + engagement * 1.5
                + density * 0.5
                + position * 0.3
                + complete * 1.5
            )

            candidates.append((start, end, score))
            start += step

    # Greedy selection with diversity bonus so clips spread across the video.
    candidates.sort(key=lambda x: x[2], reverse=True)
    selected = []
    used_ranges: list[tuple[float, float]] = []

    while len(selected) < target and candidates:
        best_index = None
        best_adjusted = -float("inf")

        for i, (start, end, score) in enumerate(candidates):
            if any(start < used_end and end > used_start for used_start, used_end in used_ranges):
                continue
            diversity = _diversity_score(start, end, used_ranges, duration)
            adjusted = score * (0.7 + 0.3 * diversity)
            if adjusted > best_adjusted:
                best_adjusted = adjusted
                best_index = i

        if best_index is None:
            break

        start, end, score = candidates.pop(best_index)
        selected.append((start, end, score))
        used_ranges.append((start, end))

    # Return sorted by start time.
    selected.sort(key=lambda x: x[0])
    return selected
