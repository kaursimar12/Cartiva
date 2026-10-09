# Cartiva — Product Requirements Document

| | |
|---|---|
| **Product** | Cartiva — Intelligent Grocery Shopping Platform |
| **Repository** | `cartiva-ai` |
| **Version** | 2.0 |
| **Date** | October 2026 |
| **Status** | Manual shopping MVP built · Voice + payment in progress |
| **Related docs** | [SRS-PRD.md](SRS-PRD.md) (original requirements) · [PLAN.md](PLAN.md) (phased build plan) · [CLAUDE.md](CLAUDE.md) (architecture rules) |

> Diagrams are written in Mermaid. They render on GitHub and in VS Code (with a Mermaid preview extension).

---

## 1. Overview

### 1.1 Problem

Grocery apps make users browse, search and tap through many screens to build a basket. Voice assistants exist, but most are chatbots bolted onto an app — they talk *about* the store instead of operating it, and their state drifts from what the screen shows.

### 1.2 Product

Cartiva is a grocery web app that can be used two ways, at any moment, on the same cart:

- **Manual** — browse categories, search, filter, add to cart, check out.
- **Voice** — speak naturally ("add 2 kg potatoes", "which one is cheapest?", "checkout") and a real-time AI agent performs the same actions in the app.

### 1.3 Core principle

> **Cartiva is not a voice chatbot. It is a grocery shopping application with voice as an additional interface.**

Both interfaces call the **same controllers and services** and change the **same state**. Anything the voice agent does is visible in the UI immediately, and anything the user does manually is known to the agent.

---

## 2. Goals, Non-Goals and Success Metrics

### 2.1 Goals

| # | Goal |
|---|---|
| G1 | A polished, responsive grocery store that works fully without voice. |
| G2 | Real-time voice shopping via LiveKit that operates the app through approved tools. |
| G3 | One source of truth for catalog, cart, pricing and checkout rules. |
| G4 | Safe conversational behaviour: no guessing on ambiguity, no payment without explicit confirmation. |
| G5 | Razorpay payment with server-side verification. |
| G6 | Clean, explainable architecture (MVC + SOLID) suitable for a portfolio review. |

### 2.2 Non-Goals (v1)

- Database, user accounts or authentication.
- Real inventory, warehouse or delivery tracking.
- Multi-vendor marketplace or recommendation models.
- Autonomous payment without user confirmation.

### 2.3 Success metrics

| Metric | Target |
|---|---|
| End-to-end demo (browse → voice → checkout → verified payment) | Completes without manual workaround |
| Voice tool success on the demo script (§14) | 10 / 10 |
| UI reflects a voice action | < 500 ms after the tool returns |
| Ambiguous request resolved by guessing | 0 occurrences |
| Payment started without explicit "yes" | 0 occurrences |
| Lighthouse accessibility score | ≥ 90 |
| Layout from 320 px to 1440 px+ | No horizontal scroll, no overlap |

---

## 3. Users

| Persona | Need | How Cartiva serves it |
|---|---|---|
| **Quick shopper** | Fill a basket fast | Category rails, search, one-tap "Add" that becomes a stepper |
| **Hands-busy shopper** | Shop while cooking or multitasking | Voice commands with spoken confirmations |
| **Careful shopper** | Know what they pay | Live bill breakdown, offer hints, explicit confirmation before payment |
| **Reviewer / recruiter** | Judge engineering quality | Visible MVC layers, typed action results, shared state between voice and UI |

---

## 4. Scope and Release Status

| Area | Feature | Status |
|---|---|---|
| Catalog | 67 products, 9 categories, 4 offers in JSON | ✅ Done |
| Discovery | Home, category pages, product detail, search, filters, sort | ✅ Done |
| Cart | Add / remove / steppers / clear, stock limits, persisted in localStorage | ✅ Done |
| Pricing | Subtotal, per-category and cart-wide offers, delivery fee, offer hints | ✅ Done |
| Checkout | Validation, explicit confirmation, mock payment, failure + retry, order success page | ✅ Done (mock gateway) |
| Design | Monochrome grey / black theme, responsive, accessible | ✅ Done |
| Backend | FastAPI skeleton (`GET /api/health`) | 🟡 Started |
| Voice | LiveKit session, agent worker, RPC bridge, voice states | ⬜ Phase 6 |
| Voice tools | 12 tools over shared services | ⬜ Phase 7 |
| Context | References, ambiguity, cancellation, interruption | ⬜ Phase 8 |
| Payment | Razorpay order + Checkout.js + signature verification | ⬜ Phase 9 |
| Quality | Vitest + pytest, shared golden pricing cases | ⬜ Phase 11 |

---

## 5. System Architecture

Cartiva has three runtime parts and no database.

