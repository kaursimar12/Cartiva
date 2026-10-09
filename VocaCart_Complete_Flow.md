# VocaCart — Complete Voice AI Grocery Shopping Project Flow

## 1. Project Overview

**VocaCart** is a voice-first grocery shopping web application.

The user can shop through normal UI interactions or by speaking naturally to a LiveKit-powered voice agent.

The agent should not only reply to the user. It should also **perform real actions** inside the application:

- Search products
- Navigate categories
- Filter products
- Add products to cart
- Remove products
- Update quantities
- Read the cart
- Calculate the bill
- Start checkout
- Guide the user through Razorpay payment
- Confirm successful or failed payment

### Core concept

```text
USER SPEAKS
    ↓
LIVEKIT
    ↓
VOICE AGENT
    ↓
UNDERSTAND REQUEST
    ↓
SELECT / EXECUTE ACTION
    ↓
APPLICATION STATE / JSON DATA
    ↓
UPDATE UI
    ↓
ACTION RESULT
    ↓
AGENT SPEAKS RESPONSE
    ↓
USER
```

---

# 2. Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Zustand or React state for cart/session state

## Data

JSON files:

```text
data/
├── products.json
├── categories.json
└── offers.json
```

For this portfolio project, JSON is sufficient for the product catalog.

The cart should preferably be maintained in frontend/session state rather than treating a JSON file as a production database.

## Voice AI

- LiveKit
- LiveKit Voice Agent
- Real-time audio
- Voice conversation
- Agent events
- Tool/action calling

## Payment

- Razorpay
- Razorpay MCP/integration

The exact Razorpay MCP capabilities should be verified during implementation.

---

# 3. High-Level Architecture

```text
                              ┌──────────────────────┐
                              │        USER          │
                              │  Opens VocaCart      │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │     NEXT.JS APP      │
                              │                      │
                              │ Home / Products      │
                              │ Categories / Cart    │
                              │ Checkout             │
                              └──────────┬───────────┘
                                         │
                                         │ Click 🎤
                                         ▼
                              ┌──────────────────────┐
                              │    LIVEKIT SESSION   │
                              │                      │
                              │ Connection           │
                              │ Microphone           │
                              │ Audio Stream         │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │     VOICE AGENT      │
                              │                      │
                              │ Listen               │
                              │ Understand           │
                              │ Maintain Context     │
                              │ Decide Action        │
                              └──────────┬───────────┘
                                         │
                              ┌──────────┴───────────┐
                              │                      │
                              ▼                      ▼
                     ┌────────────────┐     ┌─────────────────┐
                     │ Conversation   │     │ Action Required │
                     │ only           │     │                 │
                     └───────┬────────┘     └────────┬────────┘
                             │                       │
                             ▼                       ▼
                       Agent speaks            Select Tool
                             │                       │
                             ▼                       ▼
                           USER             Execute Action
                                                     │
                                                     ▼
                                           ┌─────────────────┐
                                           │ Next.js / API   │
                                           │ Action Handler  │
                                           └────────┬────────┘
                                                    │
                                                    ▼
                                              JSON DATA
                                                    │
                                                    ▼
                                            Action Result
                                                    │
                                                    ▼
                                           Update UI / State
                                                    │
                                                    ▼
                                           Result to Agent
                                                    │
                                                    ▼
                                            Agent speaks
                                                    │
                                                    ▼
                                                  USER
```

---

# 4. Master Voice-Agent Flow

