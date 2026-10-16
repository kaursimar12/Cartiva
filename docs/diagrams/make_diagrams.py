"""Generates the Cartiva flowchart SVGs into docs/diagrams/. Run: python make_diagrams.py <out_dir>"""
import sys
from html import escape
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

FONT = "Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif"
MONO = "Consolas, ui-monospace, Menlo, monospace"

# lane: (fill, stroke, label)
LANES = {
    "user": ("#eef2ff", "#4f46e5", "Shopper"),
    "frontend": ("#ecfdf5", "#059669", "Frontend (Next.js)"),
    "backend": ("#fff7ed", "#ea580c", "Backend (FastAPI)"),
    "agent": ("#fdf4ff", "#c026d3", "Voice agent (Python)"),
    "livekit": ("#eff6ff", "#2563eb", "LiveKit Cloud"),
    "rpc": ("#ecfeff", "#0891b2", "RPC bridge (through the room)"),
    "ok": ("#f0fdf4", "#16a34a", "Success"),
    "error": ("#fef2f2", "#dc2626", "Error / alternative"),
}

W = 1040
MAIN_X, MAIN_W = 40, 580
SIDE_X, SIDE_W = 690, 320
GAP = 40
TOP = 96


def node_height(n):
    lines = 1 + len(n.get("sub", [])) + (1 if n.get("file") else 0)
    return 20 + lines * 20


def box(x, y, w, n):
    fill, stroke, _ = LANES[n["lane"]]
    h = node_height(n)
    dash = ' stroke-dasharray="7 4"' if n.get("future") else ""
    width = 3 if n.get("decision") else 1.6
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="{width}"{dash}/>']
    ty = y + 28
    title = escape(n["title"])
    if n.get("decision"):
        title = "◆ " + title
    out.append(f'<text x="{x + 16}" y="{ty}" font-family="{FONT}" font-size="15" font-weight="700" fill="#18181b">{title}</text>')
    for s in n.get("sub", []):
        ty += 20
        out.append(f'<text x="{x + 16}" y="{ty}" font-family="{FONT}" font-size="13" fill="#3f3f46">{escape(s)}</text>')
    if n.get("file"):
        ty += 20
        mark = "🔜 " if n.get("future") else "📄 "
        out.append(f'<text x="{x + 16}" y="{ty}" font-family="{MONO}" font-size="12" fill="{stroke}">{mark}{escape(n["file"])}</text>')
    return out, h


def arrow(x1, y1, x2, y2, label=None, color="#52525b", lx=None, ly=None):
    out = [f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2" marker-end="url(#arrow-{color[1:]})"/>']
    if label:
        lx = lx if lx is not None else (x1 + x2) / 2 + 10
        ly = ly if ly is not None else (y1 + y2) / 2 + 4
        out.append(f'<text x="{lx}" y="{ly}" font-family="{FONT}" font-size="12" font-weight="600" fill="{color}">{escape(label)}</text>')
    return out


def markers():
    colors = {"#52525b", "#dc2626", "#16a34a", "#2563eb", "#ea580c", "#059669", "#c026d3", "#0891b2"}
    defs = ["<defs>"]
    for c in colors:
        defs.append(
            f'<marker id="arrow-{c[1:]}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
        )
    defs.append("</defs>")
    return defs


def legend(y, lanes_used):
    out = []
    x = MAIN_X
    for key in lanes_used:
        fill, stroke, label = LANES[key]
        out.append(f'<rect x="{x}" y="{y}" width="16" height="16" rx="4" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')
        out.append(f'<text x="{x + 22}" y="{y + 13}" font-family="{FONT}" font-size="12" fill="#3f3f46">{label}</text>')
        x += 26 + len(label) * 6.2
    out.append(
        f'<text x="{MAIN_X}" y="{y + 38}" font-family="{FONT}" font-size="12" fill="#71717a">'
        "◆ = decision · solid border = exists today · dashed border 🔜 = later phase</text>"
    )
    return out


def flow(filename, title, example, nodes):
    body = []
    y = TOP
    centers = []
    for i, n in enumerate(nodes):
        parts, h = box(MAIN_X, y, MAIN_W, n)
        body += parts
        centers.append((y, h))
        side = n.get("side")
        if side:
            sp, sh = box(SIDE_X, y + (h - node_height(side)) / 2, SIDE_W, side)
            body += sp
            stroke = LANES[side["lane"]][1]
            cy = y + h / 2
            body += arrow(MAIN_X + MAIN_W, cy, SIDE_X - 2, cy, side.get("edge"), stroke, lx=MAIN_X + MAIN_W + 8, ly=cy - 8)
        if i < len(nodes) - 1:
            label = nodes[i + 1].get("edge")
            ax = MAIN_X + MAIN_W / 2
            body += arrow(ax, y + h, ax, y + h + GAP - 2, label, lx=ax + 10, ly=y + h + GAP / 2 + 4)
        y += h + GAP
    loop = [n for n in nodes if n.get("loop_to") is not None]
    for n in loop:
        i = nodes.index(n)
        (y1, h1), (y0, h0) = centers[i], centers[n["loop_to"]]
        x = MAIN_X - 18
        body.append(
            f'<path d="M{MAIN_X},{y1 + h1 / 2} L{x},{y1 + h1 / 2} L{x},{y0 + h0 / 2} L{MAIN_X - 2},{y0 + h0 / 2}" '
            f'fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow-16a34a)"/>'
        )
    lanes_used = []
    for n in nodes:
        for k in (n["lane"], n.get("side", {}).get("lane")):
            if k and k not in lanes_used:
                lanes_used.append(k)
    height = y - GAP + 90
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}">',
        *markers(),
        f'<rect width="{W}" height="{height}" fill="#ffffff"/>',
        f'<text x="{MAIN_X}" y="40" font-family="{FONT}" font-size="22" font-weight="800" fill="#18181b">{escape(title)}</text>',
        f'<text x="{MAIN_X}" y="66" font-family="{FONT}" font-size="14" fill="#52525b">Example: {escape(example)}</text>',
        *body,
        *legend(y - GAP + 30, lanes_used),
        "</svg>",
    ]
    (OUT / filename).write_text("\n".join(svg), encoding="utf-8")