| Part | Tech | Responsibility |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Zustand | UI, JSON catalog, search/filter, cart state, pricing, checkout flow, RPC handlers for the agent, Razorpay Checkout.js |
| **Backend** | Python 3.12, FastAPI | LiveKit token, Razorpay order creation (total recomputed server-side), payment signature verification |
| **Agent worker** | Python, LiveKit Agents | Speech-to-text → LLM → text-to-speech, voice tools, conversation context |

```mermaid
flowchart LR
    User(["👤 User"])

    subgraph Browser["Browser — Next.js"]
        UI["Views<br/>pages + components"]
        CTRL["Controllers"]
        SVC["Services<br/>catalog · pricing · cart · checkout"]
        STORE[("Zustand stores<br/>cart · last order")]
        RPC["Voice RPC handlers<br/>(Phase 6)"]
        RZP["Razorpay Checkout.js<br/>(Phase 9)"]
    end

    DATA[("data/*.json<br/>products · categories · offers")]

    subgraph Backend["FastAPI — Python"]
        TOKEN["POST /api/livekit/token"]
        ORDER["POST /api/payment/create-order"]
        VERIFY["POST /api/payment/verify"]
    end

    subgraph LK["LiveKit Cloud"]
        ROOM(("Room<br/>audio + data"))
    end

    subgraph Agent["Agent worker — Python"]
        PIPE["STT → LLM → TTS"]
        TOOLS["Voice tools"]
        CTX["Session context"]
    end

    RAZORPAY[["Razorpay API"]]

    User -- "taps / typing" --> UI
    User -- "voice" --> ROOM
    UI --> CTRL --> SVC --> STORE
    SVC -. "reads" .-> DATA
    RPC --> CTRL

    UI -- "get token" --> TOKEN
    UI <-- "audio + RPC" --> ROOM
    ROOM <--> PIPE
    PIPE --> TOOLS
    TOOLS <--> CTX
    TOOLS -- "perform_rpc" --> ROOM
    ROOM -- "RPC request" --> RPC

    RZP -- "create order" --> ORDER
    ORDER -. "reads" .-> DATA
    ORDER --> RAZORPAY
    RZP --> RAZORPAY
    RZP -- "signature" --> VERIFY
```

### 5.1 Architecture rules

1. **The agent never owns a cart or catalog.** Every voice tool calls a browser RPC method, which calls the same controller/service the manual UI uses.
2. **The browser pushes UI context to the agent** (current category, displayed products, cart snapshot) so "the cheapest one" works after manual browsing.
3. **The browser reports payment results to the agent** so it can announce success or failure.
4. **The agent never executes payment.** It can only ask the browser to open checkout after explicit confirmation.
5. **FastAPI owns all secrets.** The browser only receives a LiveKit token and the Razorpay key ID.
6. **Payment totals are recomputed on the server** from `data/*.json`. A client-sent total is never trusted.

---

## 6. Code Architecture — MVC + SOLID

The frontend follows strict MVC layering. Mutations always flow **View → Controller → Service → Storage interface → Store**.

```mermaid
flowchart TB
    subgraph V["View layer — app/ · components/ · hooks/"]
        Pages["Pages<br/>home · category · product · search<br/>cart · checkout · order-success"]
        Comps["Components<br/>ProductCard · ProductBrowser · CartView<br/>CheckoutView · Header · VoiceButton"]
        Hooks["Hooks (read-only view models)<br/>useCart · useCartQuantity"]
    end

    subgraph C["Controller layer — controllers/"]
        CartC["cartController"]
        CheckC["checkoutController"]
        VoiceC["voice RPC handlers (Phase 6)"]
    end

    subgraph S["Service layer — services/"]
        Catalog["CatalogService<br/>search · filter · sort"]
        Pricing["PricingService<br/>+ DiscountStrategy per type"]
        CartS["CartService<br/>stock + quantity rules"]
        Checkout["CheckoutService<br/>validate · pay · build order"]
        Gateway["PaymentGateway interface<br/>Mock → Razorpay"]
    end

    subgraph M["Model layer — models/"]
        Entities["Entities<br/>Product · Category · Offer · CartItem · Order"]
        RepoI["Interfaces<br/>ProductRepository · CategoryRepository<br/>OfferRepository · CartStorage · OrderStorage"]
        RepoJ["JSON repositories"]
        RepoZ["Zustand storage adapters"]
    end

    subgraph ST["State — store/"]
        CartStore[("cart-store<br/>localStorage")]
        OrderStore[("order-store<br/>sessionStorage")]
        Toast[("toast-store")]
    end

    Wiring["lib/container.ts · lib/client-container.ts<br/>composition root"]

    Pages --> Comps --> Hooks
    Comps --> CartC & CheckC
    Hooks -. "read" .-> Pricing
    Pages -. "read" .-> Catalog
    VoiceC --> CartS & Catalog & Checkout
    CartC --> CartS
    CheckC --> Checkout
    CartS --> RepoI
    Checkout --> Pricing & Gateway & RepoI
    Pricing --> RepoI
    Catalog --> RepoI
    RepoI --> Entities
    RepoJ -. "implements" .-> RepoI
    RepoZ -. "implements" .-> RepoI
    RepoZ --> CartStore & OrderStore
    CartC --> Toast
    Wiring -. "builds" .-> S
    Wiring -. "builds" .-> RepoJ & RepoZ
```

