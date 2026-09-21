"""将异常格式化为可展示、非空的错误文案。"""

from __future__ import annotations

# 已建连、等响应超时（不是连不上）
_READ_TIMEOUT_EXC_NAMES = frozenset({"ReadTimeout"})
# 已建连、发请求体超时
_WRITE_TIMEOUT_EXC_NAMES = frozenset({"WriteTimeout"})
# 建连失败 / 代理不可达（含未细分的 TimeoutException）
_CONNECT_EXC_NAMES = frozenset(
    {
        "ConnectError",
        "ConnectTimeout",
        "PoolTimeout",
        "TimeoutException",
        "NetworkError",
        "ProxyError",
    }
)


def format_exception_message(
    exc: BaseException,
    *,
    fallback: str = 'Unknown error',
    limit: int = 500,
) -> str:
    """生成带类型名的错误文案；ConnectError 等空 message 时补上可读说明。"""
    name = type(exc).__name__
    detail = str(exc).strip()
    if name in _READ_TIMEOUT_EXC_NAMES:
        tip = detail or 'Upstream connected, but the response timed out (image/video generation may exceed the waiting limit)'
        return f'Network error ({name}): {tip}'[:limit]
    if name in _WRITE_TIMEOUT_EXC_NAMES:
        tip = detail or 'Upstream connected, but sending the request timed out'
        return f'Network error ({name}): {tip}'[:limit]
    if name in _CONNECT_EXC_NAMES:
        tip = detail or 'Unable to connect to the upstream service (please check the network, proxy, or whether TokenFree is reachable)'
        return f'Network error ({name}): {tip}'[:limit]
    if not detail:
        return f"{name}：{fallback}"[:limit]
    if detail.startswith(name):
        return detail[:limit]
    return f"{name}: {detail}"[:limit]