# ---------------------------------------------------------------- diagrams

flow("01-manual-add-to-cart.svg", "1 · Clicking “Add to cart” (no voice)", "the shopper clicks ADD on Tomato (1 kg · ₹40)", [
    {"lane": "user", "title": "Click “ADD” on Tomato", "file": "components/products/add-to-cart-control.tsx"},
    {"lane": "frontend", "title": "cartController.add(\"p001\", 1)", "sub": ["Controller: the entry point for the action"], "file": "controllers/cart-controller.ts"},
    {"lane": "frontend", "decision": True, "title": "cartService.add — business rules", "sub": ["Product exists? In stock? Quantity valid?"], "file": "services/cart-service.ts",
     "side": {"lane": "error", "title": "Red toast", "sub": ["OUT_OF_STOCK · PARTIAL_STOCK", "NOT_FOUND · INVALID_QUANTITY"], "edge": "fails"}},
    {"lane": "frontend", "edge": "ok", "title": "Save cart items", "sub": ["Kept in localStorage (survives refresh)"], "file": "store/cart-store.ts"},
    {"lane": "frontend", "title": "Recalculate the bill (in paise)", "sub": ["subtotal − discount + delivery = total"], "file": "services/pricing/pricing-service.ts + data/*.json"},
    {"lane": "ok", "title": "Cart icon updates + green toast", "sub": ["“Added 1 × Tomato (1 kg) to your cart”"], "file": "hooks/use-cart.ts"},
])

flow("02-start-voice-session.svg", "2 · Starting a voice session", "the shopper clicks 🎤 “Ask Cartiva” on localhost:3000", [
    {"lane": "user", "title": "Click 🎤 “Ask Cartiva”", "file": "components/voice/voice-button.tsx → session.start()"},
    {"lane": "frontend", "title": "Ask FastAPI for a token", "sub": ["POST {NEXT_PUBLIC_BACKEND_URL}/api/livekit/token"], "file": "lib/voice/token-source.ts"},
    {"lane": "backend", "decision": True, "title": "CORS check", "sub": ["Is the page's origin (localhost:3000) allowed?"], "file": "backend/app/main.py",
     "side": {"lane": "error", "title": "Browser blocks the reply", "sub": ["Any other website"], "edge": "no"}},
    {"lane": "backend", "edge": "yes", "title": "Sign a token for a NEW private room", "sub": ["+ “dispatch agent cartiva-agent” written inside", "signed with the secret from backend/.env"], "file": "backend/app/routers/livekit.py"},
    {"lane": "livekit", "title": "Browser joins room “cartiva-ab12cd34”", "sub": ["Mic turns on (browser asks permission once)"], "file": "components/voice/voice-provider.tsx"},
    {"lane": "livekit", "title": "LiveKit reads the token → sends a job to cartiva-agent"},
    {"lane": "agent", "title": "Agent worker joins the same room", "sub": ["Builds STT + LLM + TTS, starts the 2-minute clock"], "file": "backend/agent/worker.py → entrypoint()"},
    {"lane": "frontend", "title": "Browser has registered its RPC methods", "sub": ["cart.*, catalog.search, ui.*, checkout.* — the only things the agent may ask"], "file": "lib/voice/rpc.ts"},
    {"lane": "ok", "title": "🔊 “Hi! I'm Cartiva. What do you need today?”", "sub": ["Button: Connecting… → Agent joining… → Listening…"]},
])

