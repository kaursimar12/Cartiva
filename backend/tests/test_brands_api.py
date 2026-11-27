"""The API serves several storefronts: each request names its brand (or gets the default one).

A tiny second store ("teststore") is built in a temp folder next to a copy of the real Cartiva
brand, so these tests prove the brand really switches catalogs, prices and prompts.
"""

import base64
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import catalog as catalog_module
from app.config import get_settings
from app.main import app
from app.routers.payment import get_razorpay_client
from app.routers.shopping_list import ScannedList, get_openai_client
from tests.test_payment import FakeRazorpay
from tests.test_shopping_list import PNG, FakeOpenAI

REAL_BRANDS = get_settings().brands_dir


def _clear_caches() -> None:
    catalog_module.known_brands.cache_clear()
    catalog_module._load_catalog.cache_clear()
    catalog_module._load_brand.cache_clear()


@pytest.fixture
def brands_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """BRANDS_DIR with the real Cartiva brand plus a one-product "teststore"."""
    shutil.copytree(REAL_BRANDS / "cartiva", tmp_path / "cartiva")
    store = tmp_path / "teststore"
    store.mkdir()
    (store / "products.json").write_text(json.dumps([
        {"id": "t1", "name": "Test Cola", "category": "colas", "price": 99, "unit": "750 ml",
         "stock": True, "availableQuantity": 10},
    ]), encoding="utf-8")
    (store / "offers.json").write_text("[]", encoding="utf-8")
    (store / "delivery.json").write_text(json.dumps({"fee": 30, "freeAbove": 199}), encoding="utf-8")
    brand = json.loads((REAL_BRANDS / "cartiva" / "brand.json").read_text(encoding="utf-8"))
    brand.update(id="teststore", listScan={"itemKind": "beverage", "examples": ["cola"], "hindiExamples": '"thanda" → "cola"'})
    (store / "brand.json").write_text(json.dumps(brand), encoding="utf-8")

    monkeypatch.setattr(get_settings(), "brands_dir", tmp_path)
    _clear_caches()
    yield tmp_path
    _clear_caches()


@pytest.fixture
def client(brands_dir) -> TestClient:
    fake = FakeRazorpay()
    app.dependency_overrides[get_razorpay_client] = lambda: fake
    yield TestClient(app)
    app.dependency_overrides.clear()


def _dispatch(token: str) -> dict:
    """The agent dispatch inside a LiveKit JWT (the payload is only base64, not encrypted)."""
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    return claims["roomConfig"]["agents"][0]


# ---------------------------------------------------------------- voice token


def test_token_without_a_body_uses_the_default_brand(client) -> None:
    response = client.post("/api/livekit/token")  # what older websites send

    assert response.status_code == 200
    assert response.json()["room_name"].startswith("cartiva-")
    assert json.loads(_dispatch(response.json()["token"])["metadata"]) == {"brand": "cartiva"}


def test_token_tells_the_agent_which_brand(client) -> None:
    response = client.post("/api/livekit/token", json={"brand": "teststore"})

    assert response.status_code == 200
    assert response.json()["room_name"].startswith("teststore-")
    dispatch = _dispatch(response.json()["token"])
    assert dispatch["agentName"] == get_settings().cartiva_agent_name
    assert json.loads(dispatch["metadata"]) == {"brand": "teststore"}


def test_token_for_an_unknown_brand_is_refused(client) -> None:
    response = client.post("/api/livekit/token", json={"brand": "nope"})

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNKNOWN_BRAND"


# ---------------------------------------------------------------- payment


def test_order_uses_the_requested_brands_prices(client) -> None:
    # Test Cola ₹99 + ₹30 delivery (below ₹199) = ₹129
    response = client.post(
        "/api/payment/create-order", json={"brand": "teststore", "items": [{"productId": "t1", "quantity": 1}]}
    )

    assert response.status_code == 200
    assert response.json()["amount"] == 12900


def test_a_product_from_another_brand_is_not_sold_here(client) -> None:
    # p001 (Tomato) exists in Cartiva, not in teststore.
    response = client.post(
        "/api/payment/create-order", json={"brand": "teststore", "items": [{"productId": "p001", "quantity": 1}]}
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "NOT_FOUND"


def test_order_without_a_brand_uses_the_default_catalog(client) -> None:
    response = client.post("/api/payment/create-order", json={"items": [{"productId": "p001", "quantity": 1}]})

    assert response.status_code == 200


def test_order_for_an_unknown_brand_is_refused(client) -> None:
    response = client.post(
        "/api/payment/create-order", json={"brand": "nope", "items": [{"productId": "p001", "quantity": 1}]}
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNKNOWN_BRAND"


# ---------------------------------------------------------------- list scan


def _scan(brand: str | None):
    fake = FakeOpenAI(result=ScannedList(items=[]))
    app.dependency_overrides[get_openai_client] = lambda: fake
    data = {"brand": brand} if brand else {}
    response = TestClient(app).post("/api/list/scan", files={"image": ("list.png", PNG, "image/png")}, data=data)
    app.dependency_overrides.clear()
    calls = fake.responses.calls
    prompt = calls[0]["input"][0]["content"][0]["text"] if calls else None
    return response, prompt


def test_scan_uses_the_brands_wording(brands_dir) -> None:
    response, prompt = _scan("teststore")

    assert response.status_code == 200
    assert "beverage shopping lists" in prompt and '"cola"' in prompt and '"thanda" → "cola"' in prompt
    assert "grocery" not in prompt


def test_scan_without_a_brand_keeps_the_grocery_prompt(brands_dir) -> None:
    response, prompt = _scan(None)

    assert response.status_code == 200
    assert "grocery shopping lists" in prompt and '"Surf Excel"' in prompt


def test_scan_for_an_unknown_brand_is_refused_before_calling_openai(brands_dir) -> None:
    response, prompt = _scan("nope")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNKNOWN_BRAND"
    assert prompt is None  # no paid vision call was made


# ---------------------------------------------------------------- real data


def test_every_real_brand_folder_loads() -> None:
    _clear_caches()
    for brand_id in catalog_module.known_brands():
        assert catalog_module.get_catalog(brand_id).products
        assert catalog_module.get_brand(brand_id)["id"] == brand_id
