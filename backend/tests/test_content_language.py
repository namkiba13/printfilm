"""Regression checks for source-language generation and Unicode screenplay handling."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.config import Settings
from app.services import ark, llm_client
from app.services.content_language import truncate_text
from app.services.drama import agents, voice_prompt
from app.services.drama.build_fragments import extract_scene_meta, split_episode_content_into_scenes, _shorten_intro
from app.services.drama.llm import drama_chat_json
from app.services.seedance_segments import SPEAKER_DIALOGUE_RE, classify_voice_body


async def test_language_reference_survives_json_retry(monkeypatch):
    """Real outgoing requests retain the original idea even when the task/context is Chinese."""
    settings = Settings(openai_base_url="https://gateway.example/v1", model_llm="gpt-5.6-luna")
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings)
    monkeypatch.setattr(llm_client, "resolve_logical_model", lambda *_: None)
    monkeypatch.setattr(llm_client, "resolve_llm_api_key", lambda: "test-key")
    source = "Một cô bé tạo khu vườn trên mái nhà. Viết nội dung bằng tiếng Việt."
    captured = []

    def respond(request):
        """Return malformed JSON once to exercise the production retry path."""
        payload = json.loads(request.content)
        captured.append(payload)
        content = "not JSON" if len(captured) == 1 else json.dumps({"title": "Khu vườn trên mái nhà"}, ensure_ascii=False)
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    client = httpx.AsyncClient
    transport = httpx.MockTransport(respond)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=transport, **kwargs))
    result = await drama_chat_json("请输出 JSON", "旧摘要：一个屋顶花园。请重写标题。", language_source=source)
    assert result["title"] == "Khu vườn trên mái nhà"
    assert len(captured) == 2
    for payload in captured:
        assert payload["messages"][-1]["role"] == "user"
        assert payload["messages"][-1]["content"].endswith(source)
        assert "predominant language of the idea" in payload["messages"][0]["content"]
        assert payload["response_format"] == {"type": "json_object"}


async def test_episode_generation_uses_original_idea_not_old_summary(monkeypatch):
    """Every draft/retry for an episode uses the original idea rather than stale Chinese prose."""
    source = "A young gardener restores an abandoned rooftop garden."
    calls = []

    async def generate(system, user, **kwargs):
        calls.append(kwargs["language_source"])
        body = "Too short" if len(calls) == 1 else "The gardener carries water upstairs and repairs the greenhouse. " * 12
        return {"episodes": [{"episodeNumber": 1, "title": "The Rooftop", "content": body}]}

    monkeypatch.setattr(agents, "drama_chat_json", generate)
    rows = await agents.run_episode_script_batch({"synopsis": "旧的中文摘要", "episodeCount": 1}, [], creative=source)
    assert calls == [source, source]
    assert "gardener carries water" in rows[0]["body"]


async def test_expansion_retries_without_fabricated_chinese_fallback(monkeypatch):
    """Bad or missing AI content becomes an error, never an unrelated canned script."""
    source = "Kể về một người làm vườn trẻ."
    gateway = ark.ArkGateway(settings=Settings(ark_mock=False))
    model = AsyncMock(return_value='{"content": null}')
    monkeypatch.setattr(ark, "chat_completions", model)
    with pytest.raises(ValueError, match="no usable content"):
        await gateway.expand_content(source)
    assert model.await_count == 2
    assert all(call.kwargs["language_source"] == source for call in model.await_args_list)
    parsed = gateway._parse_expand_content(json.dumps({"title": "Khu vườn trên mái nhà", "content": source}), source, "theme")
    assert parsed == {"title": "Khu vườn trên mái nhà", "content": source}


def test_multilingual_titles_names_and_scene_markers():
    """Word-safe text survives parsing while visual directions stay out of spoken dialogue."""
    assert truncate_text("Khu vườn trên mái nhà", 14) == "Khu vườn trên"
    assert truncate_text("Cafe\u0301 trên mái nhà", 100) == "Café trên mái nhà"
    assert _shorten_intro("Người chăm sóc khu vườn trên mái nhà", 20) == "Người chăm sóc khu…"
    title = "The Young Gardener and the Rooftop Garden"
    assert agents.normalize_series_title(title) == title
    assert " " in ark._fallback_overlay_subtitle("Nguyễn Minh Anh chăm sóc những luống rau trên sân thượng.")
    match = SPEAKER_DIALOGUE_RE.match("Nguyễn Minh Anh (vo): Khu vườn đã xanh trở lại.")
    assert match.group("speaker") == "Nguyễn Minh Anh"
    assert classify_voice_body("Wide Shot: A rooftop garden at dawn.") == "visual"
    assert classify_voice_body("Toàn cảnh: Khu vườn trên mái nhà.") == "visual"
    assert classify_voice_body("Người dẫn chuyện: Khu vườn đã xanh trở lại.") == "narration"
    scenes = split_episode_content_into_scenes("### Scene 1-1\nDAY EXT Sân thượng\nCast: Nguyễn Minh Anh, Mai Lan\n△ Hai người tưới cây.")
    assert extract_scene_meta(scenes[0]["body"]) == {"sceneName": "Sân thượng", "characterNames": ["Nguyễn Minh Anh", "Mai Lan"]}


async def test_voice_description_and_sample_keep_generated_language(monkeypatch):
    """A Vietnamese voice description produces a Vietnamese sample instead of a canned Chinese line."""
    source = "Một cô gái chăm sóc khu vườn trên mái nhà."
    description = "Giọng nữ trẻ trung, ấm áp và rõ ràng, nhịp đọc nhẹ nhàng tự nhiên."
    generate = AsyncMock(return_value=description)
    monkeypatch.setattr(voice_prompt, "drama_chat_text", generate)
    asset = SimpleNamespace(id=1, name="Mai Lan", params={"personality": "Dịu dàng"})
    project = SimpleNamespace(id=2, script=SimpleNamespace(source=source, summary={}))
    prompt, _, sample = await voice_prompt.suggest_voice_prompt_for_character(asset, project)
    assert prompt == sample == description
    assert generate.await_args.kwargs["language_source"] == source
