# Cartiva — Development Plan

**Repository:** `cartiva-ai`  
**Product:** Cartiva — Intelligent Grocery Shopping Platform  
**Stack:** Next.js (frontend, catalog, cart, pricing) + Python FastAPI (LiveKit + Razorpay) + Python LiveKit Agents (voice worker)  
**Data:** JSON files only — no database  
**Approach:** Manual-first → Voice integration → Agent tools → Context → Checkout → Payment → Polish

---

# 1. Development Strategy

Build Cartiva incrementally.

Do NOT start with the voice agent or payment integration.

The application should first work as a normal grocery store. Then LiveKit should become an additional interface that can operate the same application actions.

Core principle:

```text
Manual UI
    ↓
Shared application actions
    ↓
Shared state
    ↑
Voice Agent
```

This prevents the voice implementation from becoming a separate system.

---

# 1.1 System Architecture

Cartiva has three runtime parts:

| Part | Tech | Responsibility |
|------|------|----------------|
| **Frontend** | Next.js, TypeScript, Tailwind, Zustand | UI, JSON catalog, search/filter, cart state, pricing & offers, shared actions, RPC handlers for the agent, Razorpay Checkout.js |
| **Backend** | Python, FastAPI | LiveKit token generation, Razorpay order creation + signature verification |
| **Agent worker** | Python, LiveKit Agents | STT → LLM → TTS, voice tools, conversation context |

There is **no database**. Products, categories and offers live in JSON files in `frontend/data/`. The cart lives in the browser (Zustand + localStorage). The FastAPI backend is stateless.

```text
                                  ┌───────────────────────────────┐
                                  │ FastAPI backend (Python)      │
                                  │  POST /api/livekit/token      │
                                  │  POST /api/payment/create-order│
                                  │  POST /api/payment/verify     │
                                  │  (reads data/*.json read-only)│
                                  └──────────────▲────────────────┘
                                                 │ HTTP
Browser (Next.js)                                │          Agent Worker (Python, LiveKit Agents)
─────────────────                                │          ─────────────────────────────────────
data/*.json → lib/catalog                        │          STT → LLM → TTS
Manual UI ──┐                                    │                │
            ↓                                    │                │
   lib/actions (shared) ─────────────────────────┘                │
            ▲  ◄─────────────────── RPC call ─────────────  tool: add_to_cart(...)
            ↓                                                     │
   Zustand store (cart)                                           │
            │                                                     │
            └─────────── RPC result / UI context ─────────────►  agent speaks result
```

## Rules

- **Catalog, search, cart and pricing live in the Next.js app.** `frontend/data/*.json` is imported by `lib/catalog`; pricing is one TypeScript module (`lib/pricing`). The UI and the voice tools both use these.
- **The agent never holds its own cart or catalog.** Every voice tool is a thin Python wrapper that calls a browser RPC method (e.g. `cart.add`, `catalog.search`), which runs the **same** action function the manual UI uses and returns a typed result (`{ ok, data | error }`). What the agent "sees" equals what the UI displays.
- The browser pushes UI context to the agent (current category, displayed products, cart snapshot) on change, so references like "the cheapest one" work after manual browsing too.
- The browser notifies the agent of payment results (success / failure / cancelled) so the agent can report them (FR-26, FR-27).
- **Payment is never executed by the agent.** The agent can only ask the browser to open checkout after explicit confirmation.
- **FastAPI owns all secrets.** LiveKit API secret and Razorpay key secret exist only in `backend/.env`. The browser receives only the LiveKit token/URL and the Razorpay key ID.
- **Payment total is recomputed in Python.** `create-order` reads the same `frontend/data/*.json` files (read-only) and recomputes the total with a small Python port of the pricing rules (`backend/app/pricing.py`). A client-sent total is never trusted.

## Keeping the Two Pricing Implementations in Sync

Pricing exists in TypeScript (for the UI) and Python (for payment). To prevent drift:

- Keep pricing rules simple and data-driven (offers and delivery thresholds come from `frontend/data/offers.json`, not hard-coded).
- Create shared golden test cases in `frontend/data/pricing-cases.json` (`items` → expected `subtotal`, `discount`, `deliveryFee`, `total`).
- Both Vitest and pytest run against the same file. If either fails, the implementations have diverged.
- Work in integer paise in both languages to avoid float rounding differences.

## API Routing

