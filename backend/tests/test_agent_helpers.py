"""Unit tests for the helpers that do work the LLM is unreliable at (no LLM calls)."""

from agent.worker import plain_match, price_extremes


def product(pid: str, name: str, price: float, in_stock: bool = True) -> dict:
    return {"productId": pid, "name": name, "priceRupees": price, "inStock": in_stock}


TOMATOES = [product("p001", "Tomato", 40), product("p003", "Tomato Puree", 45), product("p002", "Tomato Cherry", 80)]


def test_plain_match_picks_the_plain_product_for_a_plural() -> None:
    assert plain_match("tomatoes", TOMATOES)["productId"] == "p001"
    assert plain_match("Apples", [product("p010", "Apple", 120), product("p011", "Apple Juice", 99)])["productId"] == "p010"


def test_plain_match_none_when_no_product_is_the_plain_name() -> None:
    assert plain_match("dishwash", [product("p045", "Vim Liquid 250 ml", 55), product("p046", "Pril", 99)]) is None


def test_price_extremes_lists_every_tied_product() -> None:
    screen = [product("a", "Corn Flakes", 199), product("b", "Quaker Oats", 199), product("c", "Bread", 55)]
    result = price_extremes(screen)
    assert [p["productId"] for p in result["mostExpensiveInStock"]] == ["a", "b"]
    assert [p["productId"] for p in result["cheapestInStock"]] == ["c"]


def test_price_extremes_ignores_out_of_stock() -> None:
    screen = [product("a", "Guava", 30, in_stock=False), product("b", "Banana", 60), product("c", "Papaya", 70)]
    assert [p["productId"] for p in price_extremes(screen)["cheapestInStock"]] == ["b"]


def test_price_extremes_empty_screen() -> None:
    assert price_extremes([]) == {}
