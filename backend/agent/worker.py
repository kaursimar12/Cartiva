import asyncio
import json
import os
import logging
import re
from typing import Literal

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    ConversationItemAddedEvent,
    FunctionToolsExecutedEvent,
    JobContext,
    MetricsCollectedEvent,
    RunContext,
    ToolResult,
    TurnHandlingOptions,
    UserInputTranscribedEvent,
    UserStateChangedEvent,
    UserTranscriptionTimeoutEvent,
    cli,
    function_tool,
    get_job_context,
    inference,
    llm,
    metrics,
)

from livekit import rtc

from agent.greeting_audio import load_greeting, play_frames
from agent.language import REPLY_RULES, VOICE_LANGUAGE, Language, detect_language, language_instructions
from agent.brand_profile import STT_KEYTERM_BUDGET, BrandProfile, load_brand_profile, profile_for_job
from agent.rpc import BrowserRpcError, call_browser

logger = logging.getLogger("cartiva-agent")

# Puts LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET from backend/.env into the environment.
load_dotenv()

# Session limits (protect the free monthly credit)
# Hard limit for one voice session (protects the free monthly credit). Override with CARTIVA_MAX_SESSION_SECONDS.
MAX_SESSION_SECONDS = int(os.getenv("CARTIVA_MAX_SESSION_SECONDS", str(5 * 60)))
TIME_WARNING_SECONDS = 30      # heads-up this long before the limit
AWAY_AFTER_SECONDS = 30        # silence before "are you still there?"
GRACE_SECONDS = 15             # extra silence before hanging up
LIST_SIGNAL_WAIT_SECONDS = 0.8 # how long to wait for "a list is coming" before the normal greeting
GREETING_TAKE_WAIT_SECONDS = 2.0  # longest wait for the saved greeting take before speaking it live

# Tool-call rounds allowed in one reply. "Add tomatoes and potatoes" can take 4
# (search, add, search, add); LiveKit's default of 3 would silently drop the last one.
MAX_TOOL_STEPS = 8

# LLM, called through LiveKit Inference (billed to the LiveKit credit). The evals in
# tests/test_conversation.py import this, so the tests always check the model the app uses.
LLM_MODEL = "openai/gpt-4.1-mini"

# The Cartesia voice ID is per brand (brand.json → agent.ttsVoice); browse voices at https://play.cartesia.ai.
TTS_MODEL = "cartesia/sonic-3"
# A fixed pace: left unset, the voice picks its own speed and sounds faster or slower from call to call.
TTS_SPEED = "normal"

# The default brand's profile. Each call builds its own from the job metadata (see entrypoint);
# these module-level names stay for the tests and for anything that only needs the default store.
DEFAULT_PROFILE = load_brand_profile()
STT_PRIORITY_KEYTERMS = DEFAULT_PROFILE.stt_priority_keyterms
STT_KEYTERMS = DEFAULT_PROFILE.stt_keyterms


def _forms(name: str) -> set[str]:
    """The name plus its possible singulars: "tomatoes" → tomatoes / tomatoe / tomato, "apples" → apple."""
    word = name.strip().lower()
    forms = {word}
    if word.endswith("s") and len(word) > 3:
        forms.add(word[:-1])
    if word.endswith("es") and len(word) > 4:
        forms.add(word[:-2])
    return forms


def plain_match(query: str, products: list[dict]) -> dict | None:
    """The one product whose name IS the query ("tomatoes" → "Tomato"), not a variant like "Tomato Puree"."""
    wanted = _forms(query)
    hits = [p for p in products if _forms(str(p.get("name", ""))) & wanted]
    return hits[0] if len(hits) == 1 else None




# Words that mean the shopper is asking about offers (English, Hindi, Hinglish). show_offers only runs
# when the shopper's message has one: the model kept opening offers for "liquids under 200 rupees".
OFFER_WORDS = re.compile(r"offer|deal|discount|\bsale|ऑफ़र|ऑफर|डील|डिस्काउंट|सेल|छूट|chhoot|chhut", re.IGNORECASE)

NOT_AN_OFFER_REQUEST = (
    "The shopper did not ask about offers, deals, discounts or sales, so the offers page was not opened. "
    "If they gave a price limit, call search_products with max_price (or min_price) instead."
)


def price_extremes(products: list[dict]) -> dict:
    """Cheapest and most expensive in-stock products, computed here because the LLM misses ties when
    it compares prices itself. Every product sharing the extreme price is listed."""
    in_stock = [p for p in products if p.get("inStock") and isinstance(p.get("priceRupees"), (int, float))]
    if not in_stock:
        return {}

    def pick(price: float) -> list[dict]:
        return [{"productId": p["productId"], "name": p["name"], "priceRupees": price}
                for p in in_stock if p["priceRupees"] == price]

    cheapest = pick(min(p["priceRupees"] for p in in_stock))
    most_expensive = pick(max(p["priceRupees"] for p in in_stock))
    return {
        "cheapestInStock": cheapest,
        "mostExpensiveInStock": most_expensive,
        "say": (
            "For 'the cheapest' or 'the most expensive' use cheapestInStock / mostExpensiveInStock. "
            "If that list has one product, use it. If it has two or more, they cost the same: name them, "
            "highlight them as options and ask which one; do not add any yet."
        ),
    }

# The default brand's instructions (agent/instructions.py renders them per brand).
INSTRUCTIONS = DEFAULT_PROFILE.instructions