Use a Next.js rewrite so the browser calls same-origin `/api/livekit/*` and `/api/payment/*`, proxied to FastAPI (`BACKEND_URL`). This avoids CORS in development. Also configure FastAPI `CORSMiddleware` with an explicit allowlist as a fallback. (Verify the rewrite API against `frontend/node_modules/next/dist/docs/` before implementing — this Next.js version has breaking changes.)

## Shared Error Codes

Used by browser actions, RPC results, FastAPI responses and voice replies:

```text
NOT_FOUND
OUT_OF_STOCK
PARTIAL_STOCK
AMBIGUOUS
INVALID_QUANTITY
EMPTY_CART
PENDING_CONFIRMATION_REQUIRED
PAYMENT_VERIFICATION_FAILED
```

---

# 1.2 Repository Structure

```text
cartiva-ai/
├── PLAN.md  SRS-PRD.md  README.md  CLAUDE.md  AGENTS.md
├── .gitignore
│
├── frontend/                 # Next.js app — run npm commands here
│   ├── app/                  # App Router (views)
│   ├── components/           # views
│   ├── hooks/                # read-only view models
│   ├── controllers/          # thin entry points (UI events + voice RPC)
│   ├── services/             # business rules: catalog, pricing, cart, checkout
│   ├── models/
│   │   ├── entities/         # Product, Offer, Cart, Order
│   │   └── repositories/     # JSON data access behind interfaces
│   ├── store/                # Zustand state only
│   ├── lib/
│   │   ├── container.ts      # composition root
│   │   └── voice/            # LiveKit client + RPC method registration
│   ├── types/
│   ├── data/                 # JSON "database" (read by Next.js and, read-only, by FastAPI)
│   │   ├── products.json
│   │   ├── categories.json
│   │   ├── offers.json
│   │   └── pricing-cases.json  # shared golden pricing tests
│   ├── public/
│   └── package.json
│
└── backend/                  # Python project (uv) — run uv commands here
    ├── pyproject.toml
    ├── .env.example
    ├── app/                  # FastAPI
    │   ├── main.py
    │   ├── config.py         # pydantic-settings (secrets, DATA_DIR, CORS)
    │   ├── catalog.py        # read-only loader for frontend/data/*.json
    │   ├── pricing.py        # Python port of pricing rules (payment only)
    │   └── routers/
    │       ├── livekit.py
    │       └── payment.py
    ├── agent/                # LiveKit Agents worker
    │   ├── worker.py
    │   ├── tools.py
    │   ├── context.py
    │   └── rpc.py            # typed wrappers around browser RPC calls
    └── tests/                # pytest
```

---

# 2. Phase Overview

```text
Phase 0  Project Setup
Phase 1  UI Foundation
Phase 2  JSON Catalog
Phase 3  Product Discovery
Phase 4  Cart & Pricing
Phase 5  Checkout UI
Phase 6  LiveKit Foundation (FastAPI + Python agent)
Phase 7  Voice Agent Tools
Phase 8  Context & Conversation Intelligence
Phase 9  Razorpay Payment (FastAPI)
Phase 10 Error Handling & Edge Cases
Phase 11 Testing
Phase 12 UI Polish
Phase 13 Deployment
```

Phases 0–5 are frontend-only. The FastAPI backend is introduced in Phase 6.

---

# 3. Phase 0 — Project Setup

## Tasks

- [ ] Create GitHub repository `cartiva-ai`.
- [ ] Create Next.js project (done — app at repo root).
- [ ] Configure TypeScript.
- [ ] Configure Tailwind CSS.
- [ ] Create initial folder structure (§1.2).
- [ ] Add `.gitignore` (Node + Python: `.venv/`, `__pycache__/`, `.env`).
- [ ] Set up Vitest for unit tests.
- [ ] Add README.
- [ ] Add `SRS-PRD.md`.
- [ ] Add `PLAN.md`.

## Initial Dependencies

Keep dependencies minimal.

Frontend:

- Next.js, React, TypeScript, Tailwind CSS
- Zustand
- LiveKit client packages (`livekit-client`, `@livekit/components-react`) — Phase 6

Backend (added in Phase 6):

- `fastapi[standard]` (includes uvicorn)
- `pydantic-settings`
- `livekit-api` (token generation)
- `livekit-agents` + selected STT/LLM/TTS plugins
- `razorpay` — Phase 9
- Dev: `pytest`, `httpx`, `ruff`