flow("03-one-voice-turn.svg", "3 · What happens in ONE voice turn", "the shopper says something, the agent answers (with or without tools)", [
    {"lane": "user", "title": "🎤 The shopper speaks", "sub": ["audio travels through the LiveKit room"]},
    {"lane": "livekit", "title": "STT — Deepgram Nova-3 (language “multi”)", "sub": ["speech → text, English / Hindi / Hinglish"], "file": "LiveKit Inference (cloud)"},
    {"lane": "livekit", "title": "Turn detector: “has the shopper finished?”", "sub": ["avoids cutting people off mid-pause"]},
    {"lane": "agent", "decision": True, "title": "LLM reads INSTRUCTIONS + chat history + tools", "sub": ["Decides: just answer, or call a tool first?"], "file": "backend/agent/worker.py → INSTRUCTIONS",
     "side": {"lane": "ok", "title": "Just answer", "sub": ["e.g. “What can you do?”"], "edge": "no tool"}},
    {"lane": "agent", "edge": "tool", "title": "Run the tool (up to 8 rounds per reply)", "sub": ["e.g. search_products, add_to_cart, get_screen"], "file": "backend/agent/worker.py → @function_tool"},
    {"lane": "rpc", "title": "call_browser(\"catalog.search\", {…})", "sub": ["perform_rpc to the shopper's browser, 5 s timeout"], "file": "backend/agent/rpc.py → frontend/lib/voice/rpc.ts"},
    {"lane": "frontend", "title": "voiceController runs the SAME services as the buttons", "sub": ["returns JSON: results, or an error code + message"], "file": "frontend/controllers/voice-controller.ts"},
    {"lane": "agent", "title": "LLM turns the JSON into a short sentence", "sub": ["in the shopper's language; never invents data"]},
    {"lane": "livekit", "title": "TTS — Cartesia Sonic 3 (Hindi-capable voice)", "sub": ["text → speech"]},
    {"lane": "ok", "title": "🔊 The shopper hears the reply", "sub": ["Talk over it → adaptive interruption stops the agent", "(“mm-hmm”, “haan” are ignored as backchannels)"]},
])

flow("04-voice-search.svg", "4 · Searching by voice", "“Show me dishwashing liquids under 200”", [
    {"lane": "user", "title": "🎤 “Show me dishwashing liquids under 200”"},
    {"lane": "agent", "title": "search_products(query=\"dishwashing liquid\", max_price=200)", "sub": ["one product per search · Hindi words translated to English"], "file": "backend/agent/worker.py"},
    {"lane": "rpc", "title": "RPC “catalog.search” {query, maxPrice: 200}", "file": "backend/agent/rpc.py → frontend/lib/voice/rpc.ts"},
    {"lane": "frontend", "title": "catalogService.filter({query, maxPrice: 20000 paise})", "sub": ["the same search as the search box (rupees → paise)"], "file": "controllers/voice-controller.ts → services/catalog-service.ts"},
    {"lane": "frontend", "title": "Navigate to /search?q=dishwashing+liquid&max=200", "sub": ["the shopper SEES the same 4 products"], "file": "app/search/page.tsx"},
    {"lane": "frontend", "decision": True, "title": "Any results?",
     "side": {"lane": "error", "title": "count = 0 → hint added", "sub": ["“Don't repeat this search;", "search products separately”"], "edge": "none"}},
    {"lane": "agent", "edge": "yes", "title": "LLM gets up to 8 products", "sub": ["id, name, unit, price, priceRupees — remembers ids, never reads them aloud"]},
    {"lane": "ok", "title": "🔊 “I found four. The cheapest is Vim, fifty-five rupees…”"},
])