class CartivaAssistant(Agent):
    """The agent's personality and its shopping tools."""

    def __init__(self, profile: BrandProfile | None = None) -> None:
        self._profile = profile or DEFAULT_PROFILE  # which storefront this call is for
        super().__init__(instructions=self._profile.instructions + language_instructions("english"))
        self._language: Language = "english"  # English until the shopper speaks Hindi or Hinglish
        self._last_shopper_text = ""  # what the shopper said this turn (set by set_reply_language)
        # ★ Set by start_checkout; required by confirm_payment; cleared by cancel or any cart change.
        self._pending_checkout_total: str | None = None
        # ★ shop_aisles_one_by_one: [category id, products still wanted] per aisle, the open one first.
        self._aisle_tour: list[list] = []

    def _in_reply_language(self, result: dict | str) -> dict | str:
        """Adds this turn's reply-language rule to a tool result that tells the model what to say.
        Those English "say" instructions arrive after the turn's language rule, so without it the
        model answered a Hindi request in English after a search (found by the evals)."""
        if isinstance(result, dict) and "say" in result:
            result["say"] = f"{result['say']} {REPLY_RULES[self._language]}"
        return result

    async def set_reply_language(self, shopper_text: str) -> Language:
        """Sets the reply language from what the shopper just said: into the standing instructions (so the
        sentence after a tool call keeps it too), the tools' "say" hints, and the voice (so an English reply
        reads "2 kg" as "two kg", not "do kilo"). Called before every reply; the evals call it too, because
        text-mode sessions skip on_user_turn_completed."""
        self._last_shopper_text = shopper_text
        language = detect_language(shopper_text)
        logger.info("reply language: %s", language)
        if language != self._language:
            self._language = language
            await self.update_instructions(self._profile.instructions + language_instructions(language))
            if self.session.tts is not None:  # text-only sessions (tests, evals) have no voice
                self.session.tts.update_options(language=VOICE_LANGUAGE[language])
        return language

    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        """Before every reply: set the reply language from what the shopper actually said this turn."""
        language = await self.set_reply_language(new_message.text_content or "")
        turn_ctx.add_message(role="system", content=REPLY_RULES[language])  # this reply, right away

    @function_tool
    async def get_cart(self, context: RunContext) -> dict | str:
        """Gets what is in the shopper's cart right now: items, quantities, and the bill
        (subtotal, discount, delivery fee and total).

        Call this whenever the shopper asks about their cart, what they have added, or the total.
        """
        try:
            return await call_browser("cart.get")
        except BrowserRpcError:
            return "The cart could not be read right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def search_products(
        self,
        context: RunContext,
        query: str,
        max_price: float | None = None,
        min_price: float | None = None,
        show_on_screen: bool = True,
    ) -> dict | str:
        """Searches the store's catalog. Results open on the shopper's screen unless show_on_screen is false.

        Call this whenever the shopper wants to find, see or browse products, or before adding
        something to the cart (you need the productId from the results).
        When you only need a productId to add, remove or change a product ("add 2 kg onions"),
        set show_on_screen to false: the shopper stays on the page they are looking at.

        A price limit ("under 200 rupees", "below 100", "less than fifty") is part of the search:
        pass it as max_price / min_price here. It is not a request for offers.

        Search for ONE product at a time. If the shopper asks for several products
        ("tomatoes and potatoes"), call this once per product: query "tomato", then query "potato".

        Args:
            query: One product to look for, always in English, e.g. "tomato", "vegetables",
                "dishwashing liquid", "Surf Excel". Never combine products ("tomato potato").
                Keep the pack size or "can"/"bottle" when the shopper said one ("Thums Up 750 ml",
                "Sprite can"): the search matches pack sizes, so that exact pack comes back.
                Translate Hindi words first, e.g. "टमाटर" → "tomato", "दूध" → "milk",
                "सब्ज़ियाँ" → "vegetables".
            max_price: Highest price in rupees, only if the shopper gives one,
                e.g. 200 for "under 200 rupees".
            min_price: Lowest price in rupees, only if the shopper gives one.
            show_on_screen: True when the shopper wants to see or browse products ("show me milk").
                False when you only need the productId for the cart ("add 2 kg onions").
        """
        payload = {"query": query, "maxPrice": max_price, "minPrice": min_price, "showOnScreen": show_on_screen}
        try:
            result = await call_browser("catalog.search", payload)
        except BrowserRpcError:
            return "The search failed right now. Apologise briefly and ask the shopper to try again."

        if result.get("ok") and result.get("count", 0) > 0:
            if show_on_screen:
                result["say"] = (
                    "The results are on screen. Say only how many you found and ask which one they want. "
                    "Do not read out names or prices unless the shopper asks."
                )
            elif result.get("count", 0) > 1:
                plain = plain_match(query, result.get("products") or [])
                if plain:
                    # "tomatoes" → "Tomato", not Tomato Puree: the model kept asking here.
                    result["plainMatch"] = plain
                    result["say"] = (
                        f'{plain["name"]} ({plain["productId"]}) is the plain product for "{query}". Add it '
                        "(with the quantity and pack size the shopper said, e.g. Hindi \"do\" = 2) "
                        "unless they named a variant, brand or size "
                        "that is a different product. Do not ask which one."
                    )
                else:
                    result["say"] = (
                        "Several products match. If the shopper's words don't point to exactly one of them, "
                        "ask which one before calling add_to_cart, and do not say anything was added yet."
                    )

        # Stops the LLM from repeating a search that cannot succeed (e.g. "tomato potato").
        if result.get("ok") and result.get("count") == 0:
            result["hint"] = (
                f'Nothing matches "{query}". Do not repeat this search. If the shopper asked for '
                "several products, search each one separately. Otherwise tell the shopper it was "
                "not found and suggest another word."
            )
        return self._in_reply_language(result)

    @function_tool
    async def add_to_cart(self, context: RunContext, product_id: str, quantity: int | None = None) -> dict | str:
        """Adds a product to the shopper's cart. The cart on screen updates too.

        Only use a product_id that came from search_products results (or an aisle that is open) in this
        conversation. If you don't have one yet, call search_products first. If several products could
        match and it is not clear which one the shopper means, ask them before adding.

        Args:
            product_id: The productId from search_products, e.g. "p001".
            quantity: How many packs to add (a whole number, at least 1). Products are sold in
                packs shown as "unit", e.g. "1 kg". "2 kg tomatoes" with a "1 kg" pack means
                quantity 2. Hindi numbers count too: "do kilo" / "दो किलो" = 2 kg = quantity 2,
                "teen" / "तीन" = 3. If the shopper gives no amount, leave it out (1, or the amount
                they asked for from the aisle that is open in shop_aisles_one_by_one).
        """
        self._pending_checkout_total = None  # ★ cart changed → any old total is no longer valid
        in_tour_aisle = bool(self._aisle_tour) and self._profile.product_aisle.get(product_id) == self._aisle_tour[0][0]
        if quantity is None:
            quantity = self._aisle_tour[0][1] if in_tour_aisle else 1
        try:
            result = await call_browser("cart.add", {"productId": product_id, "quantity": quantity})
        except BrowserRpcError:
            return "Adding to the cart failed right now. Apologise briefly and ask the shopper to try again."
        if in_tour_aisle and isinstance(result, dict) and result.get("ok"):
            return await self._next_tour_aisle(result, quantity)
        return result

    # ---------- several aisles in one request ("one breakfast item, one soft drink and two juices") ----------
    # ★ Code keeps the aisles still to do, so none is forgotten and they open one at a time; the model only
    # works out which product the shopper means in the aisle that is open.

    @function_tool
    async def shop_aisles_one_by_one(
        self, context: RunContext, categories: list[str], quantities: list[int]
    ) -> dict | str:
        """For ONE request that asks for products from SEVERAL aisles without naming the products, e.g.
        "one breakfast item, one dairy item and two fruits" or "ek cold drink aur do juice". Opens only the
        first aisle and remembers the rest. When the shopper's choice from that aisle has been added with
        add_to_cart, the next aisle opens by itself. Never open these aisles with navigate_category and
        never ask about several aisles in one question.

        Args:
            categories: The aisles in the order the shopper said them, as category ids from your instructions.
            quantities: How many products the shopper wants from each aisle, in the same order (1 when
                they gave no number; "two juices" = 2).
        """
        unknown = [c for c in categories if c not in self._profile.aisle_names]
        if not categories or unknown:
            return (f"Unknown aisle ids {unknown}. Use only these category ids: "
                    f"{', '.join(self._profile.aisle_names)}. Then call this tool again.")
        counts = [max(1, int(q)) for q in quantities] + [1] * len(categories)
        self._aisle_tour = [[c, n] for c, n in zip(categories, counts)]
        return await self._open_tour_aisle()

    async def _open_tour_aisle(self) -> dict | str:
        """Opens the aisle at the front of the tour and says how to ask about it."""
        category, wanted = self._aisle_tour[0]
        try:
            result = await call_browser("ui.openCategory", {"category": category})
        except BrowserRpcError:
            self._aisle_tour = []
            return "Opening the aisle failed right now. Apologise briefly and ask the shopper to try again."
        if not isinstance(result, dict) or not result.get("ok"):
            self._aisle_tour = []
            return result
        name = self._profile.aisle_names[category]
        products = [p for p in result.get("products") or [] if p.get("inStock")]
        count = result.get("count", len(products))
        if count <= 3:  # a small aisle: name each product (more would make the spoken reply too long)
            options = ", ".join(f"{p['name']} {p['unit']}" for p in products)
            what = f"Name these options: {options}."
        else:
            brands = self._profile.aisle_brands.get(category) or []
            what = f"Name the brands ({', '.join(brands)}), not every product." if brands else "Name two or three of them."
        if wanted == 1:
            ask = "Ask which one they want."
        else:
            ask = (f"Ask which one they want; say you will add {wanted} of it. If they name ONE product, call "
                   f"add_to_cart once and leave quantity out ({wanted} are added). Only if they name several "
                   "different products, add one of each.")
        later = [self._profile.aisle_names[c] for c, _ in self._aisle_tour[1:]]
        return self._in_reply_language({
            "ok": True,
            "aisle": name,
            "productCount": count,
            "products": products,
            "wanted": wanted,
            "comingNext": later,
            "say": (
                f"The {name} aisle is open on screen. {what} {ask} "
                "Ask only about this aisle; the next one opens after their choice is added. When they choose, "
                "call add_to_cart right away with that productId (leave quantity out unless they said an amount)."
            ),
        })

    async def _next_tour_aisle(self, added: dict, quantity: int) -> dict | str:
        """After an add in the open tour aisle: stay if more are wanted there, else open the next aisle."""
        self._aisle_tour[0][1] -= quantity
        if self._aisle_tour[0][1] > 0:
            added["say"] = (f"Confirm what was added in a few words, then ask which other product they want from "
                            f"this aisle ({self._aisle_tour[0][1]} more).")
            return self._in_reply_language(added)
        self._aisle_tour.pop(0)
        if not self._aisle_tour:
            added["say"] = ("That was the last aisle the shopper asked for. Confirm briefly what was added and ask if "
                            "they want anything else.")
            return self._in_reply_language(added)
        next_aisle = await self._open_tour_aisle()
        if not isinstance(next_aisle, dict):
            return next_aisle
        next_aisle["added"] = added
        next_aisle["say"] = "First confirm in a few words what was just added. Then: " + next_aisle["say"]
        return next_aisle

    @function_tool
    async def remove_from_cart(self, context: RunContext, product_id: str) -> dict | str:
        """Removes a product completely from the shopper's cart. The cart on screen updates too.

        Get the product_id from get_cart first (or from recent search results).

        Args:
            product_id: The productId of the cart item to remove, e.g. "p001".
        """
        self._pending_checkout_total = None  # ★ cart changed → any old total is no longer valid
        try:
            return await call_browser("cart.remove", {"productId": product_id})
        except BrowserRpcError:
            return "Removing the item failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def update_cart(self, context: RunContext, product_id: str, quantity: int) -> dict | str:
        """Sets the exact quantity of a product that is already in the shopper's cart.

        Call get_cart first to see the current quantity. "Make it 3" means quantity 3.
        "One more" means the current quantity plus 1; "one less" means minus 1.
        Quantity 0 removes the item.

        Args:
            product_id: The productId of the cart item, e.g. "p001".
            quantity: The new total number of packs (a whole number, 0 or more).
        """
        self._pending_checkout_total = None  # ★ cart changed → any old total is no longer valid
        try:
            return await call_browser("cart.update", {"productId": product_id, "quantity": quantity})
        except BrowserRpcError:
            return "Updating the cart failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def navigate_category(
        self,
        context: RunContext,
        category: str,
    ) -> dict | str:
        """Opens a category page on the shopper's screen, e.g. "go to fruits", "show me dairy",
        "डेयरी दिखाओ". Returns the category name and how many products are on screen.
        Only for a whole aisle. When the shopper names a product ("show tomatoes", "टमाटर दिखाओ",
        "Maaza dikhao"), use search_products instead, even if you know its aisle.

        Args:
            category: The category id to open, one of this store's aisles listed in your instructions.
        """
        self._aisle_tour = []  # the shopper went elsewhere: stop any one-by-one aisle tour
        try:
            result = await call_browser("ui.openCategory", {"category": category})
            if not isinstance(result, dict) or not result.get("ok"):
                return result
            # Only the count reaches the model, so it can't start reading the products out.
            # If the shopper asks what's there, or says "the cheapest one", it calls get_screen.
            return self._in_reply_language({
                "ok": True,
                "category": result.get("category"),
                "productCount": result.get("count"),
                "say": (
                    "Say only that the category is open and how many products are on screen, then ask "
                    "what they would like. Do not name products. If they ask what is there, call get_screen."
                ),
            })
        except BrowserRpcError:
            return "Opening the category failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def open_product(self, context: RunContext, product_id: str) -> dict | str:
        """Opens one product's detail page on the shopper's screen, e.g. "show me that one",
        "open the Vim one". Use a productId from search_products, navigate_category or get_cart.

        Args:
            product_id: The productId of the product to open, e.g. "p001".
        """
        try:
            return await call_browser("ui.openProduct", {"productId": product_id})
        except BrowserRpcError:
            return "Opening the product failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def open_page(self, context: RunContext, page: Literal["home", "cart", "scan-list"]) -> dict | str:
        """Opens a page on the shopper's screen, e.g. "take me to the cart", "show my cart",
        "go to the home page". To pay, use start_checkout instead. For offers, use show_offers.

        Use page "scan-list" whenever the shopper wants to scan, upload or photograph a shopping list,
        or says they have a list: "I want to scan a list", "scan my list", "I have a shopping list",
        "upload my list", "take a photo of my list", "can you read my list", "list scan karna hai",
        "meri list hai". Then tell them to tap the upload box and pick a photo of the list.

        Args:
            page: "cart" for the cart page, "home" for the home page, "scan-list" for scanning
                a photo of a shopping list.
        """
        try:
            return await call_browser("ui.openPage", {"page": page})
        except BrowserRpcError:
            return "Opening the page failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def show_offers(
        self,
        context: RunContext,
        category: str | None = None,
    ) -> dict | str:
        """Opens the offers page on the shopper's screen: discounted products, store offers and the
        free-delivery rule. Use it whenever they ask about offers, deals, discounts or sales:
        "show me things on offer", "any offers?", "what's on sale", "kya offer hai",
        "discount wali cheezein dikhao".

        Pass a category to show ONLY that aisle's discounted products: "show only discounted
        vegetables" → category "vegetables", "dairy offers" → "dairy", "sabzi pe offer" → "vegetables".
        Never use search_products or navigate_category for discounted items. Only use this when the
        shopper says offer, deal, discount or sale; a price limit alone is a search, not an offer.

        Args:
            category: The aisle (category id from your instructions) to filter to, or leave it out for all offers.
        """
        if self._last_shopper_text and not OFFER_WORDS.search(self._last_shopper_text):
            return NOT_AN_OFFER_REQUEST
        self._aisle_tour = []  # the shopper went to the offers: stop any one-by-one aisle tour
        try:
            result = await call_browser("ui.openOffers", {"category": category} if category else {})
            if not isinstance(result, dict) or not result.get("ok"):
                return result
            result.pop("products", None)  # only for the on-screen glow; the model reads "deals"
            result["say"] = (
                "Say the offers are on screen, how many discounted products there are, and name at most "
                "two deals by product and discount (for example \"twenty percent off Maaza\"), without prices "
                "unless they ask. Keep it to two short sentences. Mention the free-delivery rule only if they "
                "asked about delivery. Do not add anything to the cart."
            )
            return self._in_reply_language(result)
        except BrowserRpcError:
            return "Opening the offers failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def get_screen(self, context: RunContext) -> dict | str:
        """Gets what the shopper sees on their screen right now: the page and the products listed
        there, in on-screen order (position 1 is the first product), with numeric prices.

        Call this FIRST whenever the shopper refers to a product without naming it, for example
        "the cheapest one", "the most expensive one", "the second one", "this one", "add that",
        especially after they browsed, filtered or sorted by tapping. Never ask them which product
        before calling this. The result includes cheapestInStock and mostExpensiveInStock (with
        every product sharing that price, so you can see ties).
        """
        try:
            result = await call_browser("ui.getScreen")
        except BrowserRpcError:
            return "The screen could not be read right now. Ask the shopper which product they mean."
        if isinstance(result, dict) and result.get("ok"):
            result.update(price_extremes(result.get("products") or []))
        return self._in_reply_language(result)

    @function_tool
    async def highlight_products(
        self,
        context: RunContext,
        product_ids: list[str],
        reason: Literal["spotlight", "options"] = "spotlight",
    ) -> dict | str:
        """Highlights products on the shopper's screen so they can see what you are talking about.
        Use "spotlight" for the one product you are naming ("the cheapest one is Vim 250 ml"),
        and "options" when you ask the shopper to choose between several products
        ("Surf Excel Matic 1 kg, Matic 2 kg or Easy Wash 1 kg?"). It never changes the cart.
        If the result lists products in notOnScreen, they are not visible right now; that is fine,
        just describe them in words.

        Args:
            product_ids: The productIds to highlight, e.g. ["p045"].
            reason: "spotlight" for one product you are naming, "options" for a choice.
        """
        try:
            return await call_browser("ui.highlight", {"productIds": product_ids, "reason": reason})
        except BrowserRpcError:
            return "Highlighting failed; just describe the products in words."

    # ★ ---------- checkout (never pays without an explicit "yes") ----------

    @function_tool
    async def start_checkout(self, context: RunContext) -> dict | str:
        """Starts checkout: checks the cart, opens the checkout page and returns the final total.
        This does NOT take payment. After calling it, tell the shopper the total and ask them
        clearly whether to pay now.
        """
        try:
            result = await call_browser("checkout.start")
        except BrowserRpcError:
            return "Checkout could not be started right now. Apologise briefly and ask the shopper to try again."

        if result.get("ok"):
            self._pending_checkout_total = result["total"]
        return result

    @function_tool
    async def confirm_payment(self, context: RunContext) -> dict | str:
        """Opens the payment window for the order. Call this ONLY right after start_checkout, and only
        when the shopper has clearly said yes to the total you read out (for example "yes", "pay now",
        "confirm", "हाँ", "कर दो"). The shopper then pays on screen; you are told the result later.
        """
        if self._pending_checkout_total is None:
            return (
                "No checkout is waiting for confirmation, so nothing was paid. "
                "Call start_checkout first, read out the total and ask the shopper to confirm."
            )

        self._pending_checkout_total = None  # one "yes" allows exactly one payment attempt
        try:
            return await call_browser("checkout.confirm")
        except BrowserRpcError:
            return "The payment could not be completed. Nothing was charged. Apologise and ask the shopper to try again."

    @function_tool
    async def cancel_pending_action(self, context: RunContext) -> str:
        """Cancels a checkout that is waiting for confirmation. Call this when the shopper says no,
        cancel, wait, not now, or never mind (also "नहीं", "रुको", "रहने दो").
        """
        self._pending_checkout_total = None
        return "Checkout cancelled. Nothing was paid. Tell the shopper briefly and ask what else they need."

    # ★ ---------- end checkout ----------

    # ---------- shopping list (scanned from a photo; nothing is in the cart until confirmed) ----------

    @function_tool
    async def get_shopping_list(self, context: RunContext) -> dict | str:
        """Gets the shopping list the shopper scanned from a photo, line by line: what was written,
        the status ("found" = product and packs ready, "choose" = pick one of the options,
        "unavailable" = out of stock, "not-found" = not sold in this store), and the lineId of each line.
        Nothing on this list is in the cart until confirm_shopping_list is called.
        """
        try:
            return await call_browser("list.get")
        except BrowserRpcError:
            return "The list could not be read right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def remove_list_item(self, context: RunContext, line_id: str) -> dict | str:
        """Removes one line from the scanned shopping list (not from the cart).

        Args:
            line_id: The lineId from get_shopping_list.
        """
        try:
            return await call_browser("list.remove", {"lineId": line_id})
        except BrowserRpcError:
            return "Changing the list failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def add_list_item(
        self, context: RunContext, name: str, quantity: float | None = None, unit: str | None = None
    ) -> dict | str:
        """Adds an item to the scanned shopping list (not to the cart yet). It is matched to a product
        the same way as scanned items.

        Args:
            name: One product in simple English, e.g. "bread", "milk". Translate Hindi first.
            quantity: The amount, only if the shopper said one, e.g. 2 for "two breads" or "2 kg".
            unit: The unit, only if said: "kg", "g", "l", "ml", "dozen", "pack".
        """
        try:
            return await call_browser("list.add", {"name": name, "quantity": quantity, "unit": unit})
        except BrowserRpcError:
            return "Changing the list failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def update_list_item(self, context: RunContext, line_id: str, packs: int) -> dict | str:
        """Changes how many packs of a "found" line will be added, e.g. "make the tomatoes three".

        Args:
            line_id: The lineId from get_shopping_list.
            packs: The new number of packs (a whole number, at least 1).
        """
        try:
            return await call_browser("list.update", {"lineId": line_id, "packs": packs})
        except BrowserRpcError:
            return "Changing the list failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def choose_list_item(self, context: RunContext, line_id: str, product_id: str) -> dict | str:
        """Picks which product to use for a "choose" line, e.g. "the 2 kg Surf Excel".
        Use the lineId and the option's productId from the shopping list. If you are not sure of the ids,
        call get_shopping_list first. If the result says it is not an option, call get_shopping_list and
        try again with the exact ids; never tell the shopper it is unavailable without checking.

        Args:
            line_id: The lineId from get_shopping_list.
            product_id: One of that line's options: its productId (preferred), or its exact product name.
        """
        try:
            return await call_browser("list.choose", {"lineId": line_id, "productId": product_id})
        except BrowserRpcError:
            return "Changing the list failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def confirm_shopping_list(self, context: RunContext) -> dict | str:
        """Adds every "found" line of the shopping list to the cart and empties the list.
        Call this ONLY after the shopper clearly agreed, e.g. "yes, add them", "हाँ, डाल दो".
        Lines that still need a choice, or are unavailable, are not added.
        """
        self._pending_checkout_total = None  # cart changes → any old checkout total is no longer valid
        try:
            return await call_browser("list.confirm")
        except BrowserRpcError:
            return "Adding the list to the cart failed right now. Apologise briefly and ask the shopper to try again."

    @function_tool
    async def end_call(self, context: RunContext, goodbye: str) -> ToolResult:
        """Says goodbye and ends the voice call.

        Call this when the shopper clearly says goodbye or that they are done, in any language.
        Do not call it if they only pause, say "wait", or their intent is unclear.

        Args:
            goodbye: A short, warm goodbye in the shopper's current language (English, Hindi or
                Hinglish), for example "Thanks for shopping with us, bye!" or
                "हमारे साथ shopping करने के लिए धन्यवाद, फिर मिलेंगे!"
        """
        context.disallow_interruptions()
        await context.wait_for_playout()  # finish anything said before this tool was called

        farewell = context.session.say(goodbye, allow_interruptions=False)
        # Hang up only after the goodbye has been fully spoken.
        farewell.add_done_callback(lambda _: asyncio.ensure_future(get_job_context().delete_room()))

        # reply_required=False: the goodbye above IS the reply, so the LLM must not add another one.
        return ToolResult("Saying goodbye and ending the call.", reply_required=False)


