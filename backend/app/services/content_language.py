"""Shared output-language policy and word-safe handling of generated text."""

import textwrap
import unicodedata


OUTPUT_LANGUAGE_POLICY = """
OUTPUT LANGUAGE:
Use the author's original idea as the language reference. If that idea explicitly requests
an output language, use that language; otherwise use the predominant language of the idea.
Apply it consistently to titles, summaries, names of invented entities, descriptions,
scripts, dialogue, narration, captions, visual prompts, and voice sample text.
Do not infer the language from instructions, examples, UI labels, style presets, or
previously generated context. Preserve supplied proper names and their spelling.
Do not mix languages inside human-readable fields. Translate descriptive examples rather
than copying their wording. Before returning, check every natural-language field against
the selected output language, including descriptions and short labels.
JSON keys, enum values, IDs, @asset/@duration references, and required screenplay control
markers are machine syntax: preserve them exactly, translating only human-readable content.
If there is no separate original-idea reference, follow the author's supplied text.
""".strip()


def truncate_text(value: str, limit: int) -> str:
    """Keep Unicode accents and word boundaries when fitting a generated label."""
    text = unicodedata.normalize("NFC", value or "").strip()
    if len(text) <= limit:
        return text
    return textwrap.shorten(text, width=limit, placeholder="") or text[:limit]