| Principle | How it is applied |
|---|---|
| **S** — Single responsibility | Repositories only read data, services only hold rules, stores only hold state, views only render. |
| **O** — Open/closed | New discount type = new `DiscountStrategy`. Razorpay = new `PaymentGateway`. No existing class changes. |
| **L** — Liskov substitution | `MockPaymentGateway` and the future `RazorpayPaymentGateway` are interchangeable; JSON repositories can be swapped for database repositories. |
| **I** — Interface segregation | Small interfaces: `ProductRepository`, `OfferRepository`, `CartStorage`, `OrderStorage`, `PaymentGateway`. |
| **D** — Dependency inversion | Services receive interfaces through constructors; only the composition root knows concrete classes. |

### 6.1 Repository layout

```text
cartiva-ai/
├── app/                     # View — routes (App Router)
├── components/              # View — UI components
├── hooks/                   # View — read-only view models
├── controllers/             # Controller — UI / voice entry points
├── services/                # Business rules
│   ├── catalog-service.ts
│   ├── cart-service.ts
│   ├── checkout-service.ts
│   ├── pricing/             # PricingService + discount strategies
│   └── payment/             # PaymentGateway + MockPaymentGateway
├── models/
│   ├── entities/            # Product, Category, Offer, Cart, Order
│   └── repositories/        # interfaces, JSON repos, Zustand adapters, validator
├── store/                   # Zustand state containers
├── lib/                     # container.ts, client-container.ts, format.ts
├── types/                   # cross-cutting: ActionResult, VoiceState
├── data/                    # products.json, categories.json, offers.json
└── backend/                 # Python (uv): FastAPI app + LiveKit agent worker
```

---

## 7. Complete Flow Diagrams

### 7.1 Master flow — one app, two interfaces

```mermaid
flowchart TD
    Start(["User opens Cartiva"]) --> Home["Home page<br/>categories · offers · featured"]
    Home --> Mode{"How does the user<br/>shop right now?"}

    Mode -- "Taps / types" --> Manual["Manual UI event<br/>Add · Search · Filter · Stepper"]
    Mode -- "Presses Ask Cartiva" --> Voice["Voice session<br/>LiveKit room + agent"]
    Voice --> Speak["User speaks a request"]
    Speak --> AgentStep["Agent understands intent<br/>and resolves context"]
    AgentStep --> Clear{"Request clear<br/>and in scope?"}
    Clear -- "No" --> Clarify["Agent asks a<br/>clarifying question"] --> Speak
    Clear -- "Yes" --> Tool["Agent calls an approved tool"]
    Tool --> RPC["RPC to browser"]

    Manual --> Controller["Controller"]
    RPC --> Controller
    Controller --> Service["Service applies rules<br/>stock · quantity · pricing"]
    Service --> Result{"ActionResult ok?"}
    Result -- "Yes" --> State["Shared state updated<br/>(cart store)"]
    Result -- "No" --> ErrorStep["Typed error<br/>NOT_FOUND · OUT_OF_STOCK · PARTIAL_STOCK"]
    State --> UIUpdate["UI re-renders instantly"]
    ErrorStep --> Feedback
    UIUpdate --> Feedback["Feedback<br/>toast (manual) · spoken reply (voice)"]
    Feedback --> More{"Done shopping?"}
    More -- "No" --> Mode
    More -- "Yes" --> Checkout["Checkout<br/>validate cart"]

    Checkout --> Valid{"Cart valid?"}
    Valid -- "No" --> FixCart["Show reason<br/>back to cart"] --> Mode
    Valid -- "Yes" --> Confirm{"Explicit confirmation?<br/>Proceed to payment / Yes"}
    Confirm -- "No / Cancel / Wait" --> Mode
    Confirm -- "Yes" --> Pay["Payment<br/>Razorpay (mock today)"]
    Pay --> Verified{"Verified<br/>success?"}
    Verified -- "No" --> Failed["Failure state<br/>cart kept · Retry · Back to cart"] --> Confirm
    Verified -- "Yes" --> Success(["Order success<br/>reference shown · cart cleared<br/>agent announces order"])
```

### 7.2 Route and navigation map

