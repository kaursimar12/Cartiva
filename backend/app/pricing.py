"""Server-side pricing. Must give exactly the same totals as the frontend
(frontend/services/pricing/pricing-service.ts). Both are tested against
frontend/data/pricing-cases.json.
"""

from dataclasses import dataclass

from app.catalog import Catalog, Offer, Paise


@dataclass(frozen=True)
class CartItem:
    product_id: str
    quantity: int


@dataclass(frozen=True)
class PriceBreakdown:
    subtotal: Paise
    discount: Paise
    delivery_fee: Paise
    total: Paise
    applied_offer_ids: list[str]


def quote(catalog: Catalog, items: list[CartItem]) -> PriceBreakdown:
    """Subtotal − discount + delivery = total, all in paise. Unknown product ids are ignored."""
    lines = [(catalog.products[i.product_id], i.quantity) for i in items if i.product_id in catalog.products]
    subtotal = sum(product.price * quantity for product, quantity in lines)

    applied: list[tuple[Offer, Paise]] = []
    for offer in catalog.offers:
        if not offer.active:
            continue
        eligible = sum(
            product.price * quantity
            for product, quantity in lines
            if offer.category is None or product.category == offer.category
        )
        if eligible == 0 or eligible < offer.minimum_amount:
            continue
        applied.append((offer, _discount(offer, eligible)))

    discount = min(sum(amount for _, amount in applied), subtotal)
    free_delivery = subtotal == 0 or subtotal >= catalog.delivery.free_above
    delivery_fee = 0 if free_delivery else catalog.delivery.fee

    return PriceBreakdown(
        subtotal=subtotal,
        discount=discount,
        delivery_fee=delivery_fee,
        total=subtotal - discount + delivery_fee,
        applied_offer_ids=[offer.id for offer, _ in applied],
    )


def _discount(offer: Offer, eligible: Paise) -> Paise:
    if offer.discount_type == "percentage":
        return eligible * offer.discount_value // 100  # // rounds DOWN, like Math.floor in TypeScript
    return min(offer.discount_value, eligible)