```text
                         USER SPEAKS
                              │
                              ▼
                    ┌──────────────────┐
                    │ LiveKit receives │
                    │     audio        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Voice Agent      │
                    │ understands      │
                    │ request          │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Is request clear?│
                    └──────┬─────┬─────┘
                           │     │
                         YES      NO
                           │       │
                           │       ▼
                           │  Ask clarification
                           │       │
                           │       ▼
                           │      USER
                           │
                           ▼
                   ┌───────────────────┐
                   │ Is action needed? │
                   └──────┬──────┬─────┘
                          │      │
                        NO       YES
                          │        │
                          ▼        ▼
                    Conversation   Select tool
                          │        │
                          │        ▼
                          │   Execute tool
                          │        │
                          │        ▼
                          │   Action successful?
                          │        │
                          │    ┌───┴────┐
                          │   YES       NO
                          │    │         │
                          │    │         ▼
                          │    │    Handle error
                          │    │         │
                          │    ▼         ▼
                          │  Result   Explain issue
                          │    │         │
                          └────┴────┬────┘
                                   │
                                   ▼
                            Agent responds
                                   │
                                   ▼
                              USER hears
```

---

# 5. Request Classification

Every user request should be classified into an appropriate intent.

```text
USER REQUEST
     │
     ▼
┌──────────────────────────────┐
│ What does the user want?     │
└──────────────┬───────────────┘
               │
     ┌─────────┼─────────┬────────────┬────────────┐
     ▼         ▼         ▼            ▼            ▼
  SEARCH    NAVIGATE   CART       INFORMATION   CHECKOUT
     │         │         │            │            │
     ▼         ▼         ▼            ▼            ▼
 Products   Category   Add          Price       Confirm
 Filter     Section    Remove       Total       Payment
 Sort       Page       Update       Cart        Order
```

Additional intents:

```text
HELP
GREETING
CANCEL
UNKNOWN
ERROR
```

---

# 6. Product Search Flow

Example:

> "Show me tomatoes."

```text
USER
 │
 ▼
"Show me tomatoes"
 │
 ▼
LIVEKIT AGENT
 │
 ▼
Understand:
intent = SEARCH
query = tomato
 │
 ▼
search_products()
 │
 ▼
Read products.json
 │
 ▼
Any matching products?
 │
 ├────────────── YES ──────────────┐
 │                                 │
 │                                 ▼
 │                         Return products
 │                                 │
 │                                 ▼
 │                         Update product UI
 │                                 │
 │                                 ▼
 │                         Agent speaks
 │                                 │
 │                                 ▼
 │                "I found 3 tomato options."
 │
 └────────────── NO ───────────────┐
                                   │
                                   ▼
                          Agent speaks
                                   │
                                   ▼
                    "I couldn't find tomatoes.
                     Would you like me to
                     show similar products?"
```

---

# 7. Category Navigation Flow

Example:

> "Take me to the laundry section."

```text
USER
 │
 ▼
LIVEKIT
 │
 ▼
Intent = NAVIGATE
Category = laundry
 │
 ▼
Does category exist?
 │
 ├──── YES ────► navigate_category()
 │                     │
 │                     ▼
 │                Update URL/UI
 │                     │
 │                     ▼
 │                Agent responds
 │
 └──── NO ─────► Agent asks:
                 "I couldn't find
                  that category."
```

---

# 8. Product Filtering Flow

Example:

> "Show me dishwashing liquids under ₹200."

```text
USER
 │
 ▼
AGENT
 │
 ▼
Extract:
category = dishwashing
maxPrice = 200
 │
 ▼
filter_products()
 │
 ▼
products.json
 │
 ▼
Any matching products?
 │
 ├──── YES ──► Display products
 │                  │
 │                  ▼
 │             Agent responds
 │
 └──── NO ───► "I couldn't find
                any under ₹200.
                Would you like to
                increase the budget?"
```

Follow-up:

> "Okay, show me under ₹300."

The agent should reuse the previous context:

```text
category = dishwashing
maxPrice = 300
```

---

# 9. Add-to-Cart Flow

Example:

> "Add one Surf Excel."

```text
USER
 │
 ▼
AGENT
 │
 ▼
Search product
 │
 ▼
How many matching products?
 │
 ├──── 0 ──────────► Not found
 │
 ├──── 1 ──────────► Add directly
 │
 └──── Multiple ───► Ask user
                         │
                         ▼
                  User selects variant
                         │
                         ▼
                    Add to cart
```