```mermaid
flowchart LR
    H["/ (Home)"] --> C["/category/[category]"]
    H --> P["/product/[id]"]
    H --> S["/search?q="]
    HD["Header on every page<br/>search · categories · voice · cart"] --> S & C & K
    C --> P
    S --> P
    P --> P2["Related products"] --> P
    C & S & P & H -- "Add / steppers" --> K["/cart"]
    K --> CO["/checkout"]
    CO -- "edit" --> K
    CO -- "verified payment" --> OS["/order-success"]
    OS -- "Continue shopping" --> H
    X["Unknown route or product"] --> NF["404 page"] --> H
```

### 7.3 Manual shopping journey

```mermaid
journey
    title Manual shopping journey
    section Discover
      Open home page: 5: User
      Pick a category or search: 5: User
      Filter by price, brand, stock: 4: User
    section Choose
      Open product detail: 4: User
      Pick quantity and add: 5: User
      Adjust with steppers on cards: 5: User
    section Review
      Open cart and see bill: 5: User
      See offer and free delivery hints: 4: User
    section Pay
      Place order and confirm total: 4: User
      Pay and see order reference: 5: User
```

### 7.4 Add-to-cart rule flow (shared by UI and voice)

```mermaid
flowchart TD
    A["CartService.add(productId, quantity)"] --> Q{"quantity is a whole<br/>number ≥ 1?"}
    Q -- "No" --> E1["INVALID_QUANTITY"]
    Q -- "Yes" --> F{"Product exists?"}
    F -- "No" --> E2["NOT_FOUND"]
    F -- "Yes" --> S{"In stock?"}
    S -- "No" --> E3["OUT_OF_STOCK"]
    S -- "Yes" --> L{"inCart + quantity<br/>≤ availableQuantity?"}
    L -- "No" --> E4["PARTIAL_STOCK<br/>+ available count"]
    L -- "Yes" --> W["CartStorage.setItems()"]
    W --> OK["ok: true<br/>Added 2 × Potato (1 kg) to your cart."]

    E4 --> V{"Called by voice?"}
    V -- "Yes" --> Ask["Agent: Only 2 are available.<br/>Would you like me to add those 2?"]
    Ask --> Yes{"User confirms?"}
    Yes -- "Yes" --> A2["add(productId, available)"] --> A
    Yes -- "No" --> Stop["Nothing changes"]
    V -- "No" --> ToastStep["Toast shows the message"]
```

### 7.5 Voice session lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser (Next.js)
    participant F as FastAPI
    participant L as LiveKit Cloud
    participant A as Agent worker

    U->>B: Press "Ask Cartiva"
    B->>B: Request microphone permission
    alt Microphone denied
        B-->>U: "Microphone access is needed for voice"
    else Granted
        B->>F: POST /api/livekit/token
        F-->>B: token + url
        B->>L: Join room (audio + data)
        L->>A: Dispatch agent to room
        A->>L: Join room
        B->>B: Register RPC methods (catalog, cart, ui, checkout)
        B->>A: Push UI context (category, displayed products, cart)
        A-->>U: "Hi! What would you like to buy today?"
        Note over B,A: Voice state LISTENING
    end
    opt Connection drops
        L-->>B: Disconnected
        B-->>U: "Connection lost" + Reconnect button
    end
```

### 7.6 Voice command → tool → shared action

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant A as Agent (STT, LLM, TTS)
    participant T as Voice tool
    participant B as Browser RPC handler
    participant C as Controller / Service
    participant Z as Cart store
    participant V as UI

    U->>A: "Add 2 kg potatoes"
    Note over A: Voice state THINKING
    A->>T: search_products("potatoes")
    T->>B: perform_rpc catalog.search
    B->>C: CatalogService.search
    C-->>B: [Potato 1 kg]
    B-->>T: ok + data
    Note over A: Unit rule - 1 kg pack x 2
    A->>T: add_to_cart(p004, 2)
    Note over A: Voice state EXECUTING_ACTION
    T->>B: perform_rpc cart.add
    B->>C: CartService.add(p004, 2)
    C->>Z: setItems(...)
    Z-->>V: re-render (badge, steppers, bill)
    C-->>B: ok + message
    B-->>T: result
    Note over A: ACTION_SUCCESS then AGENT_SPEAKING
    A-->>U: "Added 2 kg of potatoes. Your total is ₹100."
    Note over A: Voice state LISTENING
```

### 7.7 Context, ambiguity and references

