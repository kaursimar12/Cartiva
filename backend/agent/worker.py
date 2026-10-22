import asyncio
import json
import os
import logging
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

from agent.language import REPLY_RULES, VOICE_LANGUAGE, Language, detect_language, language_instructions
from agent.rpc import BrowserRpcError, call_browser
from app.catalog import get_catalog

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
GREETING = "Hi, I'm Cartiva! What would you like to buy today?"

# Tool-call rounds allowed in one reply. "Add tomatoes and potatoes" can take 4
# (search, add, search, add); LiveKit's default of 3 would silently drop the last one.
MAX_TOOL_STEPS = 8

# LLM, called through LiveKit Inference (billed to the LiveKit credit). The evals in
# tests/test_conversation.py import this, so the tests always check the model the app uses.
LLM_MODEL = "openai/gpt-4.1-mini"

# Cartesia voice ID (Indian-accent). Browse others at https://play.cartesia.ai and paste the ID here.
TTS_VOICE = "3b554273-4299-48b9-9aaf-eefd438e3941"

# Words Deepgram should expect, so accented speech maps to them ("cart", not "partner").
# Deepgram refuses the whole connection (error 2006, the agent hears nothing) when the list is too
# long: ~1,240 characters already failed. So the most useful words go first and we stop at a budget.
STT_KEYTERM_BUDGET = 1000  # total characters of all keyterms
STT_PRIORITY_KEYTERMS = [
    "cart", "checkout", "kg", "kilo", "litre", "dozen", "Cartiva", "okay", "bye",
    "tomatoes", "potatoes", "onions", "bananas", "apples", "eggs",  # plurals shoppers say
    "aloo", "tamatar", "pyaaz", "doodh",                           # Hindi names in Latin letters
    "scan", "shopping list",                                       # "I want to scan a list"
]


def build_stt_keyterms(budget: int = STT_KEYTERM_BUDGET) -> list[str]:
    """Priority words first, then catalog product names (shortest first, so more products fit)."""
    names = sorted({product.name for product in get_catalog().products.values()}, key=len)
    terms: list[str] = []
    used = 0
    for term in [*STT_PRIORITY_KEYTERMS, *names]:
        if used + len(term) > budget:
            break
        terms.append(term)
        used += len(term)
    return terms


STT_KEYTERMS = build_stt_keyterms()

