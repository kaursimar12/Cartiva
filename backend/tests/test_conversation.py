"""Conversation tests for the Cartiva voice agent.

They run the REAL agent (instructions + tools + the same LLM as production) in text mode — no
microphone, no speech — against a FakeBrowser instead of the website. We check outcomes (what ended
up in the cart, whether a payment happened), not exact wording, because the LLM words things
differently each time.

These call the LLM through LiveKit Inference, so they use a little of the free monthly credit
(text only, no STT/TTS). Run them all:   uv run pytest -v
Run one:                                uv run pytest -v -k cheapest
"""

import re

import pytest
from livekit.agents import AgentSession, inference

import agent.worker as worker
from tests.fake_browser import BY_ID, FakeBrowser

LLM_MODEL = "google/gemma-4-31b-it"  # same model as agent/worker.py

DEVANAGARI = re.compile(r"[ऀ-ॿ]")


@pytest.fixture
def browser(monkeypatch: pytest.MonkeyPatch) -> FakeBrowser:
    """Every tool that would talk to the website talks to this fake browser instead."""
    fake = FakeBrowser()
    monkeypatch.setattr(worker, "call_browser", fake.call)
    return fake


@pytest.fixture
async def chat(browser: FakeBrowser):
    """Starts the real agent and returns a `say(text)` helper that runs one shopper turn."""
    async with (
        inference.LLM(model=LLM_MODEL) as llm,
        AgentSession(llm=llm, max_tool_steps=worker.MAX_TOOL_STEPS) as session,
    ):
        await session.start(worker.CartivaAssistant())

        async def say(text: str):
            return await session.run(user_input=text)

        yield say


def assistant_text(result) -> str:
    """Everything the agent said in one turn, joined together."""
    parts = []
    for event in result.events:
        if event.type == "message" and event.item.role == "assistant":
            text = event.item.text_content
            parts.append(text() if callable(text) else (text or ""))
    return " ".join(parts)


# ---------------------------------------------------------------- A. search & references


async def test_search_with_price_limit(chat, browser: FakeBrowser) -> None:
    await chat("Show me dishwashing liquids under 200 rupees")

    searches = browser.called("catalog.search")
    assert searches, "agent should call search_products"
    assert searches[-1].get("maxPrice") == 200


async def test_cheapest_then_add_that_one(chat, browser: FakeBrowser) -> None:
    await chat("Show me dishwashing liquids under 200 rupees")
    await chat("Which one is the cheapest?")
    await chat("Add that one")

    assert browser.cart == {"p045": 1}, "should add Vim 250 ml (₹55), the cheapest"


async def test_kg_means_number_of_packs(chat, browser: FakeBrowser) -> None:
    await chat("Add 2 kg potatoes")

    assert browser.cart == {"p004": 2}, "Potato is sold as 1 kg packs, so 2 kg = quantity 2"


async def test_two_products_in_one_sentence(chat, browser: FakeBrowser) -> None:
    await chat("Add 1 kg tomatoes and 2 kg potatoes")

    assert browser.cart == {"p001": 1, "p004": 2}


async def test_unknown_product_does_not_loop(chat, browser: FakeBrowser) -> None:
    await chat("Show me pizza")  # not in the catalog

    assert 1 <= len(browser.called("catalog.search")) <= 2, "must not repeat a search that finds nothing"
    assert browser.cart == {}


async def test_make_that_two(chat, browser: FakeBrowser) -> None:
    await chat("Add 1 kg tomatoes")
    assert browser.cart == {"p001": 1}

    await chat("Make that two")
    assert browser.cart == {"p001": 2}, "'that' means the tomatoes just added"


async def test_remove_it(chat, browser: FakeBrowser) -> None:
    browser.cart = {"p001": 1, "p019": 1}  # tomatoes + toned milk already in the cart
    await chat("Remove the milk")

    assert browser.cart == {"p001": 1}


# ---------------------------------------------------------------- B. screen context & ambiguity


async def test_cheapest_on_screen_after_clicking(chat, browser: FakeBrowser) -> None:
    browser.click_category("fruits")  # the shopper browsed by tapping, not by voice
    await chat("Add the cheapest one")

    in_stock = [pid for pid in browser.screen[1] if BY_ID[pid]["stock"]]
    cheapest = min(in_stock, key=lambda pid: BY_ID[pid]["price"])  # Banana Robusta, no tie
    assert browser.called("ui.getScreen"), "agent should look at the screen"
    assert browser.cart == {cheapest: 1}


async def test_price_tie_asks_instead_of_choosing(chat, browser: FakeBrowser) -> None:
    browser.click_category("snacks")  # three snacks share the lowest price (₹20)
    await chat("Add the cheapest one")
    assert browser.cart == {}, "with a tie it must ask, not add"

    await chat("Kurkure")
    assert browser.cart == {"p035": 1}


async def test_most_expensive_tie_asks(chat, browser: FakeBrowser) -> None:
    browser.click_category("breakfast")  # Corn Flakes and Quaker Oats both cost ₹199
    await chat("Add the most expensive one")

    assert browser.cart == {}, "with a tie it must ask, not add"


async def test_ambiguous_brand_asks(chat, browser: FakeBrowser) -> None:
    await chat("Add Surf Excel")  # three Surf Excel products exist

    assert browser.cart == {}, "several Surf Excel products: it should ask which one"


# ---------------------------------------------------------------- C. checkout safety


async def test_checkout_needs_explicit_yes(chat, browser: FakeBrowser) -> None:
    browser.cart = {"p001": 2}
    await chat("Checkout")
    assert browser.called("checkout.start"), "should start checkout and read the total"
    assert browser.payments == 0, "must not pay before the shopper says yes"

    await chat("Yes, pay now")
    assert browser.payments == 1


async def test_checkout_cancelled(chat, browser: FakeBrowser) -> None:
    browser.cart = {"p001": 2}
    await chat("Checkout")
    await chat("No, wait")

    assert browser.payments == 0
    assert browser.cart == {"p001": 2}, "cart must be kept"


async def test_pay_now_without_checkout_still_asks_first(chat, browser: FakeBrowser) -> None:
    browser.cart = {"p001": 2}
    await chat("Pay now")

    assert browser.payments == 0, "first turn must only start checkout and ask for confirmation"


async def test_cart_change_cancels_pending_checkout(chat, browser: FakeBrowser) -> None:
    browser.cart = {"p001": 2}
    await chat("Checkout")
    await chat("Actually add one Amul Taaza toned milk too")
    await chat("Yes")

    assert browser.payments == 0, "after a cart change the new total must be confirmed again"


# ---------------------------------------------------------------- D. language


async def test_replies_in_hindi(chat, browser: FakeBrowser) -> None:
    result = await chat("आप क्या कर सकते हो?")

    assert DEVANAGARI.search(assistant_text(result)), "a Hindi question should get a Hindi answer"


async def test_hindi_product_name_is_translated_for_search(chat, browser: FakeBrowser) -> None:
    await chat("टमाटर दिखाओ")

    searches = browser.called("catalog.search")
    assert searches and "tomato" in str(searches[-1].get("query", "")).lower()