### Stock validation

```text
add_to_cart(productId, quantity)
             │
             ▼
       Is product in stock?
          │         │
        YES         NO
         │           │
         ▼           ▼
       ADD       Tell user unavailable
         │
         ▼
    Update cart
         │
         ▼
Agent:
"Done, I've added it."
```

---

# 10. Multiple Product / Ambiguous Request

Example:

> "Add Surf Excel."

Suppose the catalog contains:

```text
Surf Excel Matic 1kg
Surf Excel Matic 2kg
Surf Excel Easy Wash 1kg
```

Flow:

```text
SEARCH
  │
  ▼
3 MATCHES
  │
  ▼
Is request specific enough?
  │
  └── NO
       │
       ▼
Ask clarification
       │
       ▼
"Which one would you like?
 Matic 1kg,
 Matic 2kg,
 or Easy Wash 1kg?"
       │
       ▼
USER
       │
       ▼
"Matic 2kg"
       │
       ▼
ADD TO CART
       │
       ▼
CONFIRM
```

The agent should not randomly select a product when multiple variants are plausible.

---

# 11. "That One" / Context Flow

Example conversation:

> User: "Show me dishwashing liquids."

> Agent: "I found four options."

> User: "Which one is cheapest?"

> Agent: "The Vim 500 ml is ₹115."

> User: "Add that one."

Flow:

```text
"that one"
    │
    ▼
Conversation context
    │
    ▼
Last referenced product
    │
    ▼
Vim 500ml
    │
    ▼
add_to_cart()
    │
    ▼
"Done, I've added Vim."
```

If the context is unclear:

> "Do you mean the Vim 500 ml or Pril 500 ml?"

---

# 12. Remove From Cart

Example:

> "Remove the potatoes."

```text
USER
 │
 ▼
AGENT
 │
 ▼
remove_from_cart()
 │
 ▼
Is potato in cart?
 │
 ├── YES ──► Remove
 │              │
 │              ▼
 │          Update UI
 │              │
 │              ▼
 │          Confirm
 │
 └── NO ───► "Potatoes aren't
              currently in your cart."
```

---

# 13. Quantity Changes

Example:

> "Make that two instead."

```text
"Make that two"
       │
       ▼
Context available?
       │
   ┌───┴───┐
  YES      NO
   │        │
   ▼        ▼
Identify   Ask:
product    "Which item?"
   │
   ▼
update_cart()
   │
   ▼
quantity = 2
   │
   ▼
Update UI
   │
   ▼
Respond
```

---

# 14. Cart Summary

Example:

> "What's in my cart?"

```text
USER
 │
 ▼
get_cart()
 │
 ▼
Cart empty?
 │
 ├── YES ──► "Your cart is empty."
 │
 └── NO
      │
      ▼
Return cart items
      │
      ▼
Agent summarizes
      │
      ▼
"Your cart has 4 items..."
```

---

# 15. Bill Calculation

Example:

> "What's my bill?"

```text
get_cart()
    │
    ▼
Calculate
    │
    ├── Subtotal
    ├── Discount
    ├── Delivery
    └── Final Total
    │
    ▼
Any applicable offer?
    │
 ┌──┴───┐
YES     NO
 │       │
 ▼       ▼
Apply    Continue
discount
 │       │
 └──┬────┘
    ▼
FINAL TOTAL
    │
    ▼
Agent speaks
```

Example response:

> "Your subtotal is ₹520. You have a ₹50 discount and ₹25 delivery charge. Your final total is ₹495."

---

# 16. Empty Cart Condition

Every cart/checkout action should handle an empty cart.

```text
USER:
"Checkout"

       │
       ▼

     Cart?
       │
   ┌───┴───┐
 EMPTY    HAS ITEMS
   │          │
   ▼          ▼
"Your cart   Calculate
is empty."    total
              │
              ▼
          Confirmation
```