flow("05-voice-add-to-cart.svg", "5 · Adding to the cart by voice", "“Add 1 kg tomatoes and 2 kg potatoes”", [
    {"lane": "user", "title": "🎤 “Add 1 kg tomatoes and 2 kg potatoes”"},
    {"lane": "agent", "title": "search_products(\"tomato\") and search_products(\"potato\")", "sub": ["needs productIds first — never guesses an id"]},
    {"lane": "agent", "decision": True, "title": "Which product exactly?", "sub": ["plain product over variants (Tomato, not Cherry/Puree)", "pack size said? “1 kg” → the 1 kg pack"],
     "side": {"lane": "error", "title": "Still unclear → ASK", "sub": ["e.g. “Surf Excel” = 3 products", "“Which one would you like?”"], "edge": "unclear"}},
    {"lane": "agent", "edge": "clear", "title": "Quantity = number of PACKS", "sub": ["Tomato 1 kg pack: “1 kg” = 1 · Potato 1 kg pack: “2 kg” = 2"]},
    {"lane": "agent", "title": "add_to_cart(\"p001\", 1) · add_to_cart(\"p004\", 2)", "sub": ["also clears any pending checkout (the total changed)"], "file": "backend/agent/worker.py"},
    {"lane": "rpc", "title": "RPC “cart.add” {productId, quantity}", "file": "frontend/lib/voice/rpc.ts"},
    {"lane": "frontend", "decision": True, "title": "cartController.add → cartService.add", "sub": ["the SAME code as the ADD button: stock checks + toast"], "file": "controllers/cart-controller.ts → services/cart-service.ts",
     "side": {"lane": "error", "title": "PARTIAL_STOCK / OUT_OF_STOCK", "sub": ["agent explains and offers", "the available amount"], "edge": "fails"}},
    {"lane": "ok", "edge": "ok", "title": "🔊 “Added one kilo of tomatoes and two kilos of potatoes.”", "sub": ["cart icon + toast update on screen"]},
])

flow("06-voice-remove-update.svg", "6 · Removing items and changing quantities", "“One more tomato” · “Remove the milk” · “Make it 3”", [
    {"lane": "user", "title": "🎤 “One more tomato”"},
    {"lane": "agent", "title": "get_cart() first", "sub": ["finds the productId and the CURRENT quantity (Tomato = 2)"]},
    {"lane": "rpc", "title": "RPC “cart.get” → items, quantities, bill", "file": "controllers/voice-controller.ts → cartService.getCart()"},
    {"lane": "agent", "decision": True, "title": "Which cart item? What is the new total?", "sub": ["“one more” → 2 + 1 = 3 · “make it 3” → 3 · 0 → remove"],
     "side": {"lane": "error", "title": "Not in the cart / unclear", "sub": ["“Bananas aren't in your cart”", "or “Which milk?”"], "edge": "unclear"}},
    {"lane": "agent", "edge": "clear", "title": "update_cart(\"p001\", 3)  or  remove_from_cart(\"p019\")", "sub": ["also clears any pending checkout"], "file": "backend/agent/worker.py"},
    {"lane": "rpc", "title": "RPC “cart.update” / “cart.remove”", "file": "frontend/lib/voice/rpc.ts"},
    {"lane": "frontend", "title": "cartController.updateQuantity / remove", "sub": ["the SAME code as the − / + / 🗑 buttons"], "file": "controllers/cart-controller.ts"},
    {"lane": "ok", "title": "🔊 “You now have three kilos of tomatoes.”"},
])

flow("07-voice-navigation.svg", "7 · Moving around the website by voice", "“Go to fruits” · “Open the Pril one”", [
    {"lane": "user", "title": "🎤 “Go to fruits”  /  “डेयरी दिखाओ”"},
    {"lane": "agent", "title": "navigate_category(category=\"fruits\")", "sub": ["category must be one of 9 fixed values (Python Literal)"], "file": "backend/agent/worker.py"},
    {"lane": "rpc", "title": "RPC “ui.openCategory” {category}", "file": "frontend/lib/voice/rpc.ts"},
    {"lane": "frontend", "decision": True, "title": "Category exists?", "file": "controllers/voice-controller.ts → openCategory",
     "side": {"lane": "error", "title": "NOT_FOUND", "sub": ["“There's no electronics section”", "page does not change"], "edge": "no"}},
    {"lane": "frontend", "edge": "yes", "title": "router.push(\"/category/fruits\")", "sub": ["the voice call keeps going (VoiceProvider lives in the layout)"], "file": "components/voice/voice-provider.tsx"},
    {"lane": "agent", "title": "Gets the products on that page (with ids)", "sub": ["so “add apples” next needs no new search"]},
    {"lane": "ok", "title": "🔊 “Here are our fruits, like bananas and apples.”", "sub": ["“Open the Pril one” → open_product(id) → /product/p047"]},
])