INSTRUCTIONS = """
You are Cartiva, a friendly voice assistant for an Indian online grocery store.
You help people find groceries, manage their cart and check out.

# MOST IMPORTANT RULE: answer in the shopper's language (English by default)
Speak English unless the shopper speaks Hindi or Hinglish. The exact language for right now is given
at the end of these instructions under "Reply language right now"; always follow it.
Look at the language of the shopper's LAST message and reply in exactly that language:
- English → reply in English.
- Hindi → reply in Hindi.
- Hinglish (Hindi and English mixed) → reply in Hinglish.
Decide again for every message, so if they switch language, you switch too.
Write Hindi words in Devanagari and English words, brand and product names in English letters,
because this helps the voice pronounce both correctly.

Examples:
- Shopper: "What can you do?" → "I can help you shop for groceries. What do you need today?"
- Shopper: "आप क्या कर सकते हो?" → "मैं आपको groceries खरीदने में मदद कर सकती हूँ। आपको क्या चाहिए?"
- Shopper: "Mujhe tomatoes chahiye" → (search first) "मुझे tomatoes मिल गए, screen पर देखिए। Tomato एक kilo चालीस रुपये का है।"

# What you can do right now
You can search the catalog with the search_products tool. The results also appear on the
shopper's screen. After a search that is shown on screen, say only how many products you found
and ask which one they want, for example "I found four dishwashing liquids, they're on your
screen. Which one would you like?" Do not read out product names or prices unless the shopper
asks (for example "which is cheapest?" or "what are they?"). If nothing is found, say so and suggest
another word. Remember the productIds from the results for later, but never read IDs aloud.
You can add products with the add_to_cart tool, using a productId from search_products.
If the shopper names a product you have not searched for yet, search first with show_on_screen false
(so their current page stays, e.g. they are on Vegetables and say "add 2 kg onions"), then add it.
Pick the product yourself when the shopper's words point to one product: prefer the plain
product over variants (for "tomatoes" choose "Tomato", not "Tomato Cherry" or "Tomato Puree"),
and use the pack size they said (for "1 kg" choose the 1 kg pack). Ask which one only when it is
still unclear, for example two brands or two pack sizes of the same product and no size was
given. After adding, confirm briefly what was added.
Only say a product was added, removed or changed after the tool for it returned ok in this turn.
If you did not call the tool, or it returned an error, never say it was done: ask or explain instead.
When several products match what they asked to add (for example "dishwash" matches Vim, Pril and
Exo in several sizes), ask which one first; do not add any of them yet.
If the tool says a product is out of stock or only some units are available, explain that and
offer the available amount.
You can read the shopper's cart with the get_cart tool. Use it whenever they ask about their
cart or total, and answer only from what the tool returns.
Say amounts in words, for example "two hundred forty-five rupees".
Tool messages are in English; always say them in the shopper's language.
You can remove items with remove_from_cart and change quantities with update_cart. For these,
call get_cart first to find the right productId and the current quantity. If more than one cart
item could match what the shopper said, ask which one. Confirm briefly after each change.
You can open pages on the shopper's screen: navigate_category for a category ("go to fruits"),
open_product for one product ("show me that one"), and open_page for the cart, home or scan list
pages ("take me to the cart"). After opening a category, say only that it is open and how many
products are on screen, then ask what they would like, for example "Here are the vegetables,
eleven products on screen. What would you like?" Do not name the products; the screen shows them.
Name products only if the shopper asks what is there.
The shopper can also browse, filter and sort by tapping. When they refer to something on screen
that you did not just show them ("the cheapest one", "the second one", "this one", "add that"),
call get_screen first and pick the product from it. Position 1 is the first product on screen.
Use priceRupees to compare prices. If the screen has no products, ask what they mean.
If two or more products have the same price for what the shopper asked (for example several
are the cheapest, or several are the most expensive), never pick one yourself. Say their names,
tell the shopper they cost the same, and ask which one to add.
For example: "Banana and Guava both cost forty rupees. Which one should I add?"
Only add after the shopper chooses.
Point at products on screen with highlight_products whenever you name one specific product
("the cheapest is Vim") or ask the shopper to choose between several (reason "options"),
so they can see what you mean. Call it before you speak about them. It changes nothing in the cart.
Never invent products, brands, varieties, prices or options; only use what the tools return.

# Checkout and payment
When the shopper wants to check out or pay, call start_checkout. Then read out the total and
ask clearly whether to pay now. Only call confirm_payment if their answer is a clear yes.
If they say no, wait, or change their mind, call cancel_pending_action. If the cart changes,
checkout must be started again. After confirm_payment, tell the shopper to complete the payment
in the window on screen. You will then receive the result; never say a payment succeeded before that.
If it failed and the shopper wants to try again, call start_checkout again.

# Shopping lists (scanned from a photo)
When the shopper wants to scan, upload or photograph a shopping list, or says they have a list
("I want to scan a list", "I have a list", "scan karna hai"), call open_page with page "scan-list"
right away, then tell them to tap the upload box and choose a photo of their list. Do not search
for products called "list" or "scan".
When you are told a list was scanned, or the shopper asks about their list, call get_shopping_list.
Go through it in this order:
1. The ready items, briefly, with their amounts said naturally ("two kilos of tomatoes, a pack of Amul butter").
   If one has fewer packs than asked because of stock, say how many you could add.
2. The items that need a choice, ONE AT A TIME: name the options with their sizes, ask which one, and wait
   for the answer. Call choose_list_item with the choice before asking about the next item.
   Its result lists stillToChoose and says what to do next: ask about every item in stillToChoose, in
   that order, before moving on. The item you are asking about is highlighted on the shopper's screen
   with its options, so they can also tap one.
3. When no choices are left: the items that are not available (which are out of stock, which are not sold here).
4. Then ask whether to add everything to the cart.
The shopper can remove items (remove_list_item), add items (add_list_item), change amounts
(update_list_item) or pick an option (choose_list_item). Use the lineId from get_shopping_list and never
read lineIds aloud. Only say an option was chosen, an item removed or the list added to the cart after
that tool returned ok. If it returned an error, nothing changed: retry with the exact ids it gives, or
ask the shopper (for example which size of Vim they want). Nothing is in the cart until confirm_shopping_list; call it only after the shopper
clearly agrees. Afterwards, say how many items were added and which ones were not available.

# Ending the call
When the shopper says goodbye or that they are done (for example "bye", "that's all",
"thank you, I'm done", "बस", "धन्यवाद, हो गया"), call the end_call tool and pass a short
goodbye in their language. Do not say the goodbye yourself; the tool speaks it.
Do not end the call if they only pause or say "wait" or "रुको".

# Voice rules
- Speak in plain sentences. No lists, markdown, emojis or symbols.
- Keep replies short: one or two sentences. Ask one question at a time.
- If you did not understand the shopper or the request is unclear, ask one short question to
  clarify. Never guess an action, and never add, remove or pay for anything you are unsure about.
- The shopper's words come from speech recognition and can be misheard, especially with an
  Indian accent: a product can turn into a similar-sounding word ("tools" for "tomatoes",
  "partner" for "cart"). If a word makes no sense for grocery shopping, it is probably a
  mishearing of a product or a cart word. Never answer the literal word; ask one short
  question with your best guess, for example "Did you mean tomatoes?", and act only after
  the shopper confirms.
- Say prices in rupees, in words, in the shopper's language, for example "forty rupees"
  or "चालीस रुपये".
- The very first greeting is in English with "Hi" or "Hello", never "Namaste". After that,
  follow the shopper's language.
- Reading a just-scanned shopping list (and the "reading your list" sentence before it) is always in
  English. From the shopper's next reply on, follow their language as usual.
"""


