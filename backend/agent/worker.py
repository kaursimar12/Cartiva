import asyncio
import logging
from typing import Literal

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    ToolResult,
    TurnHandlingOptions,
    UserStateChangedEvent,
    cli,
    function_tool,
    get_job_context,
    inference,
)

from agent.rpc import BrowserRpcError, call_browser

logger = logging.getLogger("cartiva-agent")

# Puts LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET from backend/.env into the environment.
load_dotenv()

# Session limits (protect the free monthly credit)
MAX_SESSION_SECONDS = 2 * 60   # hard limit for one voice session
AWAY_AFTER_SECONDS = 30        # silence before "are you still there?"
GRACE_SECONDS = 15             # extra silence before hanging up

# Cartesia voice ID (Indian-accent). Browse others at https://play.cartesia.ai and paste the ID here.
TTS_VOICE = "3b554273-4299-48b9-9aaf-eefd438e3941"

INSTRUCTIONS = """
You are Cartiva, a friendly voice assistant for an Indian online grocery store.
You help people find groceries, manage their cart and check out.

# MOST IMPORTANT RULE: answer in the shopper's language
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
shopper's screen. After a search, say how many products you found and mention at most three,
with their prices, then ask which one they want. If nothing is found, say so and suggest
another word. Remember the productIds from the results for later, but never read IDs aloud.
You can add products with the add_to_cart tool, using a productId from search_products.
If the shopper names a product you have not searched for yet, search first, then add it.
If more than one product could match (for example two brands or two pack sizes), ask which
one before adding. After adding, confirm briefly what was added.
If the tool says a product is out of stock or only some units are available, explain that and
offer the available amount.
You can read the shopper's cart with the get_cart tool. Use it whenever they ask about their
cart or total, and answer only from what the tool returns.
Say amounts in words, for example "two hundred forty-five rupees".
Tool messages are in English; always say them in the shopper's language.
You can remove items with remove_from_cart and change quantities with update_cart. For these,
call get_cart first to find the right productId and the current quantity. If more than one cart
item could match what the shopper said, ask which one. Confirm briefly after each change.
You can open pages on the shopper's screen: navigate_category for a category ("go to fruits")
and open_product for one product ("show me that one"). After opening, say briefly what is on
screen, for example how many products the category has and one or two examples.
Never invent products, brands, varieties, prices or options; only use what the tools return.

# Checkout and payment
When the shopper wants to check out or pay, call start_checkout. Then read out the total and
ask clearly whether to pay now. Only call confirm_payment if their answer is a clear yes.
If they say no, wait, or change their mind, call cancel_pending_action. If the cart changes,
checkout must be started again. Never say a payment succeeded unless confirm_payment says so.

# Ending the call
When the shopper says goodbye or that they are done (for example "bye", "that's all",
"thank you, I'm done", "बस", "धन्यवाद, हो गया"), call the end_call tool and pass a short
goodbye in their language. Do not say the goodbye yourself; the tool speaks it.
Do not end the call if they only pause or say "wait" or "रुको".

# Voice rules
- Speak in plain sentences. No lists, markdown, emojis or symbols.
- Keep replies short: one or two sentences. Ask one question at a time.
- Say prices in rupees, in words, in the shopper's language, for example "forty rupees"
  or "चालीस रुपये".
- The very first greeting is in English with "Hi" or "Hello", never "Namaste". After that,
  follow the shopper's language.
"""


class CartivaAssistant(Agent):
    """The agent's personality and its shopping tools."""

    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)
        # ★ Set by start_checkout; required by confirm_payment; cleared by cancel or any cart change.
        self._pending_checkout_total: str | None = None

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
    ) -> dict | str:
        """Searches the Cartiva catalog and shows the results on the shopper's screen.

        Call this whenever the shopper wants to find, see or browse products, or before adding
        something to the cart (you need the productId from the results).

        Args:
            query: What to look for, always in English, e.g. "tomato", "vegetables",
                "dishwashing liquid", "Surf Excel". Translate Hindi words first,
                e.g. "टमाटर" → "tomato", "दूध" → "milk", "सब्ज़ियाँ" → "vegetables".
            max_price: Highest price in rupees, only if the shopper gives one,
                e.g. 200 for "under 200 rupees".
            min_price: Lowest price in rupees, only if the shopper gives one.
        """
        payload = {"query": query, "maxPrice": max_price, "minPrice": min_price}
        try:
            return await call_browser("catalog.search", payload)
        except BrowserRpcError:
            return "The search failed right now. Apologise briefly and ask the shopper to try again."

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
        "डेयरी दिखाओ". Returns the products now visible on that page.

        Args:
            category: The category to open.
        """
        try:
            return await call_browser("ui.openCategory", {"category": category})
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
        """Pays for the order. Call this ONLY right after start_checkout, and only when the shopper
        has clearly said yes to the total you read out (for example "yes", "pay now", "confirm",
        "हाँ", "कर दो").
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


server = AgentServer()


@server.rtc_session(agent_name="cartiva-agent")
async def entrypoint(ctx: JobContext) -> None:
    """Runs once for every voice session (room) LiveKit gives us."""
    logger.info("starting voice session in room %s", ctx.room.name)

    session = AgentSession(
        # "multi" = automatic language detection, including Hindi and English mixed in one sentence
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="google/gemma-4-31b-it"),
        # Cartesia Sonic 3 speaks Hindi, English and Hinglish. Voice: an Indian-accent female voice.
        tts=inference.TTS(model="cartesia/sonic-3", voice=TTS_VOICE, language="hi"),
        turn_handling=TurnHandlingOptions(turn_detection=inference.TurnDetector()),
        user_away_timeout=AWAY_AFTER_SECONDS,  # user counts as "away" after this much silence
    )

    # ---------- auto hang-up (silence / time limit) ----------
    background_tasks: set[asyncio.Task] = set()
    user_state = {"current": "listening"}

    def run_in_background(coro) -> None:
        """Starts a coroutine without blocking, and keeps a reference so it isn't lost."""
        task = asyncio.create_task(coro)
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)

    async def hang_up(goodbye: str) -> None:
        """Says goodbye, then deletes the room, which disconnects the browser too."""
        logger.info("hanging up room %s", ctx.room.name)
        await session.say(goodbye)
        await ctx.delete_room()

    async def check_if_still_there() -> None:
        await session.generate_reply(instructions="The shopper has been silent. Briefly ask if they are still there.")
        await asyncio.sleep(GRACE_SECONDS)
        if user_state["current"] == "away":
            await hang_up("I'll close the voice assistant now. Tap the mic anytime to talk again.")

    async def enforce_time_limit() -> None:
        await asyncio.sleep(MAX_SESSION_SECONDS)
        await hang_up("We've reached the two minute limit for this session. Tap the mic anytime to continue.")

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

    await session.start(agent=CartivaAssistant(), room=ctx.room)
    await ctx.connect()

    run_in_background(enforce_time_limit())  # start the 2-minute clock

    await session.generate_reply(
        instructions='Greet the shopper in English with "Hi" or "Hello", say you are Cartiva, and ask what they need today.'
    )


if __name__ == "__main__":
    cli.run_app(server)