Do not add libraries without a project requirement.

## Deliverable

A clean Next.js application that runs locally.

---

# 4. Phase 1 — UI Foundation

## Tasks

Build the base layout.

### Header

- [ ] Cartiva logo/name.
- [ ] Search.
- [ ] Category access.
- [ ] Cart icon/count.
- [ ] Voice assistant button.

### Homepage

- [ ] Hero section.
- [ ] Categories.
- [ ] Featured products.
- [ ] Offers.
- [ ] Grocery sections.

### Responsive Design

Support:

```text
320px
375px
768px
1024px
1280px
1440px+
```

## Deliverable

A polished grocery homepage using static/mock data.

---

# 5. Phase 2 — JSON Catalog

Create:

```text
frontend/data/
├── products.json
├── categories.json
└── offers.json
```

## Product Requirements

Start with approximately:

```text
50–100 products
```

Include enough variety for realistic voice demonstrations.

Suggested categories:

```text
Vegetables
Fruits
Dairy
Beverages
Snacks
Breakfast
Cleaning
Laundry
Personal Care
```

## Product Fields

```text
id
name
category
description
price          (integer paise, or rupees converted to paise on load)
unit
brand
stock
availableQuantity
image
tags
```

## Tasks

- [ ] Create product types.
- [ ] Create category types.
- [ ] Create offer types.
- [ ] Load JSON data (`lib/catalog`).
- [ ] Build product utility functions.
- [ ] Validate product data.

## Deliverable

Catalog is available through typed application functions.

---

# 6. Phase 3 — Product Discovery

## Search

Implement:

```text
searchProducts(query)
```

Support:

- Partial product names.
- Brand.
- Category.
- Tags.

## Filtering

Implement:

```text
filterProducts({
  query,
  category,
  minPrice,
  maxPrice,
  brand,
  available
})
```

## Navigation

Build:

```text
/category/[category]
/product/[id]
/search?q=
```

## Tasks

- [ ] Search UI.
- [ ] Category pages.
- [ ] Product detail page.
- [ ] Price filter.
- [ ] Availability filter.
- [ ] Empty results state.
- [ ] Loading state where appropriate.

## Deliverable

User can discover any catalog product manually.

---

# 7. Phase 4 — Cart & Pricing

Use Zustand for cart state, with `persist` (localStorage) so the cart survives refreshes and the return from Razorpay.

## Shared Application Actions

Build the shared action layer **in this phase**, not later (`lib/actions/`). Components call these actions; in Phase 7 the voice tools call the exact same functions via RPC.

Each action:

- Validates input (product exists, quantity is a positive integer, stock is sufficient).
- Returns a typed result: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
- Uses the shared error codes from §1.1.

## Quantity vs Unit Rule

Products are sold in units (e.g. `1 kg`). `quantity` always means **number of units**.

- "Add 2 kg potatoes" with a `1 kg` product → quantity 2.
- If both a `1 kg` and a `2 kg` product exist → ask the user which one.

## Cart Actions

```text
addToCart()
removeFromCart()
updateQuantity()
increaseQuantity()
decreaseQuantity()
clearCart()
getCart()
```

## Pricing

Implement one centralized pricing module (`lib/pricing`).

```text
calculateSubtotal()
calculateDiscount()
calculateDeliveryFee()
calculateTotal()
```

Avoid duplicating pricing calculations across components. Work in integer paise.

## Tasks

- [ ] Create cart store.
- [ ] Add product.
- [ ] Remove product.
- [ ] Quantity changes.
- [ ] Cart count.
- [ ] Cart page.
- [ ] Pricing summary.
- [ ] Offer calculation.
- [ ] Empty cart state.
- [ ] Create `frontend/data/pricing-cases.json` golden cases.
- [ ] Vitest: pricing (against golden cases), offers, cart actions, stock validation.

## Deliverable

The entire shopping flow works manually.

---

# 8. Phase 5 — Checkout UI

Create:

```text
/checkout
/order-success
```

## Checkout Flow

```text
Cart
 ↓
Checkout
 ↓
Order Summary
 ↓
Confirm
 ↓
Payment
 ↓
Success
```

## Tasks