```mermaid
flowchart TD
    R["User request"] --> Scope{"Shopping related?"}
    Scope -- "No" --> OOS["I can help you search products,<br/>manage your cart, or checkout."]
    Scope -- "Yes" --> Ref{"Uses a reference?<br/>that one · make that two · the cheapest"}
    Ref -- "Yes" --> Ctx{"Context resolves it<br/>to exactly one product?"}
    Ctx -- "No" --> AskRef["Ask: Which product do you mean?"]
    Ctx -- "Yes" --> Act
    Ref -- "No" --> Search["search / filter tools"]
    Search --> N{"Number of matches"}
    N -- "0" --> NoneStep["I couldn't find that product.<br/>Would you like similar options?"]
    N -- "2 or more" --> Amb["List options, never guess<br/>Surf Excel Matic 1 kg, Matic 2 kg,<br/>or Easy Wash 1 kg?"]
    Amb --> Choice["User picks one"] --> Act
    N -- "1" --> Act["Run tool"]
    Act --> Upd["Update context<br/>lastReferencedProduct · lastAction"]
```

**Context the agent keeps** (`backend/agent/context.py`):

| Field | Source | Example |
|---|---|---|
| `currentCategory` | Browser push | `cleaning` |
| `lastSearch` | Agent | `"dishwashing liquid"` with max ₹200 |
| `lastDisplayedProducts` | Browser push | 4 products on screen |
| `currentCart` | Browser push | items + pricing snapshot |
| `lastReferencedProduct` | Agent | `p045` (cheapest) |
| `lastAction` | Agent | `add_to_cart(p004, 1)` |
| `pendingConfirmation` | Agent | `{ type: "checkout", total: 495 }` |

The agent never invents context. If a reference can't be resolved to exactly one product, it asks.

### 7.8 Voice assistant state machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> LISTENING: connect
    LISTENING --> USER_SPEAKING: speech detected
    USER_SPEAKING --> THINKING: end of turn
    THINKING --> EXECUTING_ACTION: tool call
    THINKING --> AGENT_SPEAKING: reply only
    EXECUTING_ACTION --> ACTION_SUCCESS: ok
    EXECUTING_ACTION --> ACTION_ERROR: error or timeout
    ACTION_SUCCESS --> AGENT_SPEAKING
    ACTION_ERROR --> AGENT_SPEAKING
    AGENT_SPEAKING --> LISTENING: finished
    AGENT_SPEAKING --> USER_SPEAKING: user interrupts
    LISTENING --> DISCONNECTED: connection lost
    THINKING --> DISCONNECTED: connection lost
    DISCONNECTED --> LISTENING: reconnect
    LISTENING --> IDLE: user ends session
```

| State | UI label |
|---|---|
| IDLE | 🎤 Ask Cartiva |
| LISTENING | 🎤 Listening… |
| USER_SPEAKING | 🎤 Listening… (live transcript) |
| THINKING | ✨ Thinking… |
| EXECUTING_ACTION | 🛒 Adding to cart… |
| ACTION_SUCCESS | ✓ Added to cart |
| ACTION_ERROR | ⚠ Something went wrong |
| AGENT_SPEAKING | 🔊 Speaking… |
| DISCONNECTED | ⚠ Connection lost · Reconnect |

### 7.9 Checkout confirmation states (implemented)

```mermaid
stateDiagram-v2
    [*] --> Review
    Review --> Blocked: validation fails (empty, out of stock, over stock)
    Blocked --> [*]: back to cart
    Review --> Confirm: Place order
    Confirm --> Review: Cancel
    Confirm --> Processing: Proceed to payment
    Processing --> Failed: declined or not verified
    Failed --> Confirm: Retry payment
    Failed --> [*]: Back to cart
    Processing --> Success: verified
    Success --> [*]: save order, clear cart, open order-success
```

### 7.10 Checkout and payment — voice + Razorpay (Phase 9)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant A as Agent
    participant B as Browser
    participant F as FastAPI
    participant R as Razorpay

    U->>A: "Checkout"
    A->>B: RPC checkout.validate
    B-->>A: ok, total 495
    A->>A: pendingConfirmation = checkout
    A-->>U: "Your total is ₹495. Would you like to proceed to payment?"

    alt User says No / Wait / Cancel
        U->>A: "No"
        A->>A: cancel_pending_action
        A-->>U: "Okay, I won't start the payment."
    else User says Yes / Proceed / Pay now
        U->>A: "Yes"
        A->>B: RPC checkout.openPayment (only if pending)
        B->>F: POST /api/payment/create-order (productId + quantity only)
        F->>F: Re-read data/*.json and recompute total
        F->>R: Create order (amount in paise)
        R-->>F: order_id
        F-->>B: order_id, amount, key_id
        B->>R: Open Checkout.js
        U->>R: Completes payment
        R-->>B: payment_id + signature
        B->>F: POST /api/payment/verify
        F->>F: HMAC(order_id | payment_id, key secret)
        alt Signature valid
            F-->>B: verified = true
            B->>B: Save order, clear cart, go to /order-success
            B->>A: payment result = success
            A-->>U: "Your payment was successful and your order has been placed."
        else Invalid, failed or cancelled
            F-->>B: verified = false
            B->>B: Keep cart, show failure + Retry
            B->>A: payment result = failed
            A-->>U: "The payment didn't go through. Want to try again?"
        end
    end
```

