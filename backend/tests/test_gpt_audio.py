"""GPT Audio settings, gateway synthesis, and model-aware voice previews."""

import base64
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.config import Settings
from app.schemas_routing import DefaultModels, LogicalModel, LogicalModelBinding
from app.services import model_settings, voices
from app.services.ark import ArkGateway
from app.services.model_routing_config import normalize_default_models, synchronize_logical_models_with_channels
from app.services.tokenfree_gateway import locked_tokenfree_channel
from app.services.upstream_model_catalog import _list_openai_compatible_models


async def test_saved_gpt_audio_model_moves_to_voice(monkeypatch):
    """Catalog filtering and saved routing both exclude GPT Audio from Text."""
    ids = ["gpt-audio-1.5", "gpt-6-astra", "sora-2"]
    channel = locked_tokenfree_channel(api_key="test-key", models=ids)
    stale = [LogicalModel(id=ids[0], capability="text", bindings=[
        LogicalModelBinding(channel_id=channel.id, upstream_model=ids[0]),
    ])]
    synced = synchronize_logical_models_with_channels(stale, [channel])
    assert {model.id: model.capability for model in synced} == {
        "gpt-audio-1.5": "audio", "gpt-6-astra": "text", "sora-2": "video",
    }
    defaults = normalize_default_models(DefaultModels(text_model="gpt-6-astra"), synced, [channel])
    assert defaults.audio_model == "gpt-audio-1.5"
    assert defaults.text_model == "gpt-6-astra"
    client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"data": [{"id": mid} for mid in ids]}))
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=transport, **kwargs))
    for capability, expected in (("audio", ids[0]), ("text", ids[1])):
        rows = await _list_openai_compatible_models(base_url="https://gateway.example/v1", api_key="test-key", capability=capability)
        assert rows == [{"id": expected, "label": expected, "capability": capability}]


@pytest.mark.parametrize("speaker, expected_voice", [("narrator_calm", "alloy"), ("teacher_clear", "echo"), ("Shimmer", "shimmer")])
async def test_gpt_audio_uses_chat_before_edge(tmp_path, monkeypatch, speaker, expected_voice):
    """Exercise the shared TTS entry point and actual base64 extraction without another provider."""
    settings = Settings(ark_mock=False, ark_base_url="https://94api.dev/v1", ark_api_key="test-key", model_audio="gpt-audio-1.5", volc_tts_app_id="", volc_tts_api_key="")
    monkeypatch.setattr("app.config.get_settings", lambda: settings)
    monkeypatch.setattr(model_settings, "_routing_snapshot", model_settings.RoutingSnapshot(channels=[], logical_models=[], default_models=DefaultModels()))
    gateway = ArkGateway(settings=settings)
    monkeypatch.setattr("app.services.storage.project_dir", lambda _: tmp_path)
    monkeypatch.setattr("app.services.storage.publish_local", lambda path: f"/static/{path.name}")
    monkeypatch.setattr("app.services.ark.is_near_silent_audio", lambda _: False)
    fallback = AsyncMock(side_effect=RuntimeError("fallback unavailable"))
    monkeypatch.setattr(gateway, "_tts_edge", fallback)
    audio = b"ID3" + b"a" * 4000
    requests = []

    def respond(request):
        """Validate the wire contract and return MP3 bytes in the OpenAI audio response."""
        assert str(request.url) == "https://94api.dev/v1/chat/completions"
        body = json.loads(request.content)
        requests.append(body)
        assert body["model"] == "gpt-audio-1.5"
        assert body["modalities"] == ["text", "audio"]
        assert body["audio"] == {"voice": expected_voice, "format": "mp3"}
        assert body["messages"][0]["role"] == "system"
        assert "exactly as written" in body["messages"][0]["content"]
        assert body["messages"][1] == {"role": "user", "content": "Xin chào."}
        return httpx.Response(200, json={"choices": [{"message": {"audio": {"data": base64.b64encode(audio).decode()}}}]})

    client = httpx.AsyncClient
    transport = httpx.MockTransport(respond)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=transport, **kwargs))
    assert await gateway.tts("Xin chào.", speaker, project_id=1, shot_no=1) == "/static/shot_001_tts.mp3"
    assert (tmp_path / "shot_001_tts.mp3").read_bytes() == audio
    assert len(requests) == 1
    fallback.assert_not_called()

    # Missing audio must not be reported as successful GPT synthesis.
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"choices": [{"message": {"content": "Text only"}}]}))
    with pytest.raises(RuntimeError, match="Voiceover failed"):
        await gateway.tts("Xin chào.", speaker, project_id=1, shot_no=2)
    fallback.assert_awaited_once()


async def test_voice_preview_cache_changes_with_model(tmp_path, monkeypatch):
    """Changing Voice Default must not replay a preview from the previous model."""
    model = "legacy-tts"
    source = tmp_path / "sample.mp3"
    source.write_bytes(b"ID3" + b"a" * 4000)
    synthesize = AsyncMock(return_value="/static/sample.mp3")
    gateway = SimpleNamespace(_resolved_audio_model=lambda: model, tts=synthesize)
    monkeypatch.setattr(voices, "__file__", str(tmp_path / "app" / "services" / "voices.py"))
    monkeypatch.setattr("app.services.ark.get_ark", lambda: gateway)
    monkeypatch.setattr("app.services.storage.local_path_from_url", lambda _: source)
    monkeypatch.setattr("app.services.storage.publish_local", lambda path: f"/static/{Path(path).name}")
    before = await voices.ensure_voice_preview("narrator_calm")
    assert await voices.ensure_voice_preview("narrator_calm") == before
    synthesize.assert_awaited_once()
    model = "gpt-audio-1.5"
    assert await voices.ensure_voice_preview("narrator_calm") != before
    assert synthesize.await_count == 2