flow("08-screen-references.svg", "8 · “The cheapest one” after browsing by clicking", "the shopper clicks Snacks, then says “Add the cheapest one”", [
    {"lane": "user", "title": "🖱️ Clicks “Snacks” (and maybe sorts / filters)"},
    {"lane": "frontend", "title": "ProductBrowser reports what is visible", "sub": ["products AFTER filters + sorting, in on-screen order"], "file": "components/products/product-browser.tsx"},
    {"lane": "frontend", "title": "screenController.showProducts(\"Snacks\", [ids…])", "file": "controllers/screen-controller.ts → store/screen-store.ts"},
    {"lane": "user", "title": "🎤 “Add the cheapest one”"},
    {"lane": "agent", "title": "get_screen()", "sub": ["the agent didn't show this list itself, so it looks at the screen"], "file": "backend/agent/worker.py"},
    {"lane": "rpc", "title": "RPC “ui.getScreen” → page + products", "sub": ["position 1, 2, 3… and numeric priceRupees for comparing"], "file": "controllers/voice-controller.ts → getScreen"},
    {"lane": "agent", "decision": True, "title": "Exactly one cheapest?", "sub": ["compares priceRupees (numbers, not text)"],
     "side": {"lane": "error", "title": "Tie → ASK by name", "sub": ["“Lay's Classic, Lay's Masala and", "Kurkure all cost twenty rupees.", "Which one should I add?”"], "edge": "tie"}},
    {"lane": "agent", "edge": "one", "title": "add_to_cart(cheapest id, 1)"},
    {"lane": "ok", "title": "🔊 “Added it to your cart.”", "sub": ["same for “the second one”, or “this one” on a product page"]},
])

flow("09-voice-checkout.svg", "9 · Checkout by voice — never pays without “yes”", "“Checkout” → total read out → “Yes” → Razorpay → result spoken", [
    {"lane": "user", "title": "🎤 “Checkout”  (or “Pay now”)"},
    {"lane": "agent", "title": "start_checkout()  — never pays", "file": "backend/agent/worker.py"},
    {"lane": "frontend", "decision": True, "title": "checkoutService.validate()", "sub": ["not empty · in stock · quantities available"], "file": "controllers/voice-controller.ts → startCheckout",
     "side": {"lane": "error", "title": "🔊 “Your cart is empty”", "sub": ["or “Tomato is out of stock”"], "edge": "no"}},
    {"lane": "agent", "edge": "yes", "title": "🔒 _pending_checkout_total = \"₹245\" → 🔊 “Shall I pay now?”", "sub": ["any cart change clears the lock"]},
    {"lane": "user", "decision": True, "title": "Shopper answers",
     "side": {"lane": "error", "title": "“No” / “Wait” / “रहने दो”", "sub": ["cancel_pending_action", "nothing paid, cart kept"], "edge": "no"}},
    {"lane": "agent", "edge": "yes", "decision": True, "title": "confirm_payment(): lock set?", "sub": ["one “yes” = one payment attempt"],
     "side": {"lane": "error", "title": "Refuse — nothing paid", "sub": ["“confirm the (new) total first”"], "edge": "not set"}},
    {"lane": "rpc", "edge": "set", "title": "RPC “checkout.confirm” → returns at once", "sub": ["“payment window is open” (no 5 s timeout)"], "file": "controllers/voice-controller.ts → confirmPayment"},
    {"lane": "backend", "title": "POST /api/payment/create-order", "sub": ["browser sends only {productId, quantity}; FastAPI computes the amount"], "file": "backend/app/routers/payment.py + app/pricing.py"},
    {"lane": "user", "title": "Razorpay popup: card / netbanking", "sub": ["page shows “Processing payment…” (shared checkout store)"], "file": "services/payment/razorpay-payment-gateway.ts"},
    {"lane": "backend", "decision": True, "title": "POST /api/payment/verify", "sub": ["HMAC signature valid AND order amount = this cart's total"], "file": "backend/app/routers/payment.py",
     "side": {"lane": "error", "title": "Failed / cancelled / invalid", "sub": ["red box + Retry, cart kept", "→ RPC “payment.result” {ok:false}"], "edge": "no"}},
    {"lane": "ok", "edge": "yes", "title": "/order-success · cart cleared", "sub": ["→ RPC “payment.result” {ok:true} to the agent", "🔊 “Your payment was successful!”"]},
])

flow("10-ending-a-call.svg", "10 · How a voice call ends (protects the free credit)", "“Bye” · silence · the 2-minute limit · clicking the button", [
    {"lane": "agent", "title": "Session running · 2-minute timer started", "file": "worker.py → enforce_time_limit()"},
    {"lane": "user", "decision": True, "title": "Shopper says “bye”, “that's all”, “बस, धन्यवाद”?",
     "side": {"lane": "ok", "title": "end_call(goodbye) tool", "sub": ["goodbye spoken in their language,", "THEN the room is deleted"], "edge": "yes"}},
    {"lane": "livekit", "edge": "no", "decision": True, "title": "30 s of silence? (user state “away”)", "file": "AgentSession(user_away_timeout=30)",
     "side": {"lane": "error", "title": "“Are you still there?”", "sub": ["still silent 15 s later →", "goodbye + hang up"], "edge": "yes"}},
    {"lane": "agent", "edge": "no", "decision": True, "title": "2 minutes reached?",
     "side": {"lane": "error", "title": "Limit message", "sub": ["“We've reached the two minute", "limit…” → hang up"], "edge": "yes"}},
    {"lane": "user", "edge": "no", "title": "Shopper clicks the button again → session.end()", "sub": ["or closes the tab — LiveKit ends it"], "file": "components/voice/voice-button.tsx"},
    {"lane": "ok", "title": "Room deleted → browser disconnects → button: “Ask Cartiva”", "sub": ["timers cancelled (shutdown callback) — no credit used after"]},
])

