import asyncio
import logging

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
You cannot remove items or change quantities by voice yet; for that, say it is coming soon.
Never invent products, brands, varieties, prices or options; only use what the tools return.


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
    """The agent's personality and tools. Search and cart tools come in Phase 7."""

    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)

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
        try:
            return await call_browser("cart.add", {"productId": product_id, "quantity": quantity})
        except BrowserRpcError:
            return "Adding to the cart failed right now. Apologise briefly and ask the shopper to try again."

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
