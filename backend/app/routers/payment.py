"""Razorpay payments. The browser only sends product ids and quantities — the server decides the amount."""

import uuid
from typing import Annotated

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.catalog import Catalog, get_catalog
from app.config import Settings, get_settings
from app.pricing import CartItem, quote

router = APIRouter(prefix="/api/payment", tags=["payment"])


class OrderItem(BaseModel):
    """One cart line as the browser sends it. Note: no price — prices come from the catalog."""

    model_config = ConfigDict(populate_by_name=True)

    product_id: str = Field(alias="productId")
    quantity: int = Field(gt=0, le=100)


class CreateOrderRequest(BaseModel):
    items: list[OrderItem] = Field(min_length=1, max_length=100)


class CreateOrderResponse(BaseModel):
    """Everything Razorpay Checkout needs in the browser."""

    order_id: str
    amount: int  # paise
    currency: str
    key_id: str  # public by design; the secret never leaves the server


def get_razorpay_client(settings: Annotated[Settings, Depends(get_settings)]) -> razorpay.Client:
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret.get_secret_value()))


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


@router.post("/create-order")
def create_order(
    body: CreateOrderRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    catalog: Annotated[Catalog, Depends(get_catalog)],
    client: Annotated[razorpay.Client, Depends(get_razorpay_client)],
) -> CreateOrderResponse:
    """Recomputes the total from the catalog and creates a Razorpay order for exactly that amount."""
    for item in body.items:
        product = catalog.products.get(item.product_id)
        if product is None:
            raise _error(400, "NOT_FOUND", f"Unknown product {item.product_id}.")
        if not product.stock:
            raise _error(409, "OUT_OF_STOCK", f"{product.name} is out of stock.")
        if item.quantity > product.available_quantity:
            raise _error(409, "PARTIAL_STOCK", f"Only {product.available_quantity} {product.name} available.")

    price = quote(catalog, [CartItem(product_id=i.product_id, quantity=i.quantity) for i in body.items])
    if price.total <= 0:
        raise _error(400, "EMPTY_CART", "Your cart is empty.")

    try:
        order = client.order.create(
            data={
                "amount": price.total,  # paise, computed HERE, not by the browser
                "currency": "INR",
                "receipt": f"cartiva-{uuid.uuid4().hex[:12]}",
            }
        )
    except (razorpay.errors.BadRequestError, razorpay.errors.ServerError, razorpay.errors.GatewayError) as error:
        raise _error(502, "PAYMENT_PROVIDER_ERROR", "Could not create the payment order. Please try again.") from error

    return CreateOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=settings.razorpay_key_id,
    )


class VerifyRequest(BaseModel):
    """What Razorpay Checkout gave the browser, plus the cart being paid for."""

    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    items: list[OrderItem] = Field(min_length=1, max_length=100)


class VerifyResponse(BaseModel):
    verified: bool
    order_id: str
    payment_id: str
    amount: int  # paise


@router.post("/verify")
def verify_payment(
    body: VerifyRequest,
    catalog: Annotated[Catalog, Depends(get_catalog)],
    client: Annotated[razorpay.Client, Depends(get_razorpay_client)],
) -> VerifyResponse:
    """Only a valid Razorpay signature for an order of exactly this cart's total counts as paid."""
    # 1. Was this payment really approved by Razorpay? (HMAC-SHA256 with our secret)
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": body.razorpay_order_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            }
        )
    except razorpay.errors.SignatureVerificationError as error:
        raise _error(400, "PAYMENT_VERIFICATION_FAILED", "The payment could not be verified.") from error

    # 2. Was the paid order for THIS cart's total? (blocks re-using a payment for a cheaper cart)
    expected = quote(catalog, [CartItem(product_id=i.product_id, quantity=i.quantity) for i in body.items]).total
    try:
        order = client.order.fetch(body.razorpay_order_id)
    except (razorpay.errors.BadRequestError, razorpay.errors.ServerError, razorpay.errors.GatewayError) as error:
        raise _error(502, "PAYMENT_PROVIDER_ERROR", "Could not check the payment. Please try again.") from error

    if order["amount"] != expected:
        raise _error(400, "PAYMENT_VERIFICATION_FAILED", "The payment does not match your cart total.")

    return VerifyResponse(
        verified=True,
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        amount=order["amount"],
    )