---

## 8. Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-01 | Homepage: header, search, categories, featured products, offers, cart access, voice control | ✅ |
| FR-02 | Product catalog loaded from JSON (id, name, category, description, price, unit, brand, stock, availableQuantity, image, tags) | ✅ |
| FR-03 | Category list, category pages, navigation between categories | ✅ |
| FR-04 | Partial-match search by name, brand, category, tags (handles plurals) | ✅ |
| FR-05 | Filter by query, category, price range, brand, availability; sort | ✅ |
| FR-06 | Product detail: image, name, brand, price, unit, description, availability, quantity selector, add to cart | ✅ |
| FR-07 | Cart: add, remove, increase, decrease, update, clear, subtotal, discounts, delivery fee, total | ✅ |
| FR-08 | One cart shared by UI and voice | ✅ UI · ⬜ voice |
| FR-09 | Deterministic pricing in the service layer | ✅ |
| FR-10 | Offers from JSON; only active, eligible offers apply | ✅ |
| FR-11 | LiveKit voice connection with visible status | ⬜ |
| FR-12 | Voice states (§7.8) | ⬜ (types defined) |
| FR-13 | Natural commands: search, category, filter, add, remove, quantity, cart, bill, checkout, cancel | ⬜ |
| FR-14 | Approved tool set only (§9) | ⬜ |
| FR-15 | Session context (§7.7); never invent context | ⬜ |
| FR-16 | Contextual references ("that one", "make that two", "the cheapest") | ⬜ |
| FR-17 | Ambiguous products → ask, never pick randomly | ⬜ |
| FR-18 | Partial stock → offer the available quantity and wait for confirmation | ✅ rule · ⬜ voice |
| FR-19 | Empty search → say so and offer alternatives | ✅ UI · ⬜ voice |
| FR-20 | Out-of-scope requests → redirect to shopping help | ⬜ |
| FR-21 | Interruption during agent speech | ⬜ |
| FR-22 | Checkout validation: non-empty, valid quantities, available stock, total calculated | ✅ |
| FR-23 | Explicit confirmation before payment | ✅ UI · ⬜ voice |
| FR-24 – FR-25 | Razorpay order → checkout → verification | ⬜ (mock gateway in place) |
| FR-26 | On verified success: success screen, order reference, clear cart, agent confirms | ✅ UI · ⬜ agent |
| FR-27 | On failure: not marked paid, failure state, retry, return to cart | ✅ |

---

## 9. Voice Tools

Every tool is a thin Python wrapper (`backend/agent/tools.py`) that calls a browser RPC method. No business rules live in the agent.

| Tool | Input | Browser service call | Notes |
|---|---|---|---|
| `search_products` | `query` | `CatalogService.search` | Updates `lastDisplayedProducts` |
| `filter_products` | `query?, category?, min_price?, max_price?, brand?, available?` | `CatalogService.filter` | "under ₹200" → `max_price: 200` |
| `navigate_category` | `category` | router push | Updates `currentCategory` |
| `open_product` | `product_id` | router push | "Show me that one" |
| `add_to_cart` | `product_id, quantity` | `CartService.add` | Returns `PARTIAL_STOCK` with `available` |
| `remove_from_cart` | `product_id` | `CartService.remove` | |
| `update_cart` | `product_id, quantity` | `CartService.updateQuantity` | 0 removes the item |
| `get_cart` | — | `CartService.getCart` | Lines + pricing |
| `get_cart_total` | — | `PricingService.calculate` | Subtotal, discount, delivery, total |
| `start_checkout` | — | `CheckoutService.validate` | Sets `pendingConfirmation`; never pays |
| `confirm_payment` | — | opens Razorpay in the browser | Rejected unless a confirmation is pending |
| `cancel_pending_action` | — | clears `pendingConfirmation` | "No", "wait", "never mind" |

---

## 10. Data Model

```mermaid
erDiagram
    CATEGORY ||--o{ PRODUCT : contains
    CATEGORY |o--o{ OFFER : "scopes (null means whole cart)"
    PRODUCT ||--o{ CART_ITEM : "referenced by"
    ORDER ||--|{ ORDER_LINE : contains

    CATEGORY {
        string id PK "vegetables, laundry, ..."
        string name
        string description
        string image
    }
    PRODUCT {
        string id PK "p001 to p067"
        string name
        string category FK
        string description
        int price "whole rupees"
        string unit "1 kg, 500 ml"
        string brand "nullable"
        bool stock
        int availableQuantity
        string image
        string tags "list of keywords"
        bool featured
    }
    OFFER {
        string id PK
        string title
        string category FK "nullable"
        int minimumAmount
        string discountType "percentage or flat"
        int discountValue
        bool active
    }
    CART_ITEM {
        string productId FK
        int quantity "number of units"
    }
    ORDER {
        string id "Razorpay order id"
        string paymentId
        string createdAt
        string pricing "totals snapshot"
    }
    ORDER_LINE {
        string productId
        string name
        string unit
        int price
        int quantity
    }
```

