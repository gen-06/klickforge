"""Paddle webhook signature verification."""

import hashlib
import hmac
import json


def verify_paddle_signature(payload: bytes, signature_header: str, secret: str) -> dict:
    """Verify a Paddle webhook signature and return the parsed payload.

    Paddle sends the header as: "t=<timestamp>,v1=<signature>"
    The signature is HMAC-SHA256 of "<timestamp>.<body>" using the webhook secret.
    """
    parts = {}
    for part in signature_header.split(","):
        if "=" in part:
            key, value = part.split("=", 1)
            parts[key.strip()] = value.strip()

    timestamp = parts.get("t")
    signature = parts.get("v1")
    if not timestamp or not signature:
        raise ValueError("Invalid Paddle signature header")

    expected = hmac.new(
        secret.encode("utf-8"),
        f"{timestamp}.{payload.decode('utf-8')}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise ValueError("Paddle signature mismatch")

    data = json.loads(payload)
    return data
