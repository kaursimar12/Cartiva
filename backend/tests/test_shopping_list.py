"""Tests for the grocery-list scan endpoint. A fake OpenAI client is used: no network, no cost."""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from openai import OpenAIError

from app.main import app
from app.routers.shopping_list import MAX_IMAGE_BYTES, ScannedItem, ScannedList, get_openai_client

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # tiny fake image bytes


class FakeResponses:
    def __init__(self, result: ScannedList | None = None, fail: bool = False) -> None:
        self.result, self.fail, self.calls = result, fail, []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail:
            raise OpenAIError("boom")
        return SimpleNamespace(output_parsed=self.result)


class FakeOpenAI:
    def __init__(self, **kwargs) -> None:
        self.responses = FakeResponses(**kwargs)


@pytest.fixture
def use_openai():
    def install(fake: FakeOpenAI) -> TestClient:
        app.dependency_overrides[get_openai_client] = lambda: fake
        return TestClient(app)

    yield install
    app.dependency_overrides.clear()


def upload(client: TestClient, data: bytes = PNG, content_type: str = "image/png"):
    return client.post("/api/list/scan", files={"image": ("list.png", data, content_type)})


def test_scan_returns_structured_items(use_openai) -> None:
    items = [ScannedItem(name="tomato", quantity=2, unit="kg", original="tamatar 2kg")]
    fake = FakeOpenAI(result=ScannedList(items=items))
    response = upload(use_openai(fake))

    assert response.status_code == 200
    assert response.json() == {"items": [{"name": "tomato", "quantity": 2.0, "unit": "kg", "original": "tamatar 2kg"}]}
    content = fake.responses.calls[0]["input"][0]["content"]
    assert content[1]["image_url"].startswith("data:image/png;base64,")  # the photo was sent


def test_non_image_is_rejected(use_openai) -> None:
    response = upload(use_openai(FakeOpenAI()), data=b"%PDF-1.4", content_type="application/pdf")
    assert response.status_code == 415


def test_too_large_image_is_rejected(use_openai) -> None:
    response = upload(use_openai(FakeOpenAI()), data=b"\x00" * (MAX_IMAGE_BYTES + 1))
    assert response.status_code == 413


def test_empty_file_is_rejected(use_openai) -> None:
    assert upload(use_openai(FakeOpenAI()), data=b"").status_code == 400


def test_openai_failure_gives_a_clean_error(use_openai) -> None:
    response = upload(use_openai(FakeOpenAI(fail=True)))
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "SCAN_FAILED"
