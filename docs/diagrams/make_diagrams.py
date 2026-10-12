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
    colors = {"#52525b", "#dc2626", "#16a34a", "#2563eb", "#ea580c", "#059669", "#c026d3"}
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
        x += 30 + len(label) * 7
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

flow("01-manual-add-to-cart.svg", "1 · Manual shopping: “Add to cart” button", "the shopper clicks Add on Tomato (1 kg · ₹40)", [
    {"lane": "user", "title": "Click “Add” on Tomato", "file": "components/products/add-to-cart-control.tsx"},
    {"lane": "frontend", "title": "cartController.add(\"p001\", 1)", "sub": ["Controller: entry point for the action"], "file": "controllers/cart-controller.ts"},
    {"lane": "frontend", "decision": True, "title": "cartService.add — business rules", "sub": ["Product exists? In stock? Quantity valid?"], "file": "services/cart-service.ts",
     "side": {"lane": "error", "title": "Error toast", "sub": ["OUT_OF_STOCK · PARTIAL_STOCK", "NOT_FOUND · INVALID_QUANTITY"], "edge": "fails"}},
    {"lane": "frontend", "edge": "ok", "title": "Save cart items", "sub": ["Kept in localStorage (survives refresh)"], "file": "store/cart-store.ts"},
    {"lane": "frontend", "title": "Recalculate the bill (in paise)", "sub": ["subtotal − discount + delivery = total"], "file": "services/pricing/pricing-service.ts + data/*.json"},
    {"lane": "frontend", "title": "Screen updates", "sub": ["Cart icon count · bill · offer hints"], "file": "hooks/use-cart.ts"},
    {"lane": "ok", "title": "Toast: “Added 1 × Tomato (1 kg) to your cart”"},
])

flow("02-console-voice-test.svg", "2 · Voice test in the terminal (step 6.5)", "uv run python -m agent.worker console → “Hi, what can you do?”", [
    {"lane": "user", "title": "Run the agent in console mode", "sub": ["uv run python -m agent.worker console"]},
    {"lane": "agent", "title": "Load LiveKit settings", "sub": ["LIVEKIT_URL · LIVEKIT_API_KEY · LIVEKIT_API_SECRET"], "file": "agent/worker.py → load_dotenv() → backend/.env"},
    {"lane": "agent", "title": "Console mode", "sub": ["Uses this PC's mic and speakers — no website, no room"], "file": "agent/worker.py → cli.run_app(server)"},
    {"lane": "agent", "title": "Build the voice pipeline", "sub": ["AgentSession + CartivaAssistant (INSTRUCTIONS = “You are Cartiva…”)"], "file": "agent/worker.py → entrypoint()"},
    {"lane": "ok", "title": "Agent greets you", "sub": ["🔊 “Hi! Welcome to Cartiva. What do you need today?”"]},
    {"lane": "user", "title": "You speak", "sub": ["🎤 “Hi, what can you do?”"]},
    {"lane": "livekit", "title": "STT — AssemblyAI (the ears)", "sub": ["speech → text: “hi what can you do”"], "file": "LiveKit Inference (cloud)"},
    {"lane": "livekit", "title": "Turn detector", "sub": ["Decides: “the user finished speaking — reply now”"]},
    {"lane": "livekit", "title": "LLM — Gemma (the brain)", "sub": ["INSTRUCTIONS + conversation → reply text"]},
    {"lane": "livekit", "title": "TTS — Fish Audio (the voice)", "sub": ["text → speech"]},
    {"lane": "ok", "title": "You hear the reply", "sub": ["🔊 “I'm Cartiva, I can help you shop for groceries…”", "Dashed arrow: talk again · Ctrl + C to stop"], "loop_to": 5},
])

flow("03-website-voice-session.svg", "3 · Voice from the website (step 6.6)", "the shopper clicks 🎤 on http://localhost:3000", [
    {"lane": "user", "title": "Click 🎤 on the website", "file": "components/voice/voice-button.tsx"},
    {"lane": "frontend", "title": "Ask the backend for a token", "sub": ["POST {NEXT_PUBLIC_BACKEND_URL}/api/livekit/token"], "file": "frontend/.env"},
    {"lane": "backend", "decision": True, "title": "CORS check", "sub": ["Is http://localhost:3000 on the allowed list?"], "file": "app/main.py (CORSMiddleware)",
     "side": {"lane": "error", "title": "Browser blocks the response", "sub": ["Any other site / origin"], "edge": "not allowed"}},
    {"lane": "backend", "edge": "allowed", "title": "Create a signed token for a new room", "sub": ["Signed with LIVEKIT_API_SECRET (never leaves the server)"], "file": "app/routers/livekit.py + app/config.py"},
    {"lane": "frontend", "title": "Receive { token, url, room_name, identity }", "sub": ["room_name: “cartiva-6de253d7”"]},
    {"lane": "livekit", "future": True, "title": "Browser joins the room with the token", "file": "lib/voice/ (step 6.6)"},
    {"lane": "livekit", "future": True, "title": "LiveKit dispatches “cartiva-agent” to the room"},
    {"lane": "agent", "title": "Agent worker joins the same room", "sub": ["Running with: uv run python -m agent.worker dev"], "file": "agent/worker.py → entrypoint()"},
    {"lane": "ok", "future": True, "title": "Live conversation in the browser", "sub": ["🎤 → STT → LLM → TTS → 🔊", "Voice UI: LISTENING · THINKING · AGENT_SPEAKING"], "file": "types/voice.ts + components/voice/"},
])

