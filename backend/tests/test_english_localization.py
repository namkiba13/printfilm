"""English presentation must not change stored template IDs, user copy, or tool parameters."""
import json
from pathlib import Path

from app.services.templates_seed import TEMPLATES
from app.services.voices import list_voices
from scripts.localize_templates import translated_fields


def test_builtin_copy_is_english_and_migration_preserves_edits():
    """Every built-in is covered; migration changes only untouched copy fields."""
    baseline = json.loads((Path(__file__).resolve().parents[1] / "app/data/english_template_baseline.json").read_text(encoding="utf-8"))
    originals = {row["id"]: row for row in baseline}
    assert set(originals) == {row["id"] for row in TEMPLATES}
    for row in TEMPLATES:
        assert not any('\u3400' <= c <= '\u9fff' for c in row["name"] + row["description"])
        old = originals[row["id"]]
        assert row["category"] == old["category"]
        edited = dict(old, name="My custom title", style_prefix="My own style")
        patch = translated_fields(edited, old, row)
        assert "name" not in patch and "style_prefix" not in patch
        assert "id" not in patch and "category" not in patch
    assert all(not any('\u3400' <= c <= '\u9fff' for c in voice["label"]) for voice in list_voices())


def test_english_camera_inserts_remain_visual_not_spoken_dialogue():
    """English camera labels must keep the same no-voiceover semantics as the original controls."""
    from app.services.drama.build_fragments import _format_narrative_line, VISUAL_PREFIX, DIALOGUE_PREFIX

    for label in ("Establishing Shot", "Long Shot", "Wide Shot", "Medium Shot", "Close Shot", "Close-up", "Extreme Close-up",
                  "Atmospheric Shot", "Push-in", "Pull-out", "Pan", "Tracking Shot", "Follow Shot", "High-angle Shot", "Low-angle Shot", "Aerial Shot"):
        assert _format_narrative_line(f"{label}: A quiet garden.").startswith(VISUAL_PREFIX)
    assert _format_narrative_line("Alex: Hello.").startswith(DIALOGUE_PREFIX)