---

# 17. Checkout Confirmation

Checkout should always have an explicit confirmation step.

User:

> "Checkout."

Agent:

> "Your total is ₹495. Would you like to proceed to payment?"

```text
USER SAYS YES
      │
      ▼
Proceed to Razorpay

USER SAYS NO
      │
      ▼
Stay in cart

USER SAYS "WAIT"
      │
      ▼
Don't initiate payment
```

The agent should not initiate payment merely because it inferred that the user might want to pay.

---

# 18. Razorpay Payment Flow

Final payment architecture:

```text
                    CHECKOUT
                       │
                       ▼
                 Confirm order
                       │
                       ▼
                  USER SAYS YES
                       │
                       ▼
               Create payment/order
                       │
                       ▼
                 Razorpay MCP
                       │
                       ▼
              Razorpay Checkout
                       │
              ┌────────┴────────┐
              │                 │
           SUCCESS             FAILURE
              │                 │
              ▼                 ▼
        Payment verified    Payment failed
              │                 │
              ▼                 ▼
        Order success       Retry option
              │
              ▼
        Agent responds
              │
              ▼
    "Your order was placed
       successfully."
```

The exact Razorpay MCP capabilities and payment flow should be verified during implementation.

---

# 19. Payment Failure

Never assume payment succeeded merely because checkout was opened.

```text
Razorpay
   │
   ▼
Payment result
   │
 ┌─┴──────────────┐
SUCCESS          FAILED
   │                │
   ▼                ▼
Verify          Show failure
   │                │
   ▼                ▼
Success        "Payment wasn't
                 completed."
   │                │
   ▼                ▼
Order          Retry?
created           │
             ┌────┴────┐
            YES        NO
             │          │
             ▼          ▼
          Payment     Return
          again       to cart
```

---

# 20. LiveKit Connection Conditions

Voice connection states should be handled explicitly.

```text
CLICK MICROPHONE
       │
       ▼
Connect LiveKit
       │
       ▼
Connection successful?
       │
   ┌───┴────┐
  YES       NO
   │         │
   ▼         ▼
Start      Show error
listening    │
   │         ▼
   │       Retry
   ▼
User speaks
```

Conversation state:

```text
CONNECTED
   │
   ▼
LISTENING
   │
   ▼
USER SPEAKING
   │
   ▼
PROCESSING
   │
   ▼
ACTION?
 ┌─┴─────┐
NO      YES
 │        │
 ▼        ▼
REPLY   EXECUTE TOOL
 │        │
 │      SUCCESS?
 │      ┌─┴──┐
 │     YES   NO
 │      │     │
 │      │     ▼
 │      │   ERROR
 │      │     │
 └──────┴─────┘
        │
        ▼
    SPEAKING
        │
        ▼
       IDLE
```

---

# 21. Agent Action Failure

Every tool needs failure handling.

Example:

> "Add 5 packets of Surf Excel."

But only 2 are available.

```text
add_to_cart()
      │
      ▼
Stock available?
      │
   ┌──┴───┐
 YES      NO
  │        │
  │        ▼
  │   Partial stock?
  │        │
  │    ┌───┴───┐
  │   YES      NO
  │    │         │
  │    ▼         ▼
  │  Offer 2    Not available
  │    │
  │    ▼
  │ Ask user
  │
  ▼
Add item
```

Agent:

> "Only two packets are currently available. Would you like me to add two?"

---

# 22. Unknown User Request

The agent should have a safe fallback for unrelated requests.

Example:

> "What's the weather tomorrow?"

```text
USER REQUEST
     │
     ▼
Is it related to shopping?
     │
  ┌──┴───┐
 YES     NO
  │       │
  ▼       ▼
Process  Politely redirect
shopping
          │
          ▼
"I can help you search
products, manage your
cart, or checkout."
```

---

# 23. User Cancellation

