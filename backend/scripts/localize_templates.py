"""Translate unchanged built-in template copy without overwriting user edits or identifiers."""
import asyncio
import json
from pathlib import Path

from app.database import AsyncSessionLocal, dispose_engine
from app.models import Template
from app.services.templates_seed import TEMPLATES

COPY_FIELDS = ("name", "description", "style_prefix", "negative_prompt", "llm_system_addon", "seedream_config", "seedance_config", "audio_config")


def translated_fields(current: dict, original: dict, translated: dict) -> dict:
    """Only replace a built-in field if its current value still matches the shipped original."""
    return {key: translated[key] for key in COPY_FIELDS if key in translated and key in original
            and current.get(key) == original[key] and original[key] != translated[key]}


async def main() -> None:
    """Apply the copy migration in one transaction, preserving custom templates and content."""
    baseline = json.loads((Path(__file__).resolve().parents[1] / "app/data/english_template_baseline.json").read_text(encoding="utf-8"))
    originals = {row["id"]: row for row in baseline}
    changed = 0
    try:
        async with AsyncSessionLocal() as db:
            for translated in TEMPLATES:
                original = originals.get(translated["id"])
                row = await db.get(Template, translated["id"])
                if not row or not original:
                    continue
                values = translated_fields({key: getattr(row, key, None) for key in COPY_FIELDS}, original, translated)
                for key, value in values.items():
                    setattr(row, key, value)
                changed += bool(values)
            await db.commit()
            print(json.dumps({"localized_templates": changed}))
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())