flow("11-hindi-hinglish.svg", "11 · Hindi and Hinglish", "“टमाटर दिखाओ” → a Hindi answer about tomatoes", [
    {"lane": "user", "title": "🎤 “टमाटर दिखाओ” (Hindi)"},
    {"lane": "livekit", "title": "STT Deepgram Nova-3, language “multi”", "sub": ["detects Hindi automatically; mixed sentences work too"]},
    {"lane": "agent", "title": "Language rule: reply in the language of the LAST message", "sub": ["decided again every turn, so switching works"], "file": "worker.py → INSTRUCTIONS (most important rule)"},
    {"lane": "agent", "title": "search_products(query=\"tomato\")", "sub": ["the catalog is English, so the LLM translates the product word"]},
    {"lane": "rpc", "title": "Same search, same screen, same results as in English"},
    {"lane": "agent", "title": "Reply in Devanagari + English product names", "sub": ["“मुझे tomatoes मिल गए, screen पर देखिए।”"]},
    {"lane": "livekit", "title": "TTS Cartesia Sonic 3, language “hi”", "sub": ["Indian-accent voice pronounces both scripts"]},
    {"lane": "ok", "title": "🔊 Hindi answer · prices as “चालीस रुपये”", "sub": ["the very first greeting is always English: “Hi / Hello”"]},
])

flow("12-testing-the-agent.svg", "12 · How we test the agent without speaking", "uv run pytest -v  (20 conversation tests)", [
    {"lane": "user", "title": "uv run pytest -v", "file": "backend/tests/test_conversation.py"},
    {"lane": "agent", "title": "Real agent: same INSTRUCTIONS, tools, LLM, MAX_TOOL_STEPS", "sub": ["text mode — no microphone, no speech (cheap)"]},
    {"lane": "rpc", "title": "call_browser is swapped for a FakeBrowser", "sub": ["answers the same RPC methods using the real products.json"], "file": "backend/tests/fake_browser.py"},
    {"lane": "agent", "title": "Each test plays a short conversation", "sub": ["e.g. “Checkout” → “No, wait”"]},
    {"lane": "frontend", "decision": True, "title": "Check the OUTCOME, not the exact words", "sub": ["what is in the cart? was anything paid? did it ask?"],
     "side": {"lane": "error", "title": "FAILED → trace the tool calls", "sub": ["found: unnecessary questions,", "dropped 2nd add, search loop"], "edge": "wrong"}},
    {"lane": "ok", "edge": "right", "title": "all pass — run again after every worker.py change"},
])


flow("13-scan-shopping-list.svg", "13 · Scanning a photo of a shopping list", "photo of “tamatar 2 kg, Surf Excel, paneer, pizza”", [
    {"lane": "user", "title": "📷 Scan list → upload or take a photo", "sub": ["JPEG / PNG / WebP, up to 5 MB, handwritten is fine"], "file": "components/shopping-list/scan-list-view.tsx"},
    {"lane": "frontend", "title": "shoppingListController.scan(photo)", "sub": ["page shows “Reading your list…”"], "file": "controllers/shopping-list-controller.ts → list-scanner.ts"},
    {"lane": "backend", "decision": True, "title": "POST /api/list/scan — file checks", "file": "backend/app/routers/shopping_list.py",
     "side": {"lane": "error", "title": "415 / 413 / 400", "sub": ["not an image · too large · empty"], "edge": "bad"}},
    {"lane": "backend", "edge": "ok", "title": "OpenAI vision model (structured output)", "sub": ["English names (Hindi translated), quantity, unit, original text", "crossed-out items and prices ignored"], "file": "OPENAI_VISION_MODEL (gpt-4.1-mini)"},
    {"lane": "frontend", "title": "Match each line to OUR catalog", "sub": ["catalogService.search · keep the main category (milk → dairy)", "plain product, or the pack size written (Surf Excel 2 kg)"], "file": "services/shopping-list/shopping-list-service.ts"},
    {"lane": "frontend", "title": "Quantity → packs", "sub": ["“2 kg” of a 1 kg pack = 2 · “200 g” of a 200 g pack = 1 · capped to stock"], "file": "services/shopping-list/units.ts"},
    {"lane": "frontend", "decision": True, "title": "Each line gets a status",
     "side": {"lane": "error", "title": "⚠️ choose / ❌ not available", "sub": ["Surf Excel → 3 options", "pizza → not sold · out of stock"], "edge": "unclear"}},
    {"lane": "ok", "edge": "found", "title": "✅ Ready: Tomato 1 kg × 2, Mother Dairy Paneer × 1", "sub": ["edit: − / + · 🗑 · pick an option · “Add an item”"]},
    {"lane": "user", "title": "“Add N to cart” (or say “yes” — see 14)", "sub": ["nothing is in the cart before this"]},
    {"lane": "ok", "title": "cartService.add for every ready line → /cart", "sub": ["same stock rules as the ADD button · one summary toast"]},
])