Users should be able to cancel actions.

Examples:

> "Cancel that."

> "Don't add it."

> "Stop checkout."

```text
USER
 │
 ▼
CANCEL / STOP
 │
 ▼
What is currently happening?
 │
 ├── Speaking ─────► Stop response
 │
 ├── Search ───────► Cancel request
 │
 ├── Cart action ──► Don't execute
 │
 ├── Checkout ─────► Return to cart
 │
 └── Payment ──────► Follow Razorpay cancellation flow
```

---

# 24. User Interrupts the Agent

Real-time voice interaction should support interruptions.

Example:

Agent:

> "I found three—"

User:

> "Stop. Add the second one."

Flow:

```text
AGENT SPEAKING
      │
      ▼
USER INTERRUPTS
      │
      ▼
Stop current response
      │
      ▼
Listen to new request
      │
      ▼
Process new request
```

---

# 25. Conversation Context

The agent should maintain relevant context during a shopping session.

Example context:

```text
currentCategory
lastSearch
lastDisplayedProducts
lastReferencedProduct
currentCart
lastAction
pendingConfirmation
```

Example:

```text
User:
"Show me washing powders."

currentCategory = laundry
lastSearch = washing powder

User:
"Which is cheapest?"

Agent uses lastSearch.

User:
"Add that one."

Agent uses lastReferencedProduct.
```

The agent should not invent missing context. If context is ambiguous, ask the user.

---

# 26. Event Handling

The frontend should visually reflect what the agent is doing.

Recommended UI states:

```text
IDLE
LISTENING
USER_SPEAKING
THINKING
EXECUTING_ACTION
ACTION_SUCCESS
ACTION_ERROR
AGENT_SPEAKING
DISCONNECTED
```

Example UI:

```text
IDLE
🎤 Ask VocaCart

LISTENING
🎤 Listening...

THINKING
✨ Thinking...

EXECUTING_ACTION
🛒 Adding to cart...

ACTION_SUCCESS
✓ Added to cart

AGENT_SPEAKING
🔊 Speaking...

DISCONNECTED
⚠ Connection lost
[Reconnect]
```

---

# 27. Event Flow

```text
USER STARTS SPEAKING
        │
        ▼
USER_SPEAKING
        │
        ▼
USER STOPS
        │
        ▼
THINKING
        │
        ▼
Agent decides:
        │
   ┌────┴────┐
   │         │
Reply      Action
   │         │
   │         ▼
   │   EXECUTING_ACTION
   │         │
   │    ┌────┴────┐
   │    │         │
   │ SUCCESS      ERROR
   │    │         │
   │    ▼         ▼
   │ ACTION_     ACTION_
   │ SUCCESS     ERROR
   │    │         │
   └────┴─────────┘
        │
        ▼
AGENT_SPEAKING
        │
        ▼
IDLE
```

---

# 28. Complete End-to-End Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                                                              │
│  🎤 "Add 1 kg tomatoes and show dishwashing liquids under    │
│      ₹200."                                                  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         LIVEKIT                              │
│                                                              │
│ Audio / Real-time session / Voice interaction                │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       VOICE AGENT                            │
│                                                              │
│ Understand intent                                            │
│ Maintain conversation context                                │
│ Decide whether to respond or execute an action               │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  REQUEST CLASSIFIER │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
       SEARCH             NAVIGATION              CART
          │                   │                    │
          ▼                   ▼                    ▼
   search_products     navigate_category      add_to_cart
   filter_products                            remove_from_cart
                                              update_cart
                                              get_cart
                                              get_cart_total
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION ACTIONS                       │
│                                                              │
│ JSON product/catalog data                                    │
│ Frontend state                                               │
│ UI navigation                                                │
│ Cart state                                                   │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
                       ACTION RESULT
                              │
                              ▼
                    Update Frontend UI
                              │
                              ▼
                      Return to Agent
                              │
                              ▼
                    Agent generates reply
                              │
                              ▼
                         🔊 SPEAKS
                              │
                              ▼
                            USER
