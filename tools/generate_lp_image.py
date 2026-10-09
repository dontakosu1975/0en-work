"""Generate the 0EN public LP hero image with Gemini.

The API key is read only from GEMINI_API_KEY. Nothing from the key is written to
the repository or printed to the console.
"""

from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types


PROMPT = """
Create a warm, modern editorial photograph-style image for a Japanese small-business
hiring service landing page. Show a friendly Japanese business owner or hiring manager
in their 30s or 40s reviewing a job posting on a laptop at a bright, tidy office desk.
Natural daylight, calm professional atmosphere, approachable and trustworthy, realistic
human expression, a little room around the subject for web layout, subtle blue and
charcoal accents, clean white space. No visible text, no logos, no brand marks, no
watermark, no suit-and-arms-crossed stock-photo pose.
""".strip()


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is not set", file=sys.stderr)
        return 2

    model = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    output = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "lp"
        / "hiring-manager-gemini.png"
    )
    output.parent.mkdir(parents=True, exist_ok=True)

    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=model,
            contents=PROMPT,
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
    except Exception as exc:  # noqa: BLE001 - keep API failures concise for CLI users
        print(f"Gemini image generation failed: {exc}", file=sys.stderr)
        return 1

    for candidate in response.candidates or []:
        content = candidate.content
        for part in content.parts if content else []:
            inline_data = getattr(part, "inline_data", None)
            if not inline_data or not inline_data.data:
                continue
            data = inline_data.data
            if isinstance(data, str):
                data = base64.b64decode(data)
            output.write_bytes(data)
            print(f"Wrote {output} ({len(data)} bytes)")
            return 0

    print("Gemini returned no image data", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