flow("14-voice-list-review.svg", "14 · Reviewing the scanned list by voice", "“Remove the bread” · “the 2 kg Surf Excel” · “Yes, add them”", [
    {"lane": "frontend", "title": "Scan finished (scanId +1) and the agent is connected", "sub": ["or the shopper taps 🎤 Review with Cartiva"], "file": "components/voice/voice-list-announcer.tsx"},
    {"lane": "rpc", "title": "Browser → agent: RPC “list.scanned”", "file": "lib/voice/rpc.ts → notifyAgent"},
    {"lane": "agent", "title": "get_shopping_list()", "sub": ["ready lines, options to choose, not available — with lineIds"], "file": "backend/agent/worker.py"},
    {"lane": "ok", "title": "🔊 “Two kilos of tomatoes, paneer… Surf Excel comes in three sizes.", "sub": ["Pizza isn't sold here. Shall I add them, or change something?”"]},
    {"lane": "user", "decision": True, "title": "Shopper edits or agrees",
     "side": {"lane": "agent", "title": "Edit tools (page updates live)", "sub": ["remove_list_item · add_list_item", "update_list_item · choose_list_item"], "edge": "edit"}},
    {"lane": "agent", "edge": "“yes”", "title": "confirm_shopping_list()", "sub": ["only after a clear yes · clears any pending checkout"]},
    {"lane": "rpc", "title": "RPC “list.confirm” → shoppingListController.confirm()", "sub": ["the SAME confirm as the “Add N to cart” button"], "file": "controllers/voice-controller.ts"},
    {"lane": "ok", "title": "Cart updated → /cart", "sub": ["🔊 “Added four items. Pizza wasn't available.”"]},
])

flow("15-voice-errors.svg", "15 · When voice goes wrong (shopping always keeps working)", "mic blocked · server down · agent missing · network drop", [
    {"lane": "user", "title": "Click 🎤 Ask Cartiva", "file": "components/voice/voice-button.tsx"},
    {"lane": "frontend", "decision": True, "title": "Token from FastAPI?", "file": "lib/voice/token-source.ts",
     "side": {"lane": "error", "title": "VoiceServerError", "sub": ["“The voice assistant is offline", "right now…”"], "edge": "no"}},
    {"lane": "frontend", "edge": "yes", "decision": True, "title": "Microphone allowed and available?", "file": "voice-error-reporter.tsx (mediaDevicesError)",
     "side": {"lane": "error", "title": "mic-denied / missing / busy", "sub": ["how to allow it in the 🔒 menu", "session ended"], "edge": "no"}},
    {"lane": "livekit", "edge": "yes", "decision": True, "title": "Agent joined within 20 s?", "sub": ["worker down, or free credit used up"],
     "side": {"lane": "error", "title": "agent-unavailable", "sub": ["“didn't answer, try again —", "tapping still works”"], "edge": "no"}},
    {"lane": "livekit", "edge": "yes", "decision": True, "title": "Network stable during the call?", "sub": ["button shows “Reconnecting…” while LiveKit retries"],
     "side": {"lane": "error", "title": "connection-lost", "sub": ["unexpected disconnect only"], "edge": "dropped"}},
    {"lane": "ok", "edge": "yes", "title": "Normal endings show NO error", "sub": ["bye / silence / 2-minute limit = ROOM_DELETED · stop button = CLIENT_INITIATED"], "file": "lib/voice/voice-errors.ts"},
])


# ---------------------------------------------------------------- architecture (hand-placed)

