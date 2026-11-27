"""A stand-in for the shopper's browser, so agent conversations can be tested without a website.

It answers the same RPC methods as frontend/lib/voice/rpc.ts, with the same result shapes, using a
real brand catalog (frontend/data/brands/<brand>/). Tests read its cart / screen / payments afterwards.
"""

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.catalog import Catalog
from app.pricing import CartItem, quote

BRANDS_DIR = Path(__file__).resolve().parents[2] / "frontend" / "data" / "brands"


def rupees(amount: float) -> str:
    return f"₹{amount:,.0f}" if amount == int(amount) else f"₹{amount:,.2f}"


def _variants(term: str) -> list[str]:
    out = [term]
    if len(term) > 4 and term.endswith("es"):
        out.append(term[:-2])
    if len(term) > 3 and term.endswith("s"):
        out.append(term[:-1])
    return out


class StoreData:
    """One brand's catalog as the browser sees it: products, aisles, deals and real pricing."""

    def __init__(self, brand: str) -> None:
        folder = BRANDS_DIR / brand

        def load(name: str) -> Any:
            return json.loads((folder / name).read_text(encoding="utf-8"))

        self.brand = brand
        self.products: list[dict[str, Any]] = load("products.json")
        self.offers: list[dict[str, Any]] = load("offers.json")
        self.delivery: dict[str, Any] = load("delivery.json")
        self.by_id = {p["id"]: p for p in self.products}
        # Real pricing (the server's copy of the website's rules), so cart totals match the app.
        self.catalog = Catalog.from_json(self.products, self.offers, self.delivery)
        self.deals = {pid: o for o in self.offers if o["active"] and o.get("productIds") for pid in o["productIds"]}
        self.categories = {c["id"]: c["name"] for c in load("categories.json")}

    def agent_product(self, p: dict[str, Any]) -> dict[str, Any]:
        out = {
            "productId": p["id"], "name": p["name"], "brand": p.get("brand"), "unit": p["unit"],
            "price": rupees(p["price"]), "priceRupees": p["price"], "inStock": p["stock"],
        }
        deal = self.deals.get(p["id"])
        if deal:  # same extra fields as toAgentProduct in voice-controller.ts
            out["deal"] = deal["title"]
            if deal["discountType"] == "percentage" and deal["minimumAmount"] == 0:
                paise = round(p["price"] * 100)
                out["dealPrice"] = rupees((paise - paise * deal["discountValue"] // 100) / 100)
        return out

    def search(self, query: str) -> list[dict[str, Any]]:
        """Same idea as CatalogService.search: every query word must match name/brand/category/tags."""
        terms = re.sub(r"[^a-z0-9\s-]", " ", query.lower()).split()
        if not terms:
            return []

        def haystack(p: dict[str, Any]) -> str:
            # Same words as CatalogService.searchableText, including the pack size ("1.25 L" → also "litre").
            unit = p["unit"]
            pack = " ".join([unit, re.sub(r"\bL\b", "litre", unit), re.sub(r"\bL\b", "liter", unit)])
            text = " ".join([p["name"], p.get("brand") or "", self.categories[p["category"]], pack, *p.get("tags", [])])
            return re.sub(r"[^a-z0-9\s-]", " ", text.lower())

        hits = [p for p in self.products if all(any(v in haystack(p) for v in _variants(t)) for t in terms)]
        return sorted(hits, key=lambda p: p["price"])


@lru_cache
def store(brand: str = "cartiva") -> StoreData:
    return StoreData(brand)


# The default (Cartiva) store's data, for tests that look products up directly.
_DEFAULT = store()
PRODUCTS = _DEFAULT.products
BY_ID = _DEFAULT.by_id
CATEGORIES = _DEFAULT.categories


class FakeBrowser:
    def __init__(self, brand: str = "cartiva") -> None:
        self.store = store(brand)
        self.cart: dict[str, int] = {}
        self.screen: tuple[str, list[str]] = ("", [])  # (title, productIds in on-screen order)
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.payments = 0
        self.shopping_list: list[dict[str, Any]] = []  # lines of a scanned list, like the review page

    # ---- shopping list helpers (simulate a scanned photo) ----
    def load_list(self, lines: list[tuple[str, str, str | None, int, list[str]]]) -> None:
        """Each line: (written, status, productId, packs, option ids)."""
        self.shopping_list = [
            {"lineId": f"line-{i + 1}", "written": written, "status": status, "productId": pid,
             "packs": packs, "options": options}
            for i, (written, status, pid, packs, options) in enumerate(lines)
        ]

    def _list_line(self, line: dict[str, Any]) -> dict[str, Any]:
        product = self.store.by_id.get(line["productId"]) if line["productId"] else None
        return {
            "lineId": line["lineId"], "written": line["written"], "status": line["status"],
            "packs": line["packs"], "limited": False,
            "product": self.store.agent_product(product) if product else None,
            "options": [self.store.agent_product(self.store.by_id[o]) for o in line["options"]] if line["status"] == "choose" else [],
        }

    def _find_list_line(self, line_id: Any) -> dict[str, Any] | None:
        return next((line for line in self.shopping_list if line["lineId"] == line_id), None)

    # ---- test helpers (simulate the shopper clicking) ----
    def click_category(self, category: str, sort_by_price_desc: bool = False) -> None:
        items = sorted(
            (p for p in self.store.products if p["category"] == category),
            key=lambda p: p["price"], reverse=sort_by_price_desc,
        )
        self.screen = (self.store.categories[category], [p["id"] for p in items])

    def called(self, method: str) -> list[dict[str, Any]]:
        return [payload for name, payload in self.calls if name == method]

    # ---- the RPC entry point the agent calls (replaces agent.rpc.call_browser) ----
    async def call(self, method: str, payload: dict[str, Any] | None = None) -> Any:
        payload = payload or {}
        self.calls.append((method, payload))
        return getattr(self, "_" + method.replace(".", "_"))(payload)

    def _cart_get(self, _: dict[str, Any]) -> dict[str, Any]:
        items = [
            {"productId": pid, "name": self.store.by_id[pid]["name"], "unit": self.store.by_id[pid]["unit"], "quantity": q,
             "lineTotal": rupees(self.store.by_id[pid]["price"] * q)}
            for pid, q in self.cart.items()
        ]
        price = quote(self.store.catalog, [CartItem(product_id=pid, quantity=q) for pid, q in self.cart.items()])
        return {"ok": True, "items": items, "subtotal": rupees(price.subtotal / 100),
                "discount": rupees(price.discount / 100), "deliveryFee": rupees(price.delivery_fee / 100),
                "total": rupees(price.total / 100)}

    def _catalog_search(self, p: dict[str, Any]) -> dict[str, Any]:
        results = self.store.search(str(p.get("query") or ""))
        if isinstance(p.get("maxPrice"), (int, float)):
            results = [r for r in results if r["price"] <= p["maxPrice"]]
        if isinstance(p.get("minPrice"), (int, float)):
            results = [r for r in results if r["price"] >= p["minPrice"]]
        show = p.get("showOnScreen") is not False  # like voice-controller.ts: false keeps the current page
        if show:
            self.screen = (f'Search results for "{p.get("query")}"', [r["id"] for r in results])
        return {"ok": True, "count": len(results), "shownOnScreen": show,
                "products": [self.store.agent_product(r) for r in results[:8]]}

    def _cart_add(self, p: dict[str, Any]) -> dict[str, Any]:
        pid, qty = p.get("productId"), p.get("quantity", 1)
        product = self.store.by_id.get(pid)
        if product is None:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That product couldn't be found."}}
        if not isinstance(qty, int) or qty < 1:
            return {"ok": False, "error": {"code": "INVALID_QUANTITY", "message": "Quantity must be a whole number above zero."}}
        if not product["stock"]:
            return {"ok": False, "error": {"code": "OUT_OF_STOCK", "message": f"{product['name']} is currently out of stock."}}
        current = self.cart.get(pid, 0)
        if current + qty > product["availableQuantity"]:
            can = product["availableQuantity"] - current
            return {"ok": False, "error": {"code": "PARTIAL_STOCK", "available": can,
                                           "message": f"Only {can} more {product['name']} available."}}
        self.cart[pid] = current + qty
        return {"ok": True, "message": f"Added {qty} × {product['name']} ({product['unit']}) to your cart.",
                "quantityInCart": self.cart[pid]}

    def _cart_remove(self, p: dict[str, Any]) -> dict[str, Any]:
        pid = p.get("productId")
        if pid not in self.cart:
            return {"ok": False, "error": {"code": "NOT_IN_CART", "message": "That item isn't in your cart."}}
        del self.cart[pid]
        return {"ok": True, "message": f"Removed {self.store.by_id[pid]['name']} from your cart."}

    def _cart_update(self, p: dict[str, Any]) -> dict[str, Any]:
        pid, qty = p.get("productId"), p.get("quantity")
        if pid not in self.cart:
            return {"ok": False, "error": {"code": "NOT_IN_CART", "message": "That item isn't in your cart."}}
        if qty == 0:
            return self._cart_remove(p)
        self.cart[pid] = qty
        return {"ok": True, "message": f"Updated {self.store.by_id[pid]['name']} to {qty}.", "quantityInCart": qty}

    def _ui_openCategory(self, p: dict[str, Any]) -> dict[str, Any]:
        cat = p.get("category")
        if cat not in self.store.categories:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That category doesn't exist."}}
        self.click_category(cat)
        ids = self.screen[1]
        return {"ok": True, "shownOnScreen": True, "category": self.store.categories[cat], "count": len(ids),
                "products": [self.store.agent_product(self.store.by_id[i]) for i in ids[:8]]}

    def _ui_openProduct(self, p: dict[str, Any]) -> dict[str, Any]:
        product = self.store.by_id.get(p.get("productId"))
        if product is None:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That product couldn't be found."}}
        self.screen = (product["name"], [product["id"]])
        return {"ok": True, "shownOnScreen": True, "product": self.store.agent_product(product)}

    def _ui_openPage(self, p: dict[str, Any]) -> dict[str, Any]:
        page = p.get("page")
        if page == "offers":
            return self._ui_openOffers({})
        if page not in ("home", "cart", "scan-list"):
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That page doesn't exist."}}
        self.screen = (page, [])
        return {"ok": True, "shownOnScreen": True, "page": page}

    def _ui_openOffers(self, p: dict[str, Any]) -> dict[str, Any]:
        # Same shape as voiceController.openOffers.
        category = p.get("category") or None
        if category is not None and category not in self.store.categories:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": f"There's no {category} section."}}
        deal_ids = [pid for pid in self.store.by_id if pid in self.store.deals and (category is None or self.store.by_id[pid]["category"] == category)]
        self.screen = (f"Discounted {self.store.categories[category]}" if category else "Offers", deal_ids)
        return {"ok": True, "shownOnScreen": True, "category": self.store.categories.get(category or ""),
                "delivery": f"Free delivery above {rupees(self.store.delivery['freeAbove'])}, otherwise {rupees(self.store.delivery['fee'])}",
                "storeOffers": [{"title": o["title"], "description": o["description"]} for o in self.store.offers
                                if o["active"] and not o.get("productIds")
                                and (category is None or o["category"] in (None, category))],
                "dealCount": len(deal_ids),
                "deals": [self.store.agent_product(self.store.by_id[pid]) for pid in deal_ids[:8]],
                "products": [{"productId": pid} for pid in deal_ids]}

    def _ui_getScreen(self, _: dict[str, Any]) -> dict[str, Any]:
        title, ids = self.screen
        return {"ok": True, "page": "/", "title": title, "productCount": len(ids),
                "products": [{"position": i + 1, **self.store.agent_product(self.store.by_id[pid])} for i, pid in enumerate(ids[:20])]}

    def _ui_highlight(self, p: dict[str, Any]) -> dict[str, Any]:
        # Same shape as voiceController.highlightProducts: only makes cards glow, never changes the cart.
        ids = [pid for pid in p.get("productIds") or [] if pid in self.store.by_id]
        if not ids:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "None of those products exist."}}
        on_screen = set(self.screen[1])
        return {"ok": True, "productIds": ids, "reason": "options" if p.get("reason") == "options" else "spotlight",
                "notOnScreen": [pid for pid in ids if pid not in on_screen]}

    def _checkout_start(self, _: dict[str, Any]) -> dict[str, Any]:
        if not self.cart:
            return {"ok": False, "error": {"code": "EMPTY_CART", "message": "Your cart is empty."}}
        total = self._cart_get({})["total"]
        return {"ok": True, "itemCount": len(self.cart), "total": total,
                "message": f"Your total is {total}. Would you like to proceed to payment?"}

    def _checkout_confirm(self, _: dict[str, Any]) -> dict[str, Any]:
        # Like the real browser: opens the payment window and returns at once (result comes later).
        self.payments += 1
        return {"ok": True, "paymentWindowOpen": True,
                "message": "The payment window is open. The shopper completes the payment on screen; "
                           "you will be told the result."}

    # ---- shopping list RPC methods (same shapes as frontend voiceController) ----
    def _list_get(self, _: dict[str, Any]) -> dict[str, Any]:
        if not self.shopping_list:
            return {"ok": False, "error": {"code": "EMPTY_LIST", "message": "No shopping list yet."}}
        return {"ok": True, "count": len(self.shopping_list), "lines": [self._list_line(l) for l in self.shopping_list]}

    def _list_remove(self, p: dict[str, Any]) -> dict[str, Any]:
        line = self._find_list_line(p.get("lineId"))
        if line is None:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That item is not on the list."}}
        self.shopping_list.remove(line)
        return {"ok": True, "message": f'Removed "{line["written"]}" from the list.'}

    def _list_add(self, p: dict[str, Any]) -> dict[str, Any]:
        name = str(p.get("name") or "").strip()
        if not name:
            return {"ok": False, "error": {"code": "INVALID_QUERY", "message": "No item name was given."}}
        hits = self.store.search(name)
        product = hits[0] if hits else None
        status = "not-found" if product is None else ("found" if product["stock"] else "unavailable")
        packs = max(1, int(p.get("quantity") or 1)) if status == "found" else 0
        line = {"lineId": f"line-{len(self.shopping_list) + 100}", "written": name, "status": status,
                "productId": product["id"] if product else None, "packs": packs, "options": []}
        self.shopping_list.append(line)
        return {"ok": True, "line": self._list_line(line)}

    def _list_update(self, p: dict[str, Any]) -> dict[str, Any]:
        line = self._find_list_line(p.get("lineId"))
        if line is None or line["status"] != "found":
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That item cannot be changed."}}
        line["packs"] = int(p.get("packs") or 1)
        return {"ok": True, "line": self._list_line(line)}

    def _list_choose(self, p: dict[str, Any]) -> dict[str, Any]:
        line = self._find_list_line(p.get("lineId"))
        if line is None or p.get("productId") not in line["options"]:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "Not one of the options."}}
        line.update(status="found", productId=p["productId"], packs=1)
        return {"ok": True, "line": self._list_line(line)}

    def _list_confirm(self, _: dict[str, Any]) -> dict[str, Any]:
        added, failed, skipped = [], [], []
        for line in self.shopping_list:
            if line["status"] != "found":
                skipped.append(line["written"])
                continue
            result = self._cart_add({"productId": line["productId"], "quantity": line["packs"]})
            (added if result["ok"] else failed).append(line["written"])
        self.shopping_list = []
        return {"ok": True, "added": added, "failed": failed, "skipped": skipped}