flow("04-voice-add-to-cart.svg", "4 · Voice adds to the cart (Phase 7)", "the shopper says “Add 2 kg tomatoes”", [
    {"lane": "user", "title": "🎤 “Add 2 kg tomatoes”"},
    {"lane": "agent", "title": "STT → text, then the LLM chooses a tool", "sub": ["“I need to find tomatoes first”"]},
    {"lane": "agent", "future": True, "title": "Tool: search_products(\"tomatoes\")", "sub": ["Tools only forward — no business logic"], "file": "agent/tools.py"},
    {"lane": "livekit", "future": True, "title": "RPC → browser: catalog.search", "file": "agent/rpc.py → lib/voice/"},
    {"lane": "frontend", "title": "catalogService.search(\"tomatoes\")", "sub": ["→ Tomato · 1 kg · ₹40 · id p001"], "file": "services/catalog-service.ts + data/products.json"},
    {"lane": "agent", "future": True, "title": "LLM: 1 kg pack, user wants 2 kg → quantity 2", "sub": ["Tool: add_to_cart(\"p001\", 2)"], "file": "agent/tools.py"},
    {"lane": "livekit", "future": True, "title": "RPC → browser: cart.add"},
    {"lane": "frontend", "decision": True, "title": "cartController.add → cartService.add", "sub": ["The SAME code as the “Add” button · stock check"], "file": "controllers/cart-controller.ts + services/cart-service.ts",
     "side": {"lane": "error", "title": "Result: PARTIAL_STOCK / OUT_OF_STOCK", "sub": ["Agent explains the problem aloud"], "edge": "fails"}},
    {"lane": "frontend", "edge": "ok", "title": "Cart updates on screen + toast", "file": "store/cart-store.ts"},
    {"lane": "ok", "title": "🔊 “Done! I've added two kilos of tomatoes.”"},
])

flow("05-voice-checkout-payment.svg", "5 · Voice checkout and payment (Phases 7–9)", "“Checkout” → agent asks to confirm → “Yes” → Razorpay", [
    {"lane": "user", "title": "🎤 “Checkout”"},
    {"lane": "agent", "future": True, "title": "Tool: start_checkout", "file": "agent/tools.py"},
    {"lane": "frontend", "decision": True, "title": "checkoutController.validate()", "sub": ["Cart not empty? Everything in stock?"], "file": "controllers/checkout-controller.ts",
     "side": {"lane": "error", "title": "🔊 “Your cart is empty”", "sub": ["or “Tomato is out of stock”"], "edge": "invalid"}},
    {"lane": "agent", "edge": "valid", "future": True, "title": "🔊 “Your total is ninety-one rupees. Proceed?”", "sub": ["pending_confirmation = true"], "file": "agent/context.py"},
    {"lane": "user", "decision": True, "title": "Shopper answers",
     "side": {"lane": "error", "title": "“No” / “Cancel”", "sub": ["cancel_pending_action", "Payment never starts"], "edge": "no"}},
    {"lane": "agent", "edge": "yes", "future": True, "title": "Tool: confirm_payment", "sub": ["Allowed ONLY while pending_confirmation is set"], "file": "agent/tools.py"},
    {"lane": "backend", "future": True, "title": "POST /api/payment/create-order", "sub": ["Recalculates the total from JSON in paise (never trusts the browser)"], "file": "app/routers/payment.py + app/pricing.py"},
    {"lane": "frontend", "future": True, "title": "Razorpay Checkout popup", "sub": ["The shopper pays — the agent never touches payment"]},
    {"lane": "backend", "decision": True, "future": True, "title": "POST /api/payment/verify", "sub": ["HMAC signature check"], "file": "app/routers/payment.py",
     "side": {"lane": "error", "title": "Payment failed / cancelled", "sub": ["Cart kept · retry offered", "🔊 “The payment didn't go through.”"], "edge": "invalid"}},
    {"lane": "ok", "edge": "valid", "title": "Order placed", "sub": ["Cart cleared · /order-success page", "🔊 “Your payment was successful!”"]},
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
    f'<text x="905" y="410" text-anchor="middle" font-family="{FONT}" font-size="11.5" fill="#71717a">token · (Phase 9) payments</text>',
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
