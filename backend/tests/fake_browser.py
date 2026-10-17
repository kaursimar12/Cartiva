"""A stand-in for the shopper's browser, so agent conversations can be tested without a website.

It answers the same RPC methods as frontend/lib/voice/rpc.ts, with the same result shapes, using
the real catalog (frontend/data/products.json). Tests read its cart / screen / payments afterwards.
"""

import json
import re
from pathlib import Path
from typing import Any

PRODUCTS: list[dict[str, Any]] = json.loads(
    (Path(__file__).resolve().parents[2] / "frontend" / "data" / "products.json").read_text(encoding="utf-8")
)
BY_ID = {p["id"]: p for p in PRODUCTS}
CATEGORIES = {
    "vegetables": "Vegetables", "fruits": "Fruits", "dairy": "Dairy", "beverages": "Beverages",
    "snacks": "Snacks", "breakfast": "Breakfast", "cleaning": "Cleaning", "laundry": "Laundry",
    "personal-care": "Personal Care",
}


def rupees(amount: float) -> str:
    return f"₹{amount:,.0f}" if amount == int(amount) else f"₹{amount:,.2f}"


def agent_product(p: dict[str, Any]) -> dict[str, Any]:
    return {
        "productId": p["id"], "name": p["name"], "brand": p["brand"], "unit": p["unit"],
        "price": rupees(p["price"]), "priceRupees": p["price"], "inStock": p["stock"],
    }


def _variants(term: str) -> list[str]:
    out = [term]
    if len(term) > 4 and term.endswith("es"):
        out.append(term[:-2])
    if len(term) > 3 and term.endswith("s"):
        out.append(term[:-1])
    return out


def search(query: str) -> list[dict[str, Any]]:
    """Same idea as CatalogService.search: every query word must match name/brand/category/tags."""
    terms = re.sub(r"[^a-z0-9\s-]", " ", query.lower()).split()
    if not terms:
        return []

    def haystack(p: dict[str, Any]) -> str:
        return " ".join([p["name"], p["brand"] or "", CATEGORIES[p["category"]], *p["tags"]]).lower()

    hits = [p for p in PRODUCTS if all(any(v in haystack(p) for v in _variants(t)) for t in terms)]
    return sorted(hits, key=lambda p: p["price"])


class FakeBrowser:
    def __init__(self) -> None:
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
        product = BY_ID.get(line["productId"]) if line["productId"] else None
        return {
            "lineId": line["lineId"], "written": line["written"], "status": line["status"],
            "packs": line["packs"], "limited": False,
            "product": agent_product(product) if product else None,
            "options": [agent_product(BY_ID[o]) for o in line["options"]] if line["status"] == "choose" else [],
        }

    def _find_list_line(self, line_id: Any) -> dict[str, Any] | None:
        return next((line for line in self.shopping_list if line["lineId"] == line_id), None)

    # ---- test helpers (simulate the shopper clicking) ----
    def click_category(self, category: str, sort_by_price_desc: bool = False) -> None:
        items = sorted(
            (p for p in PRODUCTS if p["category"] == category),
            key=lambda p: p["price"], reverse=sort_by_price_desc,
        )
        self.screen = (CATEGORIES[category], [p["id"] for p in items])

    def called(self, method: str) -> list[dict[str, Any]]:
        return [payload for name, payload in self.calls if name == method]

    # ---- the RPC entry point the agent calls (replaces agent.rpc.call_browser) ----
    async def call(self, method: str, payload: dict[str, Any] | None = None) -> Any:
        payload = payload or {}
        self.calls.append((method, payload))
        return getattr(self, "_" + method.replace(".", "_"))(payload)

    def _cart_get(self, _: dict[str, Any]) -> dict[str, Any]:
        items = [
            {"productId": pid, "name": BY_ID[pid]["name"], "unit": BY_ID[pid]["unit"], "quantity": q,
             "lineTotal": rupees(BY_ID[pid]["price"] * q)}
            for pid, q in self.cart.items()
        ]
        subtotal = sum(BY_ID[pid]["price"] * q for pid, q in self.cart.items())
        return {"ok": True, "items": items, "subtotal": rupees(subtotal), "discount": "₹0",
                "deliveryFee": "₹0" if subtotal >= 499 or not subtotal else "₹30",
                "total": rupees(subtotal + (0 if subtotal >= 499 or not subtotal else 30))}

    def _catalog_search(self, p: dict[str, Any]) -> dict[str, Any]:
        results = search(str(p.get("query") or ""))
        if isinstance(p.get("maxPrice"), (int, float)):
            results = [r for r in results if r["price"] <= p["maxPrice"]]
        if isinstance(p.get("minPrice"), (int, float)):
            results = [r for r in results if r["price"] >= p["minPrice"]]
        self.screen = (f'Search results for "{p.get("query")}"', [r["id"] for r in results])
        return {"ok": True, "count": len(results), "shownOnScreen": True,
                "products": [agent_product(r) for r in results[:8]]}

    def _cart_add(self, p: dict[str, Any]) -> dict[str, Any]:
        pid, qty = p.get("productId"), p.get("quantity", 1)
        product = BY_ID.get(pid)
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
        return {"ok": True, "message": f"Removed {BY_ID[pid]['name']} from your cart."}

    def _cart_update(self, p: dict[str, Any]) -> dict[str, Any]:
        pid, qty = p.get("productId"), p.get("quantity")
        if pid not in self.cart:
            return {"ok": False, "error": {"code": "NOT_IN_CART", "message": "That item isn't in your cart."}}
        if qty == 0:
            return self._cart_remove(p)
        self.cart[pid] = qty
        return {"ok": True, "message": f"Updated {BY_ID[pid]['name']} to {qty}.", "quantityInCart": qty}

    def _ui_openCategory(self, p: dict[str, Any]) -> dict[str, Any]:
        cat = p.get("category")
        if cat not in CATEGORIES:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That category doesn't exist."}}
        self.click_category(cat)
        ids = self.screen[1]
        return {"ok": True, "shownOnScreen": True, "category": CATEGORIES[cat], "count": len(ids),
                "products": [agent_product(BY_ID[i]) for i in ids[:8]]}

    def _ui_openProduct(self, p: dict[str, Any]) -> dict[str, Any]:
        product = BY_ID.get(p.get("productId"))
        if product is None:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That product couldn't be found."}}
        self.screen = (product["name"], [product["id"]])
        return {"ok": True, "shownOnScreen": True, "product": agent_product(product)}

    def _ui_openPage(self, p: dict[str, Any]) -> dict[str, Any]:
        page = p.get("page")
        if page not in ("home", "cart", "scan-list"):
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "That page doesn't exist."}}
        self.screen = (page, [])
        return {"ok": True, "shownOnScreen": True, "page": page}

    def _ui_getScreen(self, _: dict[str, Any]) -> dict[str, Any]:
        title, ids = self.screen
        return {"ok": True, "page": "/", "title": title, "productCount": len(ids),
                "products": [{"position": i + 1, **agent_product(BY_ID[pid])} for i, pid in enumerate(ids[:20])]}

    def _checkout_start(self, _: dict[str, Any]) -> dict[str, Any]:
        if not self.cart:
            return {"ok": False, "error": {"code": "EMPTY_CART", "message": "Your cart is empty."}}
        total = self._cart_get({})["total"]
        return {"ok": True, "itemCount": sum(self.cart.values()), "total": total,
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
        hits = search(name)
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