server = AgentServer(
    # Keep one agent process started and waiting, so a call doesn't wait for a cold start.
    num_idle_processes=1,
    # Starting a process on Windows can take over 10 s (the default limit); don't fail the call for it.
    initialize_process_timeout=30.0,
)


# Must match the name the token endpoint dispatches (app/config.py → CARTIVA_AGENT_NAME). The cloud uses the
# default; a local .env sets "cartiva-agent-dev" so laptop calls never reach the cloud agent, and vice versa.
@server.rtc_session(agent_name=os.getenv("CARTIVA_AGENT_NAME", "cartiva-agent"))
async def entrypoint(ctx: JobContext) -> None:
    """Runs once for every voice session (room) LiveKit gives us."""
    # Which storefront this call is for: the token endpoint wrote {"brand": ...} into the job metadata.
    profile = profile_for_job(ctx.job.metadata)
    logger.info("starting voice session in room %s for brand %s", ctx.room.name, profile.id)

    session = AgentSession(
        # "multi" = automatic language detection, including Hindi and English mixed in one sentence
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model=LLM_MODEL),
        # Cartesia Sonic 3 speaks Hindi, English and Hinglish. Voice: an Indian-accent female voice.
        # Starts in English; switched to Hindi only when the shopper speaks Hindi or Hinglish.
        tts=inference.TTS(
            model=TTS_MODEL, voice=profile.tts_voice, language=VOICE_LANGUAGE["english"], extra_kwargs={"speed": TTS_SPEED}
        ),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
            # Learn each shopper's pause length, so "Show me Amul … butter" isn't cut after "Amul".
            # Never wait more than 2 s after the shopper stops (the default waits longer, which felt laggy).
            endpointing={"mode": "dynamic", "max_delay": 2.0},
            # Tell real interruptions ("wait, show me fruits") from backchannels ("mm-hmm", "haan").
            interruption={"mode": "adaptive"},
        ),
        user_away_timeout=AWAY_AFTER_SECONDS,  # user counts as "away" after this much silence
        max_tool_steps=MAX_TOOL_STEPS,
        # Start preparing the reply while the shopper is still finishing their sentence: faster answers.
        preemptive_generation=True,
        stt_context_options={"keyterms": profile.stt_keyterms},  # bias Deepgram toward our words
    )

    # Timings of every step (end of turn, speech-to-text, LLM first token, first audio), to find lag.
    @session.on("metrics_collected")
    def on_metrics(ev: MetricsCollectedEvent) -> None:
        metrics.log_metrics(ev.metrics)

    # ---------- debug: what the agent hears and does ----------
    @session.on("user_input_transcribed")
    def on_transcribed(ev: UserInputTranscribedEvent) -> None:
        # Only the final transcript: logging every live guess (several per second) to the Windows
        # console slowed the agent's loop, which is also what sends Cartiva's voice.
        if ev.is_final:
            logger.info("HEARD [%s] %r", ev.language, ev.transcript)

    @session.on("conversation_item_added")
    def on_item_added(ev: ConversationItemAddedEvent) -> None:
        # the exact text the LLM receives as one turn (user) or speaks (assistant)
        if ev.item.type == "message":  # skip non-message items, e.g. the AgentHandoff added at start
            logger.info("TURN %s: %r", ev.item.role, ev.item.text_content)

    @session.on("function_tools_executed")
    def on_tools(ev: FunctionToolsExecutedEvent) -> None:
        # what the LLM decided to do with that text, e.g. search_products {"query": "potato"}
        for call in ev.function_calls:
            logger.info("TOOL %s %s", call.name, call.arguments)

    @session.on("user_transcription_timeout")
    def on_no_transcript(ev: UserTranscriptionTimeoutEvent) -> None:
        # the mic heard speech, but Deepgram returned no words at all
        logger.warning("HEARD NOTHING: %.1fs of speech produced no transcript", ev.speech_duration)
    # ---------- end debug ----------

    # ---------- auto hang-up (silence / time limit) ----------
    background_tasks: set[asyncio.Task] = set()
    user_state = {"current": "listening"}
    payment = {"in_progress": False}  # True while the Razorpay window is open

    def run_in_background(coro) -> None:
        """Starts a coroutine without blocking, and keeps a reference so it isn't lost."""
        task = asyncio.create_task(coro)
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)

    async def finish_current_speech() -> None:
        """Waits until Cartiva finishes the sentence it is saying (never cut it off mid-word)."""
        speech = session.current_speech
        if speech is not None:
            await speech.wait_for_playout()

    async def hang_up(goodbye: str) -> None:
        """Lets Cartiva finish speaking, says goodbye, then deletes the room (disconnects the browser too)."""
        logger.info("hanging up room %s", ctx.room.name)
        await finish_current_speech()
        await session.say(goodbye, allow_interruptions=False)
        await ctx.delete_room()

    async def check_if_still_there() -> None:
        if payment["in_progress"]:  # they're typing card details in Razorpay, not gone
            return
        await session.generate_reply(instructions="The shopper has been silent. Briefly ask if they are still there.")
        await asyncio.sleep(GRACE_SECONDS)
        if user_state["current"] == "away" and not payment["in_progress"]:
            await hang_up("I'll close the voice assistant now. Tap the mic anytime to talk again.")

    async def enforce_time_limit() -> None:
        await asyncio.sleep(max(MAX_SESSION_SECONDS - TIME_WARNING_SECONDS, 0))
        await finish_current_speech()
        session.generate_reply(
            instructions="In one short sentence, mention that this voice session ends in about 30 seconds."
        )
        await asyncio.sleep(TIME_WARNING_SECONDS)
        minutes = round(MAX_SESSION_SECONDS / 60)
        await hang_up(
            f"We've reached the {minutes} minute limit for this session. Tap the mic anytime to continue, "
            "your cart and list are saved."
        )

    @session.on("user_state_changed")
    def on_user_state_changed(ev: UserStateChangedEvent) -> None:
        user_state["current"] = ev.new_state
        if ev.new_state == "away":
            run_in_background(check_if_still_there())

    async def cancel_background_tasks() -> None:
        for task in list(background_tasks):
            task.cancel()

    ctx.add_shutdown_callback(cancel_background_tasks)
    # ---------- end auto hang-up ----------

    # Set when the browser says a shopping list is being (or was just) scanned.
    list_coming = asyncio.Event()

    # The greeting's saved take (same tone and pace every call); loaded while the call connects.
    greeting_audio = asyncio.create_task(load_greeting(session.tts, profile.greeting, profile.tts_voice, TTS_MODEL, TTS_SPEED))

    # Open the voice and model connections now, so the first sentence ("Hi, I'm Cartiva")
    # doesn't stutter while they connect.
    for model in (session.tts, session.llm):
        if model is not None:
            model.prewarm()

    await session.start(agent=CartivaAssistant(profile), room=ctx.room)
    # Don't listen until Cartiva has introduced itself (the greeting or the list readout turns it on).
    session.input.set_audio_enabled(False)
    await ctx.connect()

    # Browser → agent: the payment finished (it can take a minute, so we're told instead of waiting).
    # Browser → agent: the shopper opened the payment window (by voice or by tapping Pay).
    @ctx.room.local_participant.register_rpc_method("payment.started")
    async def on_payment_started(data: rtc.RpcInvocationData) -> str:
        payment["in_progress"] = True  # don't treat card-typing silence as "away"
        return "ok"

    @ctx.room.local_participant.register_rpc_method("payment.result")
    async def on_payment_result(data: rtc.RpcInvocationData) -> str:
        payment["in_progress"] = False
        result = json.loads(data.payload)
        if result.get("ok"):
            total = result.get("total")
            instructions = (
                "The payment was successful and the order is placed"
                + (f" (total paid: {total})" if total else "")
                + ". Say exactly that in one or two short sentences, in the shopper's language: the payment "
                "was successful, the order is placed, and thank them. Do not read out the order reference."
            )
        else:
            instructions = (
                f"The payment did not go through ({result.get('reason')}). Nothing was charged and the cart "
                "is saved. Tell the shopper briefly, in their language, and offer to try again."
            )
        # Announced in full: the shopper may be clicking around the success page meanwhile.
        session.generate_reply(instructions=instructions, allow_interruptions=False)
        return "ok"

    # ---------- shopping list review: Cartiva talks, and doesn't listen until it has finished ----------
    list_review = {"pending": False}  # True from upload until the readout has been spoken
    introduced = {"done": False}  # Cartiva has said "Hi, I'm Cartiva" in this call (never twice)

    def stop_listening() -> None:
        session.input.set_audio_enabled(False)

    def start_listening() -> None:
        session.input.set_audio_enabled(True)

    async def speak_uninterrupted(instructions: str) -> None:
        handle = session.generate_reply(instructions=instructions, allow_interruptions=False)
        await handle.wait_for_playout()

    async def say_reading_list() -> None:
        # Mid-call (already introduced) there's no second hello: the readout follows straight away.
        if not introduced["done"]:
            introduced["done"] = True
            await speak_uninterrupted(
                f"In English, in one short sentence, say hello, that you are {profile.assistant_name}, and that you are reading "
                "their shopping list now. Do not call any tools."
            )
        if not list_review["pending"]:  # the readout already finished meanwhile
            start_listening()

    async def remember_list(shopping_list: dict) -> None:
        """Puts the list (with lineIds and productIds) into the conversation, so that when the shopper
        answers a question ("the 2 kg one") the model can call choose_list_item with the right ids."""
        agent = session.current_agent
        chat_ctx = agent.chat_ctx.copy()
        chat_ctx.add_message(
            role="system",
            content=(
                "Current shopping list (from get_shopping_list). Use these lineIds and productIds for "
                f"choose_list_item, update_list_item and remove_list_item: {json.dumps(shopping_list, ensure_ascii=False)}"
            ),
        )
        await agent.update_chat_ctx(chat_ctx)

    async def read_list_aloud() -> None:
        try:
            shopping_list = await call_browser("list.get")
        except BrowserRpcError:
            shopping_list = None
        if shopping_list and shopping_list.get("ok"):
            await remember_list(shopping_list)
        try:
            if not shopping_list or not shopping_list.get("ok"):
                await speak_uninterrupted("Say briefly that you couldn't open their shopping list, and ask them to try again.")
                return
            await speak_uninterrupted(
                "The shopper's shopping list has just been read. Here it is as JSON: "
                f"{json.dumps(shopping_list, ensure_ascii=False)}. "
                "Speak in English. Do not greet or introduce yourself. Do not call any tools now. "
                "First read the ready items with their amounts. Then, if any items "
                "need a choice, ask about the FIRST one only (name its options with sizes) and stop to wait for "
                "the answer; the other choices and the unavailable items come after the shopper answers. If "
                "nothing needs a choice, say which items are not available (out of stock, or not sold here) "
                "and ask whether to add everything to the cart."
            )
        finally:
            list_review["pending"] = False
            start_listening()

    # Browser → agent: the shopper is uploading a shopping list photo (reading it takes a few seconds).
    @ctx.room.local_participant.register_rpc_method("list.scanning")
    async def on_list_scanning(data: rtc.RpcInvocationData) -> str:
        list_coming.set()  # skip the generic greeting
        list_review["pending"] = True
        stop_listening()  # from now until the list has been read out
        run_in_background(say_reading_list())
        return "ok"

    # Browser → agent: the shopping list photo has been read; read it out, uninterrupted.
    @ctx.room.local_participant.register_rpc_method("list.scanned")
    async def on_list_scanned(data: rtc.RpcInvocationData) -> str:
        list_coming.set()
        list_review["pending"] = True
        stop_listening()
        run_in_background(read_list_aloud())
        return "ok"

    # Browser → agent: the photo could not be read.
    @ctx.room.local_participant.register_rpc_method("list.failed")
    async def on_list_failed(data: rtc.RpcInvocationData) -> str:
        reason = json.loads(data.payload or "{}").get("message", "")

        async def explain() -> None:
            try:
                await speak_uninterrupted(
                    f"The shopping list photo could not be read ({reason}). Say so briefly and suggest a clearer "
                    "photo, or that they can tell you the items instead."
                )
            finally:
                list_review["pending"] = False
                start_listening()

        run_in_background(explain())
        return "ok"
    # ---------- end shopping list review ----------

    run_in_background(enforce_time_limit())  # start the 2-minute clock

    # If the shopper started the call by uploading a list, the list handlers greet instead.
    # The browser tells us within a moment of connecting, so wait briefly before the generic greeting.
    try:
        await asyncio.wait_for(list_coming.wait(), timeout=LIST_SIGNAL_WAIT_SECONDS)
    except asyncio.TimeoutError:
        # A fixed greeting: no model round-trip, so it starts straight away and plays smoothly.
        # It can't be interrupted, and Cartiva starts listening only once it has finished.
        try:
            introduced["done"] = True
            try:
                # Recording the very first take can take ~10 s; don't keep that shopper waiting.
                # shield(): the recording carries on in the background, ready for the next call.
                audio = await asyncio.wait_for(asyncio.shield(greeting_audio), GREETING_TAKE_WAIT_SECONDS)
            except asyncio.TimeoutError:
                audio = None
            if audio is not None:  # the saved take: identical every call
                greeting = session.say(profile.greeting, audio=play_frames(audio), allow_interruptions=False)
            else:  # no take (first recording failed): speak it live
                greeting = session.say(profile.greeting, allow_interruptions=False)
            await greeting.wait_for_playout()
        finally:
            session.input.set_audio_enabled(True)  # always listen afterwards, even if the greeting failed


if __name__ == "__main__":
    cli.run_app(server)
