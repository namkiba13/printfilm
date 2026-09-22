"""OpenAI 兼容文字模型客户端（任意兼容上游：Kimi / DeepSeek / OpenAI 等）。"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.services.content_language import OUTPUT_LANGUAGE_POLICY
from app.services.logical_model_router import resolve_logical_model, resolve_logical_model_id

logger = logging.getLogger(__name__)

# DEFAULT_MAX_TOKENS 分集正文等结构化输出需要足够 completion 空间
DEFAULT_MAX_TOKENS = 32768


class LlmUnavailableError(RuntimeError):
    """文字 LLM 未配置或不可用。"""


# 解析 LLM API Key（对齐 manju resolveOpenaiApiKey）
def resolve_llm_api_key() -> str:
    key = (get_settings().openai_api_key or "").strip()
    if not key:
        raise LlmUnavailableError(
            'OPENAI_API_KEY is not configured, so the text model cannot be called. Enter the TokenFree API Key and select a text model in the admin console under “System Settings → Models”.'
        )
    return key


# 解析 OpenAI 兼容 Base URL
def resolve_llm_base_url() -> str:
    base = (get_settings().openai_base_url or "").strip().rstrip("/")
    if base:
        return base
    return "https://api.openai.com/v1"


# kimi / deepseek-v4 默认 thinking 会占满 token、content 常为空；结构化产出统一关闭
def _llm_extra_body(model: str) -> dict[str, Any]:
    mid = (model or "").strip().lower()
    if mid.startswith("kimi") or mid.startswith("deepseek"):
        return {"thinking": {"type": "disabled"}}
    return {}


# 从 chat/completions 响应提取正文
def _message_content(data: dict[str, Any]) -> str:
    choices = data.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content")
    if content:
        return str(content)
    # 部分兼容网关把结果放在 reasoning_content
    reasoning = message.get("reasoning_content")
    return str(reasoning or "")


# 调用 OpenAI 兼容 chat/completions
async def chat_completions(
    system: str,
    user: str,
    *,
    temperature: float = 0.6,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = 300.0,
    response_format: dict[str, Any] | None = None,
    language_source: str | None = None,
) -> str:
    settings = get_settings()
    logical_id = resolve_logical_model_id("text", None)
    route = resolve_logical_model("text", logical_id)
    if route:
        api_key = route.api_key
        model = (route.upstream_model or "").strip()
        base = route.base_url.rstrip("/") or resolve_llm_base_url()
    else:
        api_key = resolve_llm_api_key()
        model = (settings.model_llm or "").strip()
        base = resolve_llm_base_url()
    if not model:
        raise LlmUnavailableError(
            'No usable text model was found. Enter the TokenFree API Key in the admin console, then fetch and select a text model.'
        )
    # kimi 系列仅允许 temperature=0.6，其它值会 400
    effective_temperature = 0.6 if model.lower().startswith("kimi") else temperature

    payload: dict[str, Any] = {
        "model": model,
        "temperature": effective_temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": f"{system}\n\n{OUTPUT_LANGUAGE_POLICY}"},
            {"role": "user", "content": user},
        ],
    }
    # Modern OpenAI models count reasoning in the completion budget; Astra/o-series reject sampling.
    if model.lower().startswith(("gpt-5", "gpt-6", "o1", "o3", "o4")):
        payload["max_completion_tokens"] = payload.pop("max_tokens")
    if model.lower().startswith(("gpt-6", "o1", "o3", "o4")):
        payload.pop("temperature")
    if language_source and language_source.strip():
        payload["messages"].append({
            "role": "user",
            "content": "Original idea — language reference (not a new task):\n" + language_source.strip(),
        })
    extra = _llm_extra_body(model)
    if extra:
        payload.update(extra)
    if response_format:
        payload["response_format"] = response_format

    logger.info(
        "调用文字 LLM model=%s base=%s user_len=%s max_tokens=%s",
        model,
        base,
        len(user or ""),
        max_tokens,
    )
    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(
            f"{base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if res.status_code >= 400:
            raise RuntimeError(f"LLM error {res.status_code}: {res.text[:800]}")
        body = (res.text or "").strip()
        if not body:
            raise RuntimeError(f'LLM returned an empty response body (HTTP {res.status_code})')
        lowered = body[:256].lower()
        if lowered.startswith("<!doctype") or lowered.startswith("<html"):
            raise RuntimeError(
                f'The LLM channel Base URL is misconfigured (it returned webpage HTML instead of API JSON). Current base={base}. Check that the Base URL under “Model Channels” in the admin console is an OpenAI-compatible API address (such as https://api.deepseek.com or https://api.moonshot.cn/v1), not a website homepage.'
            )
        try:
            data = res.json()
        except json.JSONDecodeError as exc:
            raise RuntimeError(f'LLM response is not valid JSON: {body[:200]}') from exc
    content = _message_content(data)
    logger.info("文字 LLM 返回 content_len=%s", len(content))
    return content