- [ ] Checkout page.
- [ ] Order summary.
- [ ] Empty cart validation.
- [ ] Final total.
- [ ] Confirmation UI.
- [ ] Payment placeholder.
- [ ] Success page.
- [ ] Failure state.

## Important

Before payment is integrated, use a mock payment action to verify the complete UI flow.

There is no database, so the **Razorpay order ID / payment ID serves as the order reference** shown on the success page (mock: a generated ID).

## Deliverable

A complete manual shopping experience except for real payment.

---

# 9. Phase 6 — LiveKit Foundation (FastAPI + Python Agent)

Only begin this phase after the manual application works.

## Backend Setup

- [ ] Create `backend/` Python project with `uv` (Python 3.12+).
- [ ] FastAPI app with `GET /api/health`.
- [ ] `pydantic-settings` config loading `backend/.env`.
- [ ] CORS allowlist.
- [ ] pytest + ruff.
- [ ] `backend/.env.example`: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, STT/LLM/TTS provider keys, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CORS_ORIGINS`, `DATA_DIR` — placeholders only.
- [ ] Frontend `.env.example`: `BACKEND_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
- [ ] Add Next.js rewrite for `/api/livekit/*` and `/api/payment/*` → FastAPI.
- [ ] README: how to run all three processes (`npm run dev` in `frontend/`; `uv run fastapi dev app/main.py` and `uv run python -m agent.worker dev` in `backend/`).
- [ ] `DATA_DIR` defaults to `../frontend/data` so FastAPI reads the same JSON files.

## LiveKit Tasks

- [ ] Create/configure LiveKit project.
- [ ] Choose STT, LLM, and TTS providers for the agent and document the choice.
- [ ] Create `POST /api/livekit/token` in FastAPI using `livekit-api` (returns `{ token, url }`; secret never sent to the browser).
- [ ] Create the Python agent worker in `backend/agent/worker.py` and run it locally.
- [ ] Set up LiveKit client connection in the browser.
- [ ] Set up the RPC bridge (see §1.1):
  - Browser: register RPC methods in `lib/voice/` (`catalog.search`, `cart.add`, `ui.navigate`, ...) that call `lib/actions`.
  - Agent: `agent/rpc.py` with typed Python wrappers that call `perform_rpc` on the browser participant and parse the JSON result.
- [ ] Create voice assistant UI.
- [ ] Connect microphone.
- [ ] Display connection state.
- [ ] Handle connect/disconnect.
- [ ] Add reconnect behavior.
- [ ] Add basic agent speech.

## Voice UI States

Implement:

```text
IDLE
LISTENING
USER_SPEAKING
THINKING
AGENT_SPEAKING
DISCONNECTED
```

Later add:

```text
EXECUTING_ACTION
ACTION_SUCCESS
ACTION_ERROR
```

## Deliverable

User can start a LiveKit voice session and have a basic conversation.

---

# 10. Phase 7 — Voice Agent Tools

The agent must not directly manipulate arbitrary UI state.

Each tool is a Python `@function_tool` in `backend/agent/tools.py` and a thin wrapper over a shared action from Phase 4, invoked in the browser via RPC. No business logic lives in the tool itself.

## Tool 1

```text
search_products
```

Input:

```text
query
```

Output:

```text
matching products
```

## Tool 2

```text
filter_products
```

Input:

```text
query?
category?
min_price?
max_price?
brand?
available?
```

Example: "dishwashing liquids under ₹200" → `{ query: "dishwashing liquid", max_price: 200 }`.

## Tool 3

```text
navigate_category
```

Input:

```text
category
```

## Tool 4

```text
add_to_cart
```

Input:

```text
product_id
quantity
```

## Tool 5

```text
remove_from_cart
```

Input:

```text
product_id
```

## Tool 6

```text
update_cart
```

Input:

```text
product_id
quantity
```

## Tool 7

```text
get_cart
```

## Tool 8

```text
get_cart_total
```

## Tool 9

```text
start_checkout
```

This should NOT directly start payment.

It should validate checkout, set `pending_confirmation`, and return a confirmation-required state with the final total.

## Tool 10

```text
confirm_payment
```

Only valid while `pending_confirmation` is set (rejected otherwise). Asks the browser to open Razorpay checkout. Called only after an explicit "yes / proceed / pay now / confirm".

## Tool 11

```text
cancel_pending_action
```

Clears `pending_confirmation` (checkout or partial-stock confirmation). Handles "cancel", "no", "wait", "never mind".