def group(x, y, w, h, lane, title):
    fill, stroke, _ = LANES[lane]
    return [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{fill}" stroke="{stroke}" stroke-width="1.6" stroke-dasharray="6 4"/>',
        f'<text x="{x + 14}" y="{y + 26}" font-family="{FONT}" font-size="14" font-weight="800" fill="{stroke}">{escape(title)}</text>',
    ]


def card(x, y, w, h, lane, title, sub):
    _, stroke, _ = LANES[lane]
    return [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#ffffff" stroke="{stroke}" stroke-width="1.6"/>',
        f'<text x="{x + 12}" y="{y + 26}" font-family="{FONT}" font-size="14" font-weight="700" fill="#18181b">{escape(title)}</text>',
        f'<text x="{x + 12}" y="{y + 46}" font-family="{MONO}" font-size="11.5" fill="{stroke}">{escape(sub)}</text>',
    ]


def path(d, color, label=None, lx=0, ly=0, both=False, dashed=False, anchor="start"):
    start = f' marker-start="url(#arrow-{color[1:]})"' if both else ""
    dash = ' stroke-dasharray="6 4"' if dashed else ""
    out = [f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2"{dash}{start} marker-end="url(#arrow-{color[1:]})"/>']
    if label:
        out.append(f'<text x="{lx}" y="{ly}" text-anchor="{anchor}" font-family="{FONT}" font-size="11" font-weight="600" fill="{color}">{escape(label)}</text>')
    return out


H = 560
arch = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
    *markers(),
    f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
    f'<text x="30" y="40" font-family="{FONT}" font-size="22" font-weight="800" fill="#18181b">0 · The big picture</text>',
    f'<text x="30" y="66" font-family="{FONT}" font-size="14" fill="#52525b">The agent decides · the browser does (same code as the buttons) · FastAPI guards the secrets</text>',
    # shopper
    f'<rect x="20" y="200" width="120" height="80" rx="40" fill="#eef2ff" stroke="#4f46e5" stroke-width="1.6"/>',
    f'<text x="80" y="236" text-anchor="middle" font-family="{FONT}" font-size="22">🧑</text>',
    f'<text x="80" y="262" text-anchor="middle" font-family="{FONT}" font-size="14" font-weight="700" fill="#18181b">Shopper</text>',
    *group(170, 90, 300, 440, "frontend", "frontend/ · Next.js · :3000"),
    *card(190, 130, 260, 62, "frontend", "Pages & components", "app/ · components/"),
    *card(190, 230, 260, 62, "frontend", "Controllers", "controllers/"),
    *card(190, 330, 260, 62, "frontend", "Services", "catalog · cart · pricing"),
    *card(190, 430, 260, 62, "frontend", "JSON data", "data/*.json"),
    *group(510, 90, 240, 230, "livekit", "LiveKit Cloud"),
    *card(530, 130, 200, 62, "livekit", "Room", "live audio + RPC"),
    *card(530, 230, 200, 62, "livekit", "Inference", "STT · LLM · TTS"),
    *group(790, 90, 230, 440, "backend", "backend/ · Python · :8000"),
    *card(810, 130, 190, 62, "agent", "Voice agent", "agent/worker.py"),
    *card(810, 330, 190, 62, "backend", "FastAPI", "app/main.py"),
    f'<text x="905" y="410" text-anchor="middle" font-family="{FONT}" font-size="11.5" fill="#71717a">token · payments · list scan (OpenAI)</text>',
    # arrows
    *path("M140,240 L188,170", "#4f46e5", "clicks & speaks", 60, 186),
    *path("M320,192 L320,228", "#059669"),
    *path("M320,292 L320,328", "#059669"),
    *path("M320,392 L320,428", "#059669"),
    *path("M450,160 L528,160", "#2563eb", "audio", 489, 150, both=True, anchor="middle"),
    f'<text x="489" y="178" text-anchor="middle" font-family="{FONT}" font-size="11" font-weight="600" fill="#2563eb">+ RPC</text>',
    *path("M730,160 L808,160", "#c026d3", "audio", 769, 150, both=True, anchor="middle"),
    f'<text x="769" y="178" text-anchor="middle" font-family="{FONT}" font-size="11" font-weight="600" fill="#c026d3">+ RPC</text>',
    *path("M840,192 L732,255", "#2563eb", "speech ↔ text", 812, 240, both=True),
    *path("M450,180 L485,180 L485,360 L808,360", "#ea580c", "POST /api/livekit/token", 560, 352),
    *path("M808,380 L500,380 L500,460 L452,460", "#ea580c", "reads prices (Phase 9)", 560, 398, dashed=True),
    "</svg>",
]
(OUT / "00-big-picture.svg").write_text("\n".join(arch), encoding="utf-8")
print("written:", sorted(p.name for p in OUT.glob("*.svg")))