### 10.1 Catalog contents

| Category | Products | Demo coverage |
|---|---|---|
| Vegetables | 11 | "tom" → Tomato, Tomato Cherry, Tomato Puree; Coriander out of stock |
| Fruits | 7 | Mango Alphonso has only 2 left; Papaya out of stock |
| Dairy | 7 | Milk, butter, paneer, eggs |
| Beverages | 7 | Tea, coffee, juices |
| Snacks | 7 | Chips, namkeen, biscuits |
| Breakfast | 5 | Cereals, bread, jam, ketchup |
| Cleaning | 9 | 4 dishwashing liquids under ₹200 (cheapest: Vim 250 ml at ₹55) + one at ₹299 |
| Laundry | 7 | Surf Excel Matic 1 kg / 2 kg / Easy Wash 1 kg (ambiguity); Easy Wash only 2 left; Ariel out of stock |
| Personal Care | 7 | Soap, toothpaste, shampoo |

### 10.2 Pricing rules

```text
Subtotal  = Σ price × quantity
Discount  = Σ eligible offers (capped at subtotal)
            · percentage: round(eligible amount × value / 100)
            · flat: min(value, eligible amount)
            · eligible amount = category subtotal, or cart subtotal when category is null
            · applies only when active and eligible amount ≥ minimumAmount
Delivery  = ₹0 if subtotal ≥ ₹499 (or cart empty), else ₹30
Total     = Subtotal − Discount + Delivery
```

| Offer | Rule |
|---|---|
| `offer001` 10% OFF | Vegetables ≥ ₹300 |
| `offer002` 15% OFF Laundry | Laundry ≥ ₹500 |
| `offer003` ₹50 OFF | Cart ≥ ₹999 |
| `offer004` 20% OFF Fruits | Inactive (must never apply) |

**Quantity rule:** `quantity` always counts units of the product's pack size. "2 kg potatoes" with a 1 kg pack → quantity 2. If both 1 kg and 2 kg packs exist, ask.

---

## 11. Error Codes

One set of codes is shared by services, RPC results, FastAPI responses and voice replies. Each result carries a `message` that can be shown or spoken as-is.

| Code | Meaning | Status |
|---|---|---|
| `NOT_FOUND` | Product doesn't exist | ✅ |
| `NOT_IN_CART` | Update or remove on an item not in the cart | ✅ |
| `OUT_OF_STOCK` | Product unavailable | ✅ |
| `PARTIAL_STOCK` | Fewer units available than requested (`available` included) | ✅ |
| `INVALID_QUANTITY` | Not a whole number ≥ 1 | ✅ |
| `EMPTY_CART` | Checkout with nothing in the cart | ✅ |
| `PAYMENT_FAILED` | Payment declined or cancelled | ✅ |
| `AMBIGUOUS` | Several products match a voice request | ⬜ |
| `PENDING_CONFIRMATION_REQUIRED` | `confirm_payment` called without a pending checkout | ⬜ |
| `PAYMENT_VERIFICATION_FAILED` | Razorpay signature invalid | ⬜ |

---

## 12. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Catalog pages are statically prerendered (84 pages). Cart updates are instant, with no reload. Voice actions show visible progress. |
| **Responsiveness** | 320 px → 1440 px+. Product grid goes from 2 to 5 columns; horizontal rails on mobile. |
| **Accessibility** | Semantic landmarks, skip link, labelled controls, visible focus ring, `aria-live` for cart counts and toasts, full keyboard access. |
| **Reliability** | Every failure has a user-facing message: unknown product, no results, stock limits, empty cart, payment failure, backend unreachable, microphone denied, LiveKit down. Manual shopping keeps working if the backend or LiveKit is down. |
| **Security** | No secrets in the frontend or Git. Payment verified server-side. Client totals never trusted. Agent limited to approved tools. |
| **Maintainability** | MVC + SOLID (§6). TypeScript strict mode. ESLint clean. Catalog validated at startup. |
| **Hydration safety** | Persisted stores rehydrate after mount to avoid server/client mismatches. |

---

## 13. Design System

Monochrome grey and black. No pure-white surfaces and no colourful accents. Red is used only for errors and destructive actions.

