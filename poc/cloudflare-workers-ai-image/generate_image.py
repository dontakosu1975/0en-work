"""Minimal Cloudflare Workers AI text-to-image PoC.

Reads credentials from environment variables, calls the Workers AI REST API,
and saves the returned image as PNG. No credential is written or printed.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"
DEFAULT_PROMPT = (
    "日本の中小企業の明るく現代的なオフィス。採用担当者または経営者がノートPCで求人情報を作成している自然な場面。"
    "BtoB SaaSのランディングページ向けの写実的な写真。人物は右側、左側には見出しとCTAを配置できる広い余白。"
    "自然な表情、清潔感、信頼感。典型的なストックフォト風の腕組みポーズは避ける。文字、ロゴ、透かしなし。横長。"
)
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def parse_image_bytes(payload: dict) -> bytes:
    """Extract the base64 image from the Workers AI response envelope."""

    result = payload.get("result")
    if isinstance(result, dict):
        encoded = result.get("image")
    elif isinstance(result, str):
        encoded = result
    else:
        encoded = None

    if not isinstance(encoded, str) or not encoded.strip():
        raise ValueError("Workers AI response did not contain result.image")

    # Be tolerant if an API/client returns a data URI instead of bare Base64.
    if "," in encoded and encoded.startswith("data:"):
        encoded = encoded.split(",", 1)[1]
    return base64.b64decode(encoded, validate=True)


def save_as_png(raw: bytes, output: Path) -> str:
    """Save PNG directly, or convert another common image format with Pillow."""

    output.parent.mkdir(parents=True, exist_ok=True)
    if raw.startswith(PNG_SIGNATURE):
        output.write_bytes(raw)
        return "png"

    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - depends on local environment
        raise RuntimeError(
            "Workers AI returned a non-PNG image. Install Pillow to convert it: "
            "python -m pip install Pillow"
        ) from exc

    with Image.open(io.BytesIO(raw)) as image:
        image.convert("RGB").save(output, format="PNG")
    return "converted-to-png"


def run(args: argparse.Namespace) -> int:
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.environ.get("CLOUDFLARE_API_TOKEN")
    model = args.model or os.environ.get("CLOUDFLARE_AI_MODEL", DEFAULT_MODEL)
    output = Path(args.output).expanduser().resolve()

    endpoint = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id or '<CLOUDFLARE_ACCOUNT_ID>'}/ai/run/{quote(model, safe='@/') }"
    )
    if args.dry_run:
        print(f"model={model}")
        print(f"endpoint={endpoint}")
        print(f"output={output}")
        print("request=not-sent")
        return 0

    if not account_id or not api_token:
        print(
            "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN before running.",
            file=sys.stderr,
        )
        return 2

    body = json.dumps({"prompt": args.prompt, "steps": args.steps}).encode("utf-8")
    request = Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=args.timeout) as response:
            payload = json.load(response)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Cloudflare API returned HTTP {exc.code}: {detail}", file=sys.stderr)
        return 1
    except URLError as exc:
        print(f"Cloudflare API request failed: {exc.reason}", file=sys.stderr)
        return 1

    if payload.get("success") is False:
        print(f"Cloudflare API error: {json.dumps(payload.get('errors', []))}", file=sys.stderr)
        return 1

    try:
        image_bytes = parse_image_bytes(payload)
        format_note = save_as_png(image_bytes, output)
    except (ValueError, base64.binascii.Error, RuntimeError) as exc:
        print(f"Could not save Workers AI image: {exc}", file=sys.stderr)
        return 1

    print(f"saved={output}")
    print(f"format={format_note}")
    print(f"bytes={output.stat().st_size}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--model", help=f"Workers AI model (default: {DEFAULT_MODEL})")
    parser.add_argument("--steps", type=int, default=4, choices=range(1, 9))
    parser.add_argument("--output", default="cloudflare-ai-output.png")
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--dry-run", action="store_true", help="Print the request target without sending it")
    return parser


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))
