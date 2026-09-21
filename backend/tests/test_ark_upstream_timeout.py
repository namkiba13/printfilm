"""TokenFree 图/视频 HTTP 超时：读体要够长，ReadTimeout 文案区分于连不上。"""

import pytest
import httpx

from app.services.ark import (
    IMAGE_GEN_READ_SEC,
    VIDEO_CREATE_READ_SEC,
    _upstream_timeout,
    reraise_upstream_timeout,
)
from app.services.exc_format import format_exception_message


def test_image_read_timeout_is_at_least_20_minutes():
    assert IMAGE_GEN_READ_SEC >= 1200.0
    timeout = _upstream_timeout(IMAGE_GEN_READ_SEC)
    assert timeout.connect == 30.0
    assert timeout.read == IMAGE_GEN_READ_SEC
    assert timeout.write == 60.0


def test_video_create_timeout_longer_than_old_60s():
    assert VIDEO_CREATE_READ_SEC >= 180.0
    timeout = _upstream_timeout(VIDEO_CREATE_READ_SEC)
    assert timeout.read == VIDEO_CREATE_READ_SEC


def test_reraise_read_timeout_says_waiting_not_unreachable():
    with pytest.raises(RuntimeError, match='ReadTimeout') as ei:
        reraise_upstream_timeout(httpx.ReadTimeout(""), kind="生图", read_sec=1200)
    text = str(ei.value)
    assert "cannot connect" not in text
    assert "1200" in text
    wrapped = format_exception_message(ei.value)
    assert "no result was returned" in wrapped


def test_reraise_write_timeout_says_send_not_wait():
    with pytest.raises(RuntimeError, match='WriteTimeout') as ei:
        reraise_upstream_timeout(httpx.WriteTimeout(""), kind="生图", read_sec=1200)
    assert "could not be sent" in str(ei.value)
    assert "no result was returned" not in str(ei.value)


def test_reraise_connect_timeout_says_unreachable():
    with pytest.raises(RuntimeError, match='cannot connect to the upstream'):
        reraise_upstream_timeout(httpx.ConnectTimeout(""), kind="生视频", read_sec=180)
