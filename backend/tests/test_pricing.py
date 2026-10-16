"""Python pricing must give exactly the same results as the frontend for every shared case."""

import json
from pathlib import Path

import pytest

from app.catalog import Catalog, get_catalog, rupees_to_paise
from app.pricing import CartItem, quote

CASES_FILE = Path(__file__).resolve().parents[2] / "frontend" / "data" / "pricing-cases.json"
SHARED = json.loads(CASES_FILE.read_text(encoding="utf-8"))
FIXTURE = SHARED["fixture"]
CATALOG = Catalog.from_json(FIXTURE["products"], FIXTURE["offers"], FIXTURE["delivery"])


@pytest.mark.parametrize("case", SHARED["cases"], ids=[c["name"] for c in SHARED["cases"]])
def test_matches_shared_pricing_cases(case: dict) -> None:
    items = [CartItem(product_id=i["productId"], quantity=i["quantity"]) for i in case["items"]]
    result = quote(CATALOG, items)

    assert {
        "subtotal": result.subtotal,
        "discount": result.discount,
        "deliveryFee": result.delivery_fee,
        "total": result.total,
        "appliedOfferIds": result.applied_offer_ids,
    } == case["expected"]


@pytest.mark.parametrize(("rupees", "paise"), [(40, 4000), (49.9, 4990), (133.35, 13335), (249.75, 24975)])
def test_rupees_to_paise_has_no_float_drift(rupees: float, paise: int) -> None:
    assert rupees_to_paise(rupees) == paise


def test_real_catalog_loads() -> None:
    catalog = get_catalog()
    assert len(catalog.products) > 50
    assert catalog.products["p001"].price == 4000  # Tomato ₹40