## Tool 12

```text
open_product
```

Input:

```text
product_id
```

Navigates to the product detail page ("show me that one").

## Deliverable

The voice agent can perform real shopping actions.

---

# 11. Phase 8 — Context & Conversation Intelligence

This is one of the most important phases.

## Context

Maintain (in `backend/agent/context.py`, held as session user-data in the agent):

```text
current_category
last_search
last_displayed_products
last_referenced_product
current_cart
last_action
pending_confirmation
```

`current_category`, `last_displayed_products`, and `current_cart` come from the **browser** (pushed on change via the bridge in §1.1), so they stay correct when the user browses or edits the cart manually. `last_referenced_product`, `last_action`, and `pending_confirmation` are maintained by the agent session.

## Example

```text
User:
Show me dishwashing liquids under ₹200.

Agent:
Displays 4 products.

User:
Which is cheapest?

Agent:
Identifies product B.

User:
Add that one.

Agent:
Adds product B.
```

The agent must know what "that one" means.

## Ambiguity

Example:

```text
User:
Add Surf Excel.
```

If multiple matches exist:

```text
Ask user to choose.
```

Do not randomly select.

## Quantity Context

Example:

```text
User:
Add 1 kg potatoes.

User:
Make that two.
```

Agent should resolve "that" to potatoes if context is unambiguous.

## Cancellation

Support:

```text
Cancel that.
Stop.
Never mind.
Don't add it.
```

## Interruption

Agent speaking:

```text
Agent:
The cheapest product is—

User:
Wait, show me something cheaper.
```

The current response should be interrupted and the new request processed.

## Deliverable

Voice interaction feels conversational rather than command-only.

---

# 12. Phase 9 — Razorpay Payment (FastAPI)

Before implementing, verify the current Razorpay API requirements and server-side flow.

Use the standard flow: **Orders API (FastAPI) → Checkout.js (browser) → signature verification (FastAPI)**. Use the official `razorpay` Python SDK. Razorpay MCP is optional and, if used at all, is for developer tooling — the voice agent never calls payment APIs directly.

## Server-Side Rules

- `POST /api/payment/create-order` accepts only `{ items: [{ productId, quantity }] }`. It re-reads prices, stock and offers from `frontend/data/*.json` and recomputes the total with `backend/app/pricing.py`. A client-sent total is never trusted.
- `backend/app/pricing.py` must pass the same `frontend/data/pricing-cases.json` golden tests as `lib/pricing`.
- `POST /api/payment/verify` verifies the Razorpay HMAC-SHA256 signature (`order_id|payment_id` with the key secret) using the SDK's `utility.verify_payment_signature` (or `hmac.compare_digest`).
- Secrets stay in `backend/.env`; only the Razorpay key ID reaches the browser.

## Payment Architecture

```text
Cart
 ↓
Checkout (total from lib/pricing)
 ↓
Explicit user confirmation
 ↓
FastAPI create-order (recomputes total from JSON)
 ↓
Razorpay Checkout (browser)
 ↓
Payment
 ↓
FastAPI verify (signature check)
 ↓
Success / Failure
```

## Tasks

- [ ] Verify current Razorpay integration requirements.
- [ ] Configure server-side secrets.
- [ ] `backend/app/catalog.py` (read-only JSON loader) + `backend/app/pricing.py`.
- [ ] pytest: Python pricing passes `frontend/data/pricing-cases.json`.
- [ ] Create order request.
- [ ] Open Razorpay checkout.
- [ ] Handle success callback/result.
- [ ] Verify payment.
- [ ] Handle failure.
- [ ] Implement retry.
- [ ] Clear cart only after verified success.
- [ ] Show order success.
- [ ] Notify the agent of the payment result so it can announce success/failure.

## Critical Rule

Never treat:

```text
Checkout opened
```

as:

```text
Payment successful
```

Only verified payment success can create the successful order state.

## Deliverable

A working payment flow.

---

# 13. Phase 10 — Edge Cases & Error Handling

## Product Errors

- [ ] Product not found.
- [ ] No search results.
- [ ] Product unavailable.
- [ ] Partial stock.
- [ ] Invalid quantity.
- [ ] Ambiguous product.

## Cart Errors

- [ ] Empty cart.
- [ ] Product removed elsewhere.
- [ ] Invalid cart quantity.

