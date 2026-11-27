"""Read-only access to the JSON catalog in frontend/data/brands/<brand> (the backend never writes to it).

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
    product_ids: tuple[str, ...] | None  # a "deal" limited to these products; None = whole category/cart
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
                    product_ids=tuple(o["productIds"]) if o.get("productIds") is not None else None,
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


class UnknownBrandError(ValueError):
    """A request named a storefront that has no folder in BRANDS_DIR."""


@lru_cache
def known_brands() -> tuple[str, ...]:
    """Every storefront in BRANDS_DIR: folders that contain a brand.json."""
    root = get_settings().brands_dir
    return tuple(sorted(p.parent.name for p in root.glob("*/brand.json")))


def resolve_brand(brand: str | None) -> str:
    """The brand to serve: the one asked for, or the default. Raises UnknownBrandError for anything else."""
    brand_id = (brand or "").strip() or get_settings().default_brand
    if brand_id not in known_brands():
        raise UnknownBrandError(brand_id)
    return brand_id


@lru_cache
def _load_catalog(brand_id: str) -> Catalog:
    data_dir = get_settings().brands_dir / brand_id
    return Catalog.from_json(
        _read_json(data_dir, "products.json"),
        _read_json(data_dir, "offers.json"),
        _read_json(data_dir, "delivery.json"),
    )


def get_catalog(brand: str | None = None) -> Catalog:
    """A storefront's catalog (default brand when none is given), loaded once per brand and reused."""
    return _load_catalog(resolve_brand(brand))


@lru_cache
def _load_brand(brand_id: str) -> dict[str, Any]:
    return _read_json(get_settings().brands_dir / brand_id, "brand.json")


def get_brand(brand: str | None = None) -> dict[str, Any]:
    """A storefront's brand.json (names, copy, list-scan examples…), loaded once per brand."""
    return _load_brand(resolve_brand(brand))
