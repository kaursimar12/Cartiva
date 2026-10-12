# Cartiva — Flowcharts

Each step shows **what happens** and **which file** does it, using a real example.

**Colours:** 🟪 Shopper · 🟩 Frontend (Next.js) · 🟧 Backend (FastAPI) · 🟣 Voice agent (Python) · 🟦 LiveKit Cloud · 🟥 error / alternative
**Borders:** solid = file exists today · dashed 🔜 = built in a later phase · ◆ = decision

> To change a diagram, edit `docs/diagrams/make_diagrams.py`, then run
> `python docs/diagrams/make_diagrams.py docs/diagrams` from the repo root.

---

## 0 · The big picture

![The big picture: frontend, LiveKit Cloud, backend](diagrams/00-big-picture.svg)

---

## 1 · Manual shopping: "Add to cart" button

![Manual add to cart flow](diagrams/01-manual-add-to-cart.svg)

---

## 2 · Voice test in the terminal (step 6.5)

![Console voice test flow](diagrams/02-console-voice-test.svg)

---

## 3 · Voice from the website (step 6.6)

![Website voice session flow](diagrams/03-website-voice-session.svg)

---

## 4 · Voice adds to the cart (Phase 7)

![Voice add to cart flow](diagrams/04-voice-add-to-cart.svg)

---

## 5 · Voice checkout and payment (Phases 7–9)

![Voice checkout and payment flow](diagrams/05-voice-checkout-payment.svg)
