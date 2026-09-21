"""94API 部署回归：路由、未配置能力、后台事务边界及 HTTP 错误。"""
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import HTTPException

from app.config import Settings
from app.schemas_routing import DefaultModels
from app.services import model_settings, studio_tools, tokenfree_gateway
from app.services.ark import ArkGateway
from app.services.tokenfree_video import uses_tokenfree_video


async def test_text_only_gateway_roundtrip(db_session, monkeypatch):
    """保存与重载仍调用 94API；空媒体模型不会被补成内置模型。"""
    from app import config
    from app.services import llm_client

    old_overlay = dict(model_settings._overlay)
    old_snapshot = model_settings._routing_snapshot
    monkeypatch.setenv("OPENAI_BASE_URL", "https://94api.dev/v1")
    monkeypatch.setenv("OPENAI_API_KEY", "test-film-key")
    monkeypatch.setenv("MODEL_LLM", "gpt-5.6-luna")
    for key in ("MODEL_IMAGE", "MODEL_VIDEO", "MODEL_AUDIO"):
        monkeypatch.setenv(key, "")
    monkeypatch.setattr(tokenfree_gateway, "TOKENFREE_BASE_URL", "https://94api.dev/v1")
    model_settings._overlay.clear()
    config.get_settings.cache_clear()
    try:
        await model_settings.load_model_settings_cache(db_session)
        await model_settings.load_model_settings_cache(db_session)
        settings = config.get_settings()
        assert settings.openai_base_url == "https://94api.dev/v1"
        assert settings.model_image == settings.model_video == settings.model_audio == ""
        assert model_settings.get_routing_snapshot().default_models.text_model == "gpt-5.6-luna"

        def respond(request):
            """验证实际请求契约，不调用外网。"""
            assert str(request.url) == "https://94api.dev/v1/chat/completions"
            assert request.headers["authorization"] == "Bearer test-film-key"
            return httpx.Response(200, json={"choices": [{"message": {"content": "OK"}}]})

        client = httpx.AsyncClient
        monkeypatch.setattr(llm_client.httpx, "AsyncClient", lambda **kwargs: client(transport=httpx.MockTransport(respond), **kwargs))
        assert await llm_client.chat_completions("system", "test", max_tokens=16) == "OK"
    finally:
        model_settings._overlay.clear()
        model_settings._overlay.update(old_overlay)
        model_settings._routing_snapshot = old_snapshot
        config.get_settings.cache_clear()


async def test_missing_media_fails_before_fetch_or_mock(monkeypatch):
    """缺少模型时明确失败，包括传入任意模型名的请求。"""
    monkeypatch.setattr(model_settings, "_routing_snapshot", model_settings.RoutingSnapshot([], [], DefaultModels()))
    ark = ArkGateway(Settings(model_image="", model_video="", ark_api_key="", ark_mock=False))
    with pytest.raises(RuntimeError, match="Image model not configured"):
        await ark.gen_image("test", model="not-configured")
    with pytest.raises(RuntimeError, match="Video model not configured"):
        await ark.gen_video_i2v("https://example.invalid/a.png", "test", 5)
    with pytest.raises(RuntimeError, match="Video model not configured"):
        await ark.gen_video_seedance_body({"model": "not-configured", "content": []})
    assert not uses_tokenfree_video(base_url="https://94api.dev/v1", channel_id="tokenfree")


async def test_tool_commits_before_background_dispatch(monkeypatch):
    """独立 session 的任务只在持久化之后启动。"""
    monkeypatch.setattr(studio_tools, "_ensure_image_tool_balance", AsyncMock())
    db = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    def dispatch(_run_id):
        db.commit.assert_awaited_once()

    monkeypatch.setattr(studio_tools, "_dispatch_tool_image", dispatch)
    await studio_tools.enqueue_image_tool(db, MagicMock(id=1), tool_id="t2i", prompt="test", negative="", ratio=None,
                                         strength=None, mode=None, pack=None, files=[], params={})


async def test_tool_preserves_payment_required(monkeypatch):
    """402 不再被外层异常处理改成 500。"""
    from app.api import tools

    monkeypatch.setattr(tools, "enqueue_image_tool", AsyncMock(side_effect=ValueError("insufficient balance")))
    with pytest.raises(HTTPException) as error:
        await tools.run_tool(tool_id="t2i", files=None, db=MagicMock(), user=MagicMock(id=1))
    assert error.value.status_code == 402


async def test_registration_can_be_closed(monkeypatch):
    """关闭注册时不创建账户。"""
    from app.api import auth
    from app.schemas import RegisterRequest

    monkeypatch.setattr(auth, "get_settings", lambda: Settings(registration_enabled=False))
    db = MagicMock()
    with pytest.raises(HTTPException) as error:
        await auth.register(RegisterRequest(email="test@example.com", password="test-password-123", nickname="Test"), db)
    assert error.value.status_code == 403
    db.add.assert_not_called()