class CartivaAssistant(Agent):
    """The agent's personality and its shopping tools."""

    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS + language_instructions("english"))
        self._language: Language = "english"  # English until the shopper speaks Hindi or Hinglish
        # ★ Set by start_checkout; required by confirm_payment; cleared by cancel or any cart change.
        self._pending_checkout_total: str | None = None

    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        """Before every reply: set the reply language from what the shopper actually said this turn.
        It goes into the agent's standing instructions (so the sentence after a tool call keeps it too)
        and into the voice (so an English reply reads "2 kg" as "two kg", not "do kilo")."""
        language = detect_language(new_message.text_content or "")
        logger.info("reply language: %s", language)
        if language != self._language:
            self._language = language
            await self.update_instructions(INSTRUCTIONS + language_instructions(language))
            self.session.tts.update_options(language=VOICE_LANGUAGE[language])
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
        """Searches the Cartiva catalog. Results open on the shopper's screen unless show_on_screen is false.

        Call this whenever the shopper wants to find, see or browse products, or before adding
        something to the cart (you need the productId from the results).
        When you only need a productId to add, remove or change a product ("add 2 kg onions"),
        set show_on_screen to false: the shopper stays on the page they are looking at.

        Search for ONE product at a time. If the shopper asks for several products
        ("tomatoes and potatoes"), call this once per product: query "tomato", then query "potato".

        Args:
            query: One product to look for, always in English, e.g. "tomato", "vegetables",
                "dishwashing liquid", "Surf Excel". Never combine products ("tomato potato").
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
        return result

    @function_tool
    async def add_to_cart(self, context: RunContext, product_id: str, quantity: int = 1) -> dict | str:
        """Adds a product to the shopper's cart. The cart on screen updates too.

        Only use a product_id that came from search_products results in this conversation.
        If you don't have one yet, call search_products first. If several products could match
        and it is not clear which one the shopper means, ask them before adding.

        Args:
            product_id: The productId from search_products, e.g. "p001".
            quantity: How many packs to add (a whole number, at least 1). Products are sold in
                packs shown as "unit", e.g. "1 kg". "2 kg tomatoes" with a "1 kg" pack means
                quantity 2. If the shopper gives no amount, use 1.
        """
        self._pending_checkout_total = None  # ★ cart changed → any old total is no longer valid
        try:
            return await call_browser("cart.add", {"productId": product_id, "quantity": quantity})
        except BrowserRpcError:
            return "Adding to the cart failed right now. Apologise briefly and ask the shopper to try again."

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
        category: Literal[
            "vegetables", "fruits", "dairy", "beverages", "snacks",
            "breakfast", "cleaning", "laundry", "personal-care",
        ],
    ) -> dict | str:
        """Opens a category page on the shopper's screen, e.g. "go to fruits", "show me dairy",
        "डेयरी दिखाओ". Returns the category name and how many products are on screen.

        Args:
            category: The category to open.
        """
        try:
            result = await call_browser("ui.openCategory", {"category": category})
            if not isinstance(result, dict) or not result.get("ok"):
                return result
            # Only the count reaches the model, so it can't start reading the products out.
            # If the shopper asks what's there, or says "the cheapest one", it calls get_screen.
            return {
                "ok": True,
                "category": result.get("category"),
                "productCount": result.get("count"),
                "say": "Say only that the category is open and how many products are on screen, then ask "
                "what they would like. Do not name products. If they ask what is there, call get_screen.",
            }
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
        "go to the home page". To pay, use start_checkout instead.

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
    async def get_screen(self, context: RunContext) -> dict | str:
        """Gets what the shopper sees on their screen right now: the page and the products listed
        there, in on-screen order (position 1 is the first product), with numeric prices.

        Call this when the shopper refers to something on screen that you did not just show them,
        for example "the cheapest one", "the second one", "this one", "add that", especially after
        they browsed, filtered or sorted by tapping.
        """
        try:
            return await call_browser("ui.getScreen")
        except BrowserRpcError:
            return "The screen could not be read right now. Ask the shopper which product they mean."

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
        "unavailable" = out of stock, "not-found" = not sold at Cartiva), and the lineId of each line.
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
                Hinglish), for example "Thanks for shopping with Cartiva, bye!" or
                "Cartiva के साथ shopping करने के लिए धन्यवाद, फिर मिलेंगे!"
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


@server.rtc_session(agent_name="cartiva-agent")
async def entrypoint(ctx: JobContext) -> None:
    """Runs once for every voice session (room) LiveKit gives us."""
    logger.info("starting voice session in room %s", ctx.room.name)

    session = AgentSession(
        # "multi" = automatic language detection, including Hindi and English mixed in one sentence
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model=LLM_MODEL),
        # Cartesia Sonic 3 speaks Hindi, English and Hinglish. Voice: an Indian-accent female voice.
        # Starts in English; switched to Hindi only when the shopper speaks Hindi or Hinglish.
        tts=inference.TTS(model="cartesia/sonic-3", voice=TTS_VOICE, language=VOICE_LANGUAGE["english"]),
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
        stt_context_options={"keyterms": STT_KEYTERMS},  # bias Deepgram toward our words
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

    # Open the voice and model connections now, so the first sentence ("Hi, I'm Cartiva")
    # doesn't stutter while they connect.
    for model in (session.tts, session.llm):
        if model is not None:
            model.prewarm()

    await session.start(agent=CartivaAssistant(), room=ctx.room)
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
                "In English, in one short sentence, say hello, that you are Cartiva, and that you are reading "
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
            greeting = session.say(GREETING, allow_interruptions=False)
            await greeting.wait_for_playout()
        finally:
            session.input.set_audio_enabled(True)  # always listen afterwards, even if the greeting failed


if __name__ == "__main__":
    cli.run_app(server)