## Backend Errors

- [ ] FastAPI unreachable (voice/payment show a retryable error; manual shopping keeps working).
- [ ] Consistent error response shape: `{ error: { code, message } }`.
- [ ] Total mismatch between UI and `create-order` (show the server total and ask the user to confirm again).

## Voice Errors

- [ ] Microphone denied.
- [ ] LiveKit connection failure.
- [ ] Agent unavailable.
- [ ] Tool failure.
- [ ] RPC timeout (browser tab closed / unresponsive).
- [ ] User interruption.
- [ ] Unclear request.

## Payment Errors

- [ ] Payment cancelled.
- [ ] Payment failed.
- [ ] Verification failed.
- [ ] Network failure.
- [ ] Retry.

## Deliverable

Every important failure has a useful user-facing response.

---

# 14. Phase 11 — Testing

## Frontend Tests (Vitest)

- [ ] Pricing: subtotal, discount, delivery fee, total (against `frontend/data/pricing-cases.json`).
- [ ] Offers: only valid offers applied; minimum amount respected.
- [ ] Cart actions: add/remove/update, invalid quantity, partial stock.
- [ ] Search/filter: partial matching, price range, availability.
- [ ] RPC handlers return the same results as the manual actions.

## Backend Tests (pytest)

- [ ] Python pricing passes `frontend/data/pricing-cases.json`.
- [ ] `create-order` recomputes the total server-side and ignores client totals.
- [ ] Signature verification accepts valid / rejects tampered.
- [ ] LiveKit token endpoint returns a token without leaking the secret.
- [ ] Voice tools: `confirm_payment` rejected without `pending_confirmation` (RPC layer mocked).

## Manual UI Testing

Test:

- [ ] Search.
- [ ] Category navigation.
- [ ] Product detail.
- [ ] Add to cart.
- [ ] Remove.
- [ ] Quantity update.
- [ ] Pricing.
- [ ] Checkout.
- [ ] Payment.
- [ ] Success/failure.

## Voice Testing

Test exact demo scenarios.

### Scenario 1

```text
Show me vegetables.
```

Expected:

Vegetables displayed.

### Scenario 2

```text
Add 1 kg tomatoes.
```

Expected:

Tomatoes added.

### Scenario 3

```text
Show me dishwashing liquids under ₹200.
```

Expected:

Matching products displayed.

### Scenario 4

```text
Which one is cheapest?
```

Expected:

Cheapest displayed matching product identified.

### Scenario 5

```text
Add that one.
```

Expected:

Previously referenced product added.

### Scenario 6

```text
What's my bill?
```

Expected:

Correct subtotal, discount, delivery, and total.

### Scenario 7

```text
Checkout.
```

Expected:

Agent asks for explicit confirmation.

### Scenario 8

```text
No.
```

Expected:

Payment does not start.

### Scenario 9

```text
Yes.
```

Expected:

Payment flow starts.

### Scenario 10

Interrupt agent speech.

Expected:

Agent stops/handles interruption and processes new request.

---

# 15. Phase 12 — UI Polish

## Tasks

- [ ] Improve product cards.
- [ ] Improve cart UI.
- [ ] Add voice animation.
- [ ] Add transcript display.
- [ ] Add action indicators.
- [ ] Improve mobile layout.
- [ ] Add skeleton/loading states.
- [ ] Add empty states.
- [ ] Add error states.
- [ ] Add accessible labels.
- [ ] Add keyboard support.
- [ ] Verify responsive layouts.

## Voice Experience

Make the voice interaction visually obvious:

```text
🎤 Listening...
✨ Thinking...
🛒 Adding to cart...
✓ Added to cart
🔊 Speaking...
```

---

# 16. Phase 13 — Deployment

## Before Deployment

- [ ] Frontend production build succeeds.
- [ ] FastAPI starts with production settings (`fastapi run`, no reload).
- [ ] Environment variables configured for all three services.
- [ ] CORS allowlist and `BACKEND_URL` set to production URLs.
- [ ] `frontend/data/*.json` available to the FastAPI deployment (copied into the image or `DATA_DIR` set).
- [ ] No secrets in repository.
- [ ] Payment test mode verified.
- [ ] LiveKit production configuration verified.
- [ ] Responsive testing completed.
- [ ] Error states tested.
- [ ] README updated.

## Deployment Targets