| Token | Value | Used for |
|---|---|---|
| `background` (canvas) | `#dcdcdf` | Page background |
| `surface` | `#ececee` | Cards, panels, inputs |
| `surface-muted` | `#e0e0e3` | Image tiles, hints, secondary fills |
| `zinc-900` | `#18181b` | Header, footer, hero, offer cards |
| `brand-600 / 700` | `#18181b / #09090b` | Primary buttons, steppers, links |
| `zinc-300` | `#d4d4d8` | Borders and dividers |
| `red-600` | `#dc2626` | Errors, "Clear cart", remove |

Product images are emoji placeholders on `surface-muted` until real photos are added to `public/products/`.

---

## 14. Acceptance Criteria and Demo Script

### 14.1 Demo script (must pass end to end)

| # | User says / does | Expected result |
|---|---|---|
| 1 | "Show me vegetables." | Vegetables page opens |
| 2 | "Add 1 kg tomatoes and 2 kg potatoes." | Cart: Tomato × 1, Potato × 2; agent confirms |
| 3 | "Show me dishwashing liquids under ₹200." | 4 products shown |
| 4 | "Which one is cheapest?" | Agent names Vim 250 ml at ₹55 |
| 5 | "Add that one." | Vim 250 ml added |
| 6 | "What's my bill?" | Correct subtotal, discount, delivery and total |
| 7 | "Add Surf Excel." | Agent lists 3 options and waits |
| 8 | "Checkout." | "Your total is ₹X. Would you like to proceed to payment?" |
| 9 | "No." | Payment does not start |
| 10 | "Checkout" → "Yes." | Razorpay opens; verified success → order page; agent announces |
| — | Interrupt the agent mid-sentence | Agent stops and handles the new request |

### 14.2 MVP checklist

- [x] Browse, search, filter and sort products manually
- [x] Product details, add with quantity, stock limits enforced
- [x] Cart edit / remove / clear; correct pricing with offers and delivery
- [x] Checkout validation, explicit confirmation, failure + retry, success page
- [x] Responsive, accessible, monochrome UI
- [x] No database; secrets not committed
- [ ] Voice connects via LiveKit and shows its state
- [ ] Voice agent searches, filters, navigates, adds, removes, updates, reads cart and bill
- [ ] Agent handles ambiguity, unavailable items, partial stock, references, interruption
- [ ] Voice checkout requires explicit confirmation
- [ ] Razorpay payment works; success verified server-side; failure handled
- [ ] Automated tests (Vitest + pytest) pass
- [ ] Deployed (frontend, FastAPI, agent worker)

---

## 15. Risks and Open Questions

| Risk / question | Impact | Mitigation |
|---|---|---|
| Pricing exists in TypeScript (UI) and Python (payment) | Totals could drift | Shared golden cases in `data/pricing-cases.json` run by Vitest and pytest; use integer paise |
| Delivery fee and threshold live in `lib/container.ts`, not JSON | Python port could miss a change | Move to a `data/` config file before Phase 9 |
| STT / LLM / TTS provider not chosen | Blocks Phase 6 | Decide at the start of Phase 6; document env vars |
| LLM picks a product on ambiguity | Wrong item added | Tools return `AMBIGUOUS` with options; prompt forbids guessing; demo test #7 |
| Agent worker hosting | Vercel can't run long-lived workers | LiveKit Cloud Agents, Railway or Fly.io |
| Browser tab closed during a voice session | Agent loses its RPC target | Agent detects the participant leaving and ends the session |
| `PLAN.md` §1.2 still shows the older `lib/*` layout | Confusing for contributors | Update it to the MVC layout in §6.1 |

---

## 16. Roadmap

```mermaid
flowchart LR
    P0["Phase 0–5<br/>Setup · UI · JSON catalog<br/>Discovery · Cart · Checkout UI"]:::done
    P6["Phase 6<br/>FastAPI · LiveKit token<br/>Agent worker · RPC bridge"]:::next
    P7["Phase 7<br/>12 voice tools"]
    P8["Phase 8<br/>Context · ambiguity<br/>interruption"]
    P9["Phase 9<br/>Razorpay + verification"]
    P10["Phase 10–11<br/>Edge cases · tests"]
    P12["Phase 12–13<br/>Polish · deploy"]
    P0 --> P6 --> P7 --> P8 --> P9 --> P10 --> P12

    classDef done fill:#18181b,color:#ffffff,stroke:#18181b
    classDef next fill:#d4d4d8,color:#09090b,stroke:#18181b
```

**After v1:** user accounts, persistent orders, database, smart shopping lists ("buy my usual"), recommendations, coupons, multilingual voice, delivery tracking.

---

## 17. Definition of Success

A reviewer sees one continuous experience:

```text
Browse manually → switch to voice → ask naturally → AI understands context
→ AI runs real app actions → UI changes instantly → AI reports the result
→ checkout → explicit confirmation → verified payment → order success
```

**Voice is an interface to the application, not a separate chatbot.**
