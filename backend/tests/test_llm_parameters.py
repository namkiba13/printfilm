"""Provider-specific Chat Completions parameters through the drama JSON entry point."""

import json

import httpx
import pytest

from app.config import Settings
from app.schemas_routing import ResolvedModelRoute
from app.services import llm_client
from app.services.drama.llm import drama_chat_json


@pytest.mark.parametrize("model,budget,field,temperature,thinking", [
    ("gpt-6-astra", 4096, "max_completion_tokens", None, None),
    ("gpt-6-astra-2026-09-01", 16384, "max_completion_tokens", None, None),
    ("gpt-5.6-luna", 4096, "max_completion_tokens", 0.4, None),
    ("o3", 4096, "max_completion_tokens", None, None),
    ("o4-mini", 4096, "max_completion_tokens", None, None),
    ("gpt-4.1", 4096, "max_tokens", 0.4, None),
    ("kimi-k2.5", 4096, "max_tokens", 0.6, {"type": "disabled"}),
    ("deepseek-v4", 4096, "max_tokens", 0.4, {"type": "disabled"}),
])
async def test_drama_uses_resolved_model_parameters(monkeypatch, model, budget, field, temperature, thinking):
    """A logical alias must use the upstream model's parameters without losing limits, JSON, or language."""
    settings = Settings(model_llm="different-env-model", openai_api_key="old-key")
    route = ResolvedModelRoute(
        capability="text", logical_model_id="project-writer", upstream_model=model,
        channel_id="tokenfree", channel_name="94API", base_url="https://94api.dev/v1",
        api_key="saved-key", protocol="openai", api_format="openai",
    )
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings)
    monkeypatch.setattr(llm_client, "resolve_logical_model", lambda *_: route)
    source = "Một nhóm học sinh chuẩn bị buổi biểu diễn cuối năm."
    requests = []

    def respond(request):
        """Reject unsupported fields as the provider does, and return a 12-episode project summary."""
        requests.append(request)
        assert str(request.url) == "https://94api.dev/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer saved-key"
        body = json.loads(request.content)
        assert body["model"] == model
        assert body[field] == budget
        assert ("max_tokens" if field == "max_completion_tokens" else "max_completion_tokens") not in body
        if temperature is None:
            assert "temperature" not in body
        else:
            assert body["temperature"] == temperature
        assert body.get("thinking") == thinking
        assert body["response_format"] == {"type": "json_object"}
        assert body["messages"][-1]["content"].endswith(source)
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"episodeCount":12,"seriesTitle":"Mùa hè cuối cùng"}'}}]})

    client = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=httpx.MockTransport(respond), **kwargs))
    result = await drama_chat_json("Return a JSON project summary.", "Japanese youth film, 12 episodes.", temperature=0.4, max_tokens=budget, language_source=source)
    assert result == {"episodeCount": 12, "seriesTitle": "Mùa hè cuối cùng"}
    assert len(requests) == 1