| Service | Host |
|---------|------|
| Next.js frontend | Vercel (or similar) — Root Directory: `frontend` |
| FastAPI backend | Render, Railway, Fly.io — Root Directory: `backend` |
| Agent worker | LiveKit Cloud Agents, Railway, Fly.io — any host for long-running processes (not Vercel) |

FastAPI and the agent worker can share one Docker image with different start commands.

## Deployment Checklist

```text
[ ] GitHub
[ ] Frontend hosting
[ ] FastAPI hosting
[ ] Agent worker hosting
[ ] LiveKit
[ ] Razorpay
[ ] Environment variables
[ ] Build
[ ] Smoke test (frontend → FastAPI → agent)
```

---

# 17. Recommended Implementation Order

Follow this exact order unless a technical dependency requires otherwise:

```text
1. Next.js setup
        ↓
2. Layout + UI
        ↓
3. JSON data
        ↓
4. Product search/filter
        ↓
5. Product details
        ↓
6. Zustand cart + shared application actions
        ↓
7. Pricing/offers (+ golden test cases + Vitest)
        ↓
8. Checkout UI (mock payment)
        ↓
9. FastAPI setup + LiveKit token endpoint + Python agent worker
        ↓
10. RPC bridge + voice UI states
        ↓
11. Voice tools (wrapping shared actions)
        ↓
12. Checkout confirmation tools
        ↓
13. Conversation context
        ↓
14. Ambiguity + interruption
        ↓
15. Razorpay (FastAPI + Python pricing port)
        ↓
16. Error handling
        ↓
17. Testing
        ↓
18. Polish
        ↓
19. Deployment
```

---

# 18. Git Commit Strategy

Use small meaningful commits.

Suggested sequence:

```text
chore: initialize nextjs project
feat: add base application layout
feat: add grocery categories
feat: add product catalog
feat: add product search
feat: add product filtering
feat: add product details
feat: add cart store
feat: add shared cart actions
feat: add cart interactions
feat: add pricing and offers
test: add pricing and cart action tests
feat: add checkout flow
chore: initialize fastapi backend
feat: add livekit token endpoint
feat: add python livekit agent worker
feat: integrate livekit voice session
feat: add voice rpc bridge
feat: add voice assistant states
feat: add product search voice tool
feat: add cart voice tools
feat: add voice conversation context
feat: handle ambiguous voice requests
feat: add checkout confirmation
feat: add razorpay order and verify endpoints
feat: integrate razorpay checkout
fix: handle payment failure
fix: handle voice interruption
test: add shopping flow tests
style: polish responsive shopping ui
docs: update readme
```

---

# 19. Definition of Done

A phase is done only when:

1. Feature works manually where applicable.
2. UI is responsive.
3. Errors are handled.
4. TypeScript has no avoidable errors; Python passes ruff.
5. Code is reusable.
6. Feature does not break previous functionality.
7. Relevant test scenario passes (Vitest / pytest).
8. Git commit is created.

---

# 20. MVP Definition

The first portfolio-ready MVP should support:

```text
Manual Shopping
    +
Product Search
    +
Product Filtering
    +
Cart
    +
Pricing
    +
Checkout
    +
LiveKit Voice
    +
Voice Tool Calling
    +
Conversation Context
    +
Razorpay
```

The complete demo should be:

```text
User
 ↓
"Show me vegetables."
 ↓
Products appear
 ↓
"Add 1 kg tomatoes and 2 kg potatoes."
 ↓
Cart updates
 ↓
"Show me dishwashing liquids under ₹200."
 ↓
Products filter
 ↓
"Which is cheapest?"
 ↓
Agent answers
 ↓
"Add that one."
 ↓
Cart updates
 ↓
"What's my bill?"
 ↓
Agent gives total
 ↓
"Checkout."
 ↓
Agent asks confirmation
 ↓
"Yes."
 ↓
Razorpay
 ↓
Payment
 ↓
Verified success
 ↓
Order Success
```

---

# 21. Portfolio Demo Goal

The project should demonstrate this statement:

> **Cartiva is not a voice chatbot. It is a real grocery shopping application where AI voice is an additional interface for discovering products, managing the cart, and completing checkout.**

The strongest demo should show the same action being possible through both:

```text
🖱️ Manual UI
       +
🎙️ Voice AI
```

while both operate on the same application state.
