"""Native GPT Image wire contract and persisted images through the shared gateway."""

import base64
import json

import httpx
import pytest

from app.config import Settings
from app.schemas_routing import DefaultModels, LogicalModel, LogicalModelBinding, SystemModelChannel
from app.services import model_settings, storage
from app.services.ark import ArkGateway


@pytest.mark.parametrize("size,ratio,refs,expected_size", [
    ("2k", None, [], "2048x2048"),
    ("2K", "16:9", ["https://images.example/subject.png", "https://images.example/style.png"], "2816x1584"),
    ("1584x2816", "9:16", [], "1584x2816"),
    ("2K", "auto", [], "auto"),
])
@pytest.mark.parametrize("response_kind", ["base64", "url", "invalid_base64"])
async def test_gpt_image_alias_generates_and_persists(tmp_path, monkeypatch, size, ratio, refs, expected_size, response_kind):
    """Keep the selected model/key, send native generation/edit JSON, and never download base64 as a URL."""
    model = "gpt-image-2.5-sunburst"
    settings = Settings(ark_mock=False, ark_api_key="old-env-key", ark_base_url="https://94api.dev/v1", model_image="seedream-5.0")
    channel = SystemModelChannel(id="tokenfree", name="94API", base_url=settings.ark_base_url, api_key="saved-key", has_api_key=True, models=[model])
    logical = LogicalModel(id="seedream-5.0", capability="image", bindings=[LogicalModelBinding(channel_id=channel.id, upstream_model=model)])
    snapshot = model_settings.RoutingSnapshot(channels=[channel], logical_models=[logical], default_models=DefaultModels(image_model=logical.id))
    monkeypatch.setattr(model_settings, "_routing_snapshot", snapshot)
    monkeypatch.setattr(storage, "project_dir", lambda _: tmp_path)
    monkeypatch.setattr(storage, "publish_local", lambda path, **kwargs: f"/static/{path.name}")
    image_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=")
    requests = []

    def respond(request):
        """An OpenAI-compatible provider rejects Ark parameters and returns image bytes plus usage."""
        requests.append(request)
        if request.method == "GET":
            assert str(request.url) == "https://images.example/result.png"
            assert "Authorization" not in request.headers
            return httpx.Response(200, content=image_bytes)
        assert str(request.url) == "https://94api.dev/v1/images/" + ("edits" if refs else "generations")
        assert request.headers["Authorization"] == "Bearer saved-key"
        body = json.loads(request.content)
        assert body["model"] == model
        assert body["size"] == expected_size
        assert body["output_format"] == "png"
        assert {"response_format", "watermark", "image"}.isdisjoint(body)
        assert body.get("images", []) == [{"image_url": ref} for ref in refs]
        image = {"url": "https://images.example/result.png"} if response_kind == "url" else {
            "b64_json": "not-base64!" if response_kind == "invalid_base64" else base64.b64encode(image_bytes).decode(),
        }
        return httpx.Response(200, json={"data": [image], "usage": {"input_tokens": 5, "output_tokens": 10, "total_tokens": 15}})

    client = httpx.AsyncClient
    transport = httpx.MockTransport(respond)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client(transport=transport, **kwargs))
    gateway = ArkGateway(settings=settings)
    kwargs = dict(size=size, aspect_ratio=ratio, model=logical.id, ref_urls=refs[:1], style_ref_urls=refs[1:])
    if response_kind == "invalid_base64":
        with pytest.raises(RuntimeError, match="Invalid base64 image"):
            await gateway.gen_image("A plant in a pot.", **kwargs)
        assert list(tmp_path.iterdir()) == []
    else:
        result = await gateway.gen_image("A plant in a pot.", **kwargs)
        assert (tmp_path / result.local_url.split("/")[-1]).read_bytes() == image_bytes
        assert result.total_tokens == 15
        assert result.raw_usage["size"] == expected_size
        assert result.remote_url == ("https://images.example/result.png" if response_kind == "url" else None)
    assert len(requests) == (2 if response_kind == "url" else 1)
