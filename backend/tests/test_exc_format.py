"""网络异常文案：ReadTimeout 不得再写成「连不上」。"""

import httpx

from app.services.exc_format import format_exception_message


def test_read_timeout_says_response_timed_out():
    msg = format_exception_message(httpx.ReadTimeout(""))
    assert "ReadTimeout" in msg
    assert "response timed out" in msg
    assert "Unable to connect" not in msg


def test_connect_error_still_says_unreachable():
    msg = format_exception_message(httpx.ConnectError(""))
    assert "Unable to connect" in msg
    assert "ReadTimeout" not in msg


def test_connect_timeout_not_treated_as_read_timeout():
    msg = format_exception_message(httpx.ConnectTimeout(""))
    assert "Unable to connect" in msg
    assert "response timed out" not in msg


def test_write_timeout_says_send_timed_out():
    msg = format_exception_message(httpx.WriteTimeout(""))
    assert "WriteTimeout" in msg
    assert "sending the request timed out" in msg
    assert "Unable to connect" not in msg
    assert "response timed out" not in msg