```

---

# 29. Complete Shopping Journey

This is the main flow that should work in the final project:

```text
🎤 "I want to buy groceries."
          ↓
AI opens grocery experience
          ↓
🎤 "Show me vegetables."
          ↓
Vegetables displayed
          ↓
🎤 "Add 1 kg tomatoes."
          ↓
Search tomato
          ↓
Check match
          ↓
Check stock
          ↓
Add to cart
          ↓
🔊 "Done, I've added 1 kg of tomatoes."
          ↓
🎤 "Add 2 kg potatoes."
          ↓
Potatoes added
          ↓
🎤 "Show me dishwashing liquids under ₹200."
          ↓
Filter products
          ↓
Products displayed
          ↓
🎤 "Which one is cheapest?"
          ↓
AI identifies cheapest
          ↓
🎤 "Add that one."
          ↓
Use conversation context
          ↓
Add product
          ↓
🎤 "What's my bill?"
          ↓
Calculate cart
          ↓
Apply offer/discount if applicable
          ↓
Return total
          ↓
🔊 "Your total is ₹495."
          ↓
🎤 "Checkout."
          ↓
Check cart
          ↓
Calculate final amount
          ↓
Ask confirmation
          ↓
🎤 "Yes."
          ↓
Razorpay
          ↓
Payment
          ↓
       ┌───────────────┐
       │ Payment result│
       └───────┬───────┘
               │
        ┌──────┴──────┐
        ▼             ▼
     SUCCESS        FAILED
        │             │
        ▼             ▼
 Verify payment    Show failure
        │             │
        ▼             ▼
 Order success     Retry / Cart
        │
        ▼
🔊 "Your order has been placed successfully."
```

---

# 30. All Major Conditions

The application should account for these conditions:

| Condition | Expected behavior |
|---|---|
| LiveKit connects | Start voice interaction |
| LiveKit connection fails | Show reconnect option |
| User says unclear request | Ask clarification |
| Product found | Display/perform action |
| Product not found | Explain and offer alternatives |
| Multiple product matches | Ask user to choose |
| Product out of stock | Explain availability |
| Partial stock | Ask whether to add available quantity |
| Cart empty | Prevent checkout and explain |
| Cart has items | Continue checkout flow |
| User says "that one" | Use conversation context |
| Context is ambiguous | Ask clarification |
| User cancels | Stop/undo pending action |
| User interrupts agent | Stop current response and process new request |
| Tool succeeds | Update UI and confirm |
| Tool fails | Explain error and offer recovery |
| Checkout requested | Calculate total |
| Checkout confirmed | Start payment flow |
| Checkout not confirmed | Do not start payment |
| Payment succeeds | Verify and show order success |
| Payment fails | Show failure and retry option |
| User asks unrelated question | Politely redirect to shopping |
| Voice disconnected | Show reconnect UI |
| Agent is speaking | Show speaking state |
| Agent is executing action | Show action state |

---

# 31. Recommended Agent Tools

Keep the initial tool set small and controlled.

```text
search_products
filter_products
navigate_category

add_to_cart
remove_from_cart
update_cart

get_cart
get_cart_total

