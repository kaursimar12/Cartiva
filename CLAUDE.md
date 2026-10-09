@AGENTS.md

# Cartiva — Architecture Rules (mandatory)

All code must follow an **MVC structure** and the **SOLID principles**. Specs: `SRS-PRD.md`, `PLAN.md`.

## Repository layout

| Folder | What | Run commands from here |
|---|---|---|
| `frontend/` | Next.js app (catalog, cart, pricing, UI). Next.js docs: `frontend/node_modules/next/dist/docs/` | `npm run dev`, `npm run build` |
| `backend/` | Python FastAPI (LiveKit token, Razorpay) + LiveKit agent worker | `uv run fastapi dev app/main.py` |

JSON catalog data lives in `frontend/data/`; the backend reads it read-only via `DATA_DIR`.

## MVC layers (frontend — paths relative to `frontend/`)

| Layer | Folder | Responsibility | May depend on |
|---|---|---|---|
| Model — entities | `models/entities/` | Plain domain types (Product, Offer, Cart, Order) | nothing |
| Model — repositories | `models/repositories/` | Data access behind interfaces (JSON today, DB later) | entities |
| Services | `services/` | Business rules: catalog search, pricing, cart, checkout, payment | entities, repository/storage **interfaces** |
| Controllers | `controllers/` | Thin entry points for UI events (and later voice RPC); call services, map results to feedback | services |
| State | `store/` | Zustand state containers only — no business rules | entities |
| Views | `app/`, `components/`, `hooks/` (read-only view models) | Rendering and user input only — no pricing, stock or cart rules | controllers, services (read-only queries), entities |
| Wiring | `lib/container.ts` | Composition root: builds concrete repositories/services | everything |

- Views never write to stores directly; mutations go through a controller → service.
- The voice agent (Phase 7) must reuse the same controllers/services — never duplicate rules.

## SOLID

- **S** — one reason to change per module (data access ≠ pricing ≠ state ≠ rendering).
- **O** — extend via new implementations, not edits: discount strategies per `discountType`, `PaymentGateway` implementations (mock → Razorpay).
- **L** — any implementation of an interface must be a drop-in replacement.
- **I** — small, focused interfaces (`ProductRepository`, `OfferRepository`, `CartStorage`, `PaymentGateway`).
- **D** — services receive dependencies through constructors (interfaces), wired in `lib/container.ts`.
