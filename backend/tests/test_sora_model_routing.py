"""Sora stays in video catalogs and routes, including previously saved text entries."""

import httpx

from app.config import Settings
from app.schemas_routing import DefaultModels, LogicalModel, LogicalModelBinding
from app.services import model_settings
from app.services.media_catalog import build_media_catalog
from app.services.model_routing_config import normalize_default_models, synchronize_logical_models_with_channels
from app.services.tokenfree_gateway import locked_tokenfree_channel
from app.services.upstream_model_catalog import _list_openai_compatible_models


async def test_sora_catalog_and_saved_routing(monkeypatch):
    """Fetch, reload stale settings, and bootstrap without turning Sora into Text or Seedance."""
    sora_ids = ["sora2", "sora-2", "sora-2-pro", " OpenAI/Sora-2 "]
    ids = ["gpt-5.6-luna", "gpt-image-2.5-sunburst", *sora_ids]
    client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={
        "data": [{"id": mid} for mid in ids],
    }))
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=transport, **kwargs))
    for capability, expected in (
        ("video", {mid.strip() for mid in sora_ids}),
        ("text", {"gpt-5.6-luna"}),
        ("image", {"gpt-image-2.5-sunburst"}),
    ):
        rows = await _list_openai_compatible_models(
            base_url="https://gateway.example/v1", api_key="test-key", capability=capability,
        )
        assert {row["id"] for row in rows} == expected
        assert all(row["capability"] == capability for row in rows)

    channel = locked_tokenfree_channel(api_key="test-key", models=[*ids, "custom-voice"])
    stale = [LogicalModel(
        id="sora-2", name="Sora 2", capability="text",
        bindings=[LogicalModelBinding(
            id="saved-sora", channel_id=channel.id, upstream_model="sora-2", priority=3, weight=80,
        )],
    ), LogicalModel(
        id="custom-voice", capability="audio",
        bindings=[LogicalModelBinding(channel_id=channel.id, upstream_model="custom-voice")],
    )]
    synced = synchronize_logical_models_with_channels(stale, [channel])
    sora = next(model for model in synced if model.id == "sora-2")
    assert sora.capability == "video"
    assert sora.name == "Sora 2"
    assert sora.bindings == stale[0].bindings
    assert next(model for model in synced if model.id == "custom-voice").capability == "audio"
    defaults = normalize_default_models(DefaultModels(text_model="gpt-5.6-luna", video_model="sora-2"), synced, [channel])
    assert defaults.text_model == "gpt-5.6-luna"
    assert defaults.video_model == "sora-2"
    catalog = build_media_catalog(logical_models=synced, channels=[channel], defaults=defaults)
    assert "sora-2" in {row["id"] for row in catalog["video_models"]}
    assert "sora-2" not in {row["id"] for row in catalog["image_models"]}

    settings = Settings(model_llm="gpt-5.6-luna", model_video="sora-2", model_video_2="", model_image="", model_image_45="")
    monkeypatch.setattr(model_settings, "get_settings", lambda: settings)
    bootstrapped, defaults = model_settings._bootstrap_logical_from_channels([channel])
    assert defaults.video_model == "sora-2"
    assert next(model for model in bootstrapped if model.id == "sora-2").capability == "video"
    assert not any(model.id.startswith("seedance") for model in bootstrapped)