start_checkout
```

Potential later tools:

```text
get_offers
apply_coupon
clear_cart
repeat_last_action
cancel_pending_action
```

Do not expose arbitrary application control to the AI.

---

# 32. Project Development Order

## Phase 1 — Frontend

- [ ] Create Next.js project
- [ ] Configure TypeScript
- [ ] Configure Tailwind
- [ ] Build header
- [ ] Build homepage
- [ ] Build categories
- [ ] Build product cards
- [ ] Build product details
- [ ] Build cart
- [ ] Build checkout
- [ ] Build order success page

## Phase 2 — JSON Data

- [ ] Create products.json
- [ ] Create categories.json
- [ ] Create offers.json
- [ ] Add 50–100 products
- [ ] Implement product search
- [ ] Implement category filtering
- [ ] Implement price filtering

## Phase 3 — Cart State

- [ ] Add Zustand or React state
- [ ] Add item
- [ ] Remove item
- [ ] Increase quantity
- [ ] Decrease quantity
- [ ] Calculate subtotal
- [ ] Calculate discount
- [ ] Calculate delivery
- [ ] Calculate final total

## Phase 4 — LiveKit

- [ ] Create LiveKit project
- [ ] Configure LiveKit connection
- [ ] Create voice agent
- [ ] Connect microphone
- [ ] Receive user speech
- [ ] Generate agent speech
- [ ] Handle connection state

## Phase 5 — Events

- [ ] IDLE
- [ ] LISTENING
- [ ] USER_SPEAKING
- [ ] THINKING
- [ ] EXECUTING_ACTION
- [ ] ACTION_SUCCESS
- [ ] ACTION_ERROR
- [ ] AGENT_SPEAKING
- [ ] DISCONNECTED

## Phase 6 — Voice Tools

- [ ] search_products
- [ ] filter_products
- [ ] navigate_category
- [ ] add_to_cart
- [ ] remove_from_cart
- [ ] update_cart
- [ ] get_cart
- [ ] get_cart_total

## Phase 7 — Conversation Intelligence

- [ ] Conversation context
- [ ] Follow-up questions
- [ ] Ambiguous products
- [ ] "that one"
- [ ] "add another"
- [ ] "remove the last item"
- [ ] Quantity references
- [ ] Confirmation handling
- [ ] Cancellation
- [ ] Interruptions

## Phase 8 — Checkout

- [ ] Checkout request
- [ ] Empty-cart validation
- [ ] Cart summary
- [ ] Final total
- [ ] Explicit payment confirmation
- [ ] Razorpay integration/MCP

## Phase 9 — Payment

- [ ] Initiate payment
- [ ] Payment success
- [ ] Payment failure
- [ ] Retry
- [ ] Payment verification
- [ ] Order success UI

## Phase 10 — Polish

- [ ] Responsive design
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Voice animation
- [ ] Transcript
- [ ] Tool/action indicators
- [ ] Accessibility
- [ ] Deployment

---

# 33. Final LinkedIn Demo Flow

The demo should ideally show one continuous natural conversation:

```text
🎤 "I want to buy groceries."

        ↓

🎤 "Show me vegetables."

        ↓

🖥️ Vegetables appear

        ↓

🎤 "Add 1 kg tomatoes and 2 kg potatoes."

        ↓

🛒 Cart updates

        ↓

🎤 "Now show me dishwashing liquids under ₹200."

        ↓

🖥️ Filtered products appear

        ↓

🎤 "Which one is cheapest?"

        ↓

🔊 Agent answers

        ↓

🎤 "Add that one."

        ↓

🛒 Product added

        ↓

🎤 "What's my bill?"

        ↓

🔊 Agent explains subtotal, discount and total

        ↓

🎤 "Checkout."

        ↓

🔊 "Your total is ₹495.
    Would you like to proceed?"

        ↓

🎤 "Yes."

        ↓

💳 Razorpay

        ↓

💰 Payment

        ↓

✅ Payment verified

        ↓

🔊 "Your order has been placed successfully."
```

---

# 34. Main Project Goal

The final project should demonstrate this complete loop:

```text
                 ┌─────────────────┐
                 │      VOICE      │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │   UNDERSTAND    │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │     REASON      │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │      ACTION     │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │    APPLICATION  │
                 │     CHANGES     │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │     RESULT      │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │  VOICE REPLY    │
                 └────────┬────────┘
                          ↓
                         USER
```

**The key differentiator is:**

> **VocaCart is not a voice chatbot. It is a voice-controlled shopping agent.**

The agent **talks + understands + takes action + updates the application + reports the result**.
