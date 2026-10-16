"""Read-only access to the JSON catalog in frontend/data (the backend never writes to it).

JSON stores money in rupees; everything here uses integer paise, exactly like the frontend
(frontend/models/repositories/json-catalog-repository.ts).
"""

import json
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from app.config import get_settings

Paise = int  # ₹1 = 100 paise


def rupees_to_paise(rupees: float) -> Paise:
    """₹49.90 → 4990. Decimal avoids float surprises and rounds .5 up, like JavaScript's Math.round."""
    return int((Decimal(str(rupees)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    category: str
    price: Paise
    unit: str
    stock: bool
    available_quantity: int


@dataclass(frozen=True)
class Offer:
    id: str
    title: str
    category: str | None  # None = applies to the whole cart
    minimum_amount: Paise
    discount_type: Literal["percentage", "flat"]
    discount_value: int  # percent for "percentage", paise for "flat"
    active: bool


@dataclass(frozen=True)
class DeliveryPolicy:
    fee: Paise
    free_above: Paise


@dataclass(frozen=True)
class Catalog:
    products: dict[str, Product]
    offers: list[Offer]
    delivery: DeliveryPolicy

    @classmethod
    def from_json(cls, products: list[dict[str, Any]], offers: list[dict[str, Any]], delivery: dict[str, Any]) -> "Catalog":
        """Builds a catalog from JSON data (in rupees), converting all money to paise."""
        return cls(
            products={
                p["id"]: Product(
                    id=p["id"],
                    name=p.get("name", p["id"]),
                    category=p["category"],
                    price=rupees_to_paise(p["price"]),
                    unit=p.get("unit", ""),
                    stock=p.get("stock", True),
                    available_quantity=p.get("availableQuantity", 0),
                )
                for p in products
            },
            offers=[
                Offer(
                    id=o["id"],
                    title=o.get("title", o["id"]),
                    category=o["category"],
                    minimum_amount=rupees_to_paise(o["minimumAmount"]),
                    discount_type=o["discountType"],
                    discount_value=(
                        rupees_to_paise(o["discountValue"]) if o["discountType"] == "flat" else o["discountValue"]
                    ),
                    active=o["active"],
                )
                for o in offers
            ],
            delivery=DeliveryPolicy(
                fee=rupees_to_paise(delivery["fee"]),
                free_above=rupees_to_paise(delivery["freeAbove"]),
            ),
        )


def _read_json(data_dir: Path, name: str) -> Any:
    return json.loads((data_dir / name).read_text(encoding="utf-8"))


@lru_cache
def get_catalog() -> Catalog:
    """The real catalog from DATA_DIR (default: ../frontend/data), loaded once and reused."""
    data_dir = get_settings().data_dir
    return Catalog.from_json(
        _read_json(data_dir, "products.json"),
        _read_json(data_dir, "offers.json"),
        _read_json(data_dir, "delivery.json"),
    )
