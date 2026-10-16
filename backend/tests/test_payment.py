"""Tests for the payment endpoints. A fake Razorpay client is swapped in, so nothing leaves the machine."""

import hashlib
import hmac
from typing import Any

import pytest
import razorpay
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.routers.payment import get_razorpay_client


class FakeOrders:
    def __init__(self) -> None:
        self.created: list[dict[str, Any]] = []
        self.by_id: dict[str, dict[str, Any]] = {}

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        self.created.append(data)
        order = {"id": "order_TEST123", "amount": data["amount"], "currency": data["currency"], "status": "created"}
        self.by_id[order["id"]] = order
        return order

    def fetch(self, order_id: str) -> dict[str, Any]:
        return self.by_id[order_id]


class FakeRazorpay:
    def __init__(self) -> None:
        settings = get_settings()
        self.order = FakeOrders()
        # The real signature checker: it only needs our secret, no network.
        self.utility = razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret.get_secret_value())
        ).utility


@pytest.fixture
def razorpay_fake():
    fake = FakeRazorpay()
    app.dependency_overrides[get_razorpay_client] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


@pytest.fixture
def client(razorpay_fake) -> TestClient:
    return TestClient(app)


def create_order(client: TestClient, items: list[dict[str, Any]]):
    return client.post("/api/payment/create-order", json={"items": items})


def test_amount_is_computed_by_the_server(client, razorpay_fake) -> None:
    # 2 × Tomato ₹40 + 1 × Potato ₹35 = ₹115, + ₹30 delivery (below ₹499) = ₹145
    response = create_order(client, [{"productId": "p001", "quantity": 2}, {"productId": "p004", "quantity": 1}])

    assert response.status_code == 200
    body = response.json()
    assert body["amount"] == 14500
    assert body["order_id"] == "order_TEST123"
    assert body["key_id"].startswith("rzp_")
    assert razorpay_fake.order.created[0]["amount"] == 14500
    assert razorpay_fake.order.created[0]["currency"] == "INR"


def test_price_sent_by_the_browser_is_ignored(client, razorpay_fake) -> None:
    response = create_order(client, [{"productId": "p001", "quantity": 2, "price": 1}])

    assert response.status_code == 200
    assert response.json()["amount"] == 11000  # 2 × ₹40 + ₹30 delivery, not ₹1


def test_unknown_product_is_rejected(client, razorpay_fake) -> None:
    response = create_order(client, [{"productId": "p999", "quantity": 1}])

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "NOT_FOUND"
    assert razorpay_fake.order.created == []  # no order created


def test_out_of_stock_is_rejected(client, razorpay_fake) -> None:
    response = create_order(client, [{"productId": "p011", "quantity": 1}])

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "OUT_OF_STOCK"


def test_more_than_available_is_rejected(client, razorpay_fake) -> None:
    response = create_order(client, [{"productId": "p056", "quantity": 3}])  # Surf Excel Easy Wash: only 2

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PARTIAL_STOCK"


@pytest.mark.parametrize("items", [[], [{"productId": "p001", "quantity": 0}], [{"productId": "p001"}]])
def test_invalid_requests_are_rejected_by_validation(client, items) -> None:
    assert create_order(client, items).status_code == 422


def sign(order_id: str, payment_id: str) -> str:
    """Makes the same signature Razorpay would (HMAC-SHA256 of "order_id|payment_id" with our secret)."""
    secret = get_settings().razorpay_key_secret.get_secret_value().encode()
    return hmac.new(secret, f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


CART = [{"productId": "p001", "quantity": 2}]  # 2 × Tomato + delivery = 11000 paise


def verify(client: TestClient, order_id: str, payment_id: str, signature: str, items=CART):
    return client.post(
        "/api/payment/verify",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "items": items,
        },
    )


def test_valid_payment_is_verified(client) -> None:
    order_id = create_order(client, CART).json()["order_id"]
    response = verify(client, order_id, "pay_TEST", sign(order_id, "pay_TEST"))

    assert response.status_code == 200
    assert response.json() == {"verified": True, "order_id": order_id, "payment_id": "pay_TEST", "amount": 11000}


def test_fake_signature_is_rejected(client) -> None:
    order_id = create_order(client, CART).json()["order_id"]
    response = verify(client, order_id, "pay_TEST", "not-a-real-signature")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PAYMENT_VERIFICATION_FAILED"


def test_payment_for_a_cheaper_cart_cannot_be_reused(client) -> None:
    # Pay (validly) for 2 tomatoes, then try to claim it for a much bigger cart.
    order_id = create_order(client, CART).json()["order_id"]
    bigger_cart = [{"productId": "p055", "quantity": 2}]  # 2 × Surf Excel Matic 2 kg
    response = verify(client, order_id, "pay_TEST", sign(order_id, "pay_TEST"), items=bigger_cart)

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PAYMENT_VERIFICATION_FAILED"
