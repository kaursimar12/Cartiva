# Cartiva — Software Requirements Specification (SRS) & Product Requirements Document (PRD)

**Project:** Cartiva  
**Repository:** `cartiva-ai`  
**Document Version:** 1.0  
**Status:** Development Specification  
**Product Type:** AI-powered grocery shopping web application  
**Primary Interaction Modes:** Manual UI + Real-time Voice AI  
**Date:** October 2026

---

## 1. Product Overview

### 1.1 Product Name

**Cartiva — Intelligent Grocery Shopping Platform**

### 1.2 Product Summary

Cartiva is a modern grocery shopping web application that allows users to shop through a traditional graphical interface or through a real-time AI voice agent.

The application is designed to demonstrate how a voice agent can operate a real application rather than functioning only as a conversational chatbot.

Users can:

- Browse grocery categories.
- Search and filter products.
- View product details.
- Add, remove, and update cart items.
- Calculate the cart total.
- Proceed through checkout.
- Complete payment using Razorpay.
- Perform the same shopping actions through natural voice commands.

The manual UI and voice agent must operate on the same application state and business actions.

### 1.3 Core Product Principle

> **Cartiva is not a voice chatbot. It is a grocery shopping application with voice as an additional intelligent interface.**

The voice agent must be capable of:

1. Understanding the user's request.
2. Maintaining relevant conversation context.
3. Selecting an approved application action/tool.
4. Executing the action.
5. Updating the application state.
6. Reporting the result naturally through voice.

---

# 2. Goals

## 2.1 Primary Goals

- Build a polished, responsive grocery shopping experience.
- Support both manual and voice-controlled shopping.
- Demonstrate real-time conversational AI using LiveKit.
- Demonstrate tool/function-based AI actions.
- Maintain shared state between UI and voice interactions.
- Use JSON as the product/catalog data source instead of a database.
- Integrate Razorpay for checkout/payment.
- Handle errors, ambiguity, interruptions, and confirmations safely.
- Produce a strong portfolio-ready full-stack AI project.

## 2.2 Secondary Goals

- Demonstrate clean frontend architecture.
- Demonstrate API/action-layer design.
- Demonstrate state management.
- Demonstrate real-time event handling.
- Demonstrate AI-agent context management.
- Demonstrate payment integration.
- Provide clear loading, empty, success, and error states.

## 2.3 Non-Goals

The initial version will NOT include:

- A production database.
- User account authentication.
- Real inventory management.
- Real delivery tracking.
- Real warehouse integration.
- Multi-vendor marketplace functionality.
- Complex recommendation models.
- Autonomous payment without explicit user confirmation.

These may be future extensions.

---

# 3. Target Users

## 3.1 Primary User

A user who wants to purchase groceries quickly using either:

- Traditional browsing and clicking.
- Natural voice commands.

## 3.2 Portfolio/Technical Audience

The project should also communicate the following technical capabilities to developers and recruiters:

- Next.js development.
- TypeScript.
- Python / FastAPI backend.
- API integration.
- State management.
- Real-time voice AI.
- LiveKit.
- Tool calling.
- Context-aware AI interactions.
- Payment integration.
- Responsive UI.

---

# 4. Product Experience

## 4.1 Manual Shopping Flow

```text
Home
  ↓
Browse/Search
  ↓
Category
  ↓
Product
  ↓
Add to Cart
  ↓
Cart
  ↓
Checkout
  ↓
Order Confirmation
  ↓
Payment
  ↓
Order Success
```

## 4.2 Voice Shopping Flow

```text
User speaks
  ↓
LiveKit
  ↓
Voice Agent
  ↓
Understand request
  ↓
Determine intent
  ↓
Select approved tool/action
  ↓
Execute action
  ↓
Update shared application state
  ↓
Return result
  ↓
Agent speaks response
```

## 4.3 Combined Experience

```text
                  CARTIVA
                     |
             ┌───────┴───────┐
             ↓               ↓
       Manual Interface   Voice Interface
             |               |
             └───────┬───────┘
                     ↓
              Shared Actions
                     ↓
              Shared App State
                     ↓
              Checkout / Payment
```

A user may switch between modes at any time.

Example:

1. User manually adds tomatoes.
2. User activates voice.
3. User says: "Add two packets of detergent."
4. Agent adds detergent.
5. User manually opens the cart.
6. User says: "What's my total?"
7. Agent reads the current cart total.

---

# 5. Functional Requirements

## FR-01 — Homepage

The system shall provide a responsive homepage containing:

- Brand/header.
- Search.
- Grocery categories.
- Featured products.
- Offers.
- Cart access.
- Voice assistant control.

## FR-02 — Product Catalog

The system shall load product information from JSON files.

Each product should support:

- Product ID.
- Name.
- Category.
- Description.
- Price.
- Unit/size.
- Brand.
- Stock status.
- Available quantity where required.
- Image.
- Optional tags.

Example:

```json
{
  "id": "p001",
  "name": "Tomato",
  "category": "vegetables",
  "price": 40,
  "unit": "1 kg",
  "brand": null,
  "stock": true,
  "availableQuantity": 10,
  "image": "/products/tomato.jpg"
}
```

## FR-03 — Categories

Users shall be able to:

- View categories.
- Open a category.
- Browse products within a category.
- Navigate between categories.

Example categories:

- Vegetables
- Fruits
- Dairy
- Beverages
- Snacks
- Cleaning
- Laundry
- Personal Care

## FR-04 — Product Search

Users shall be able to search products by:

- Product name.
- Brand.
- Category.
- Tags.

Search must support partial matching.

Example:

```text
User searches:
"tom"

Result:
Tomato
Tomato Cherry
Tomato Puree
```

## FR-05 — Product Filtering

Users shall be able to filter products by:

- Category.
- Price range.
- Availability.
- Brand where applicable.

Voice equivalent:

> "Show me dishwashing liquids under ₹200."

## FR-06 — Product Details

The product page shall display:

- Image.
- Name.
- Brand.
- Price.
- Unit.
- Description.
- Availability.
- Quantity selector.
- Add-to-cart action.

## FR-07 — Cart

The cart shall support:

- Add item.
- Remove item.
- Increase quantity.
- Decrease quantity.
- Update quantity.
- Clear cart.
- View subtotal.
- View discounts.
- View delivery fee.
- View final total.

## FR-08 — Cart State

Cart state shall be shared by:

- Manual UI.
- Voice agent actions.

The voice agent must never maintain an independent cart that can become inconsistent with the UI.

## FR-09 — Pricing

The application shall calculate:

```text
Subtotal
- Discount
+ Delivery Fee
= Final Total
```

Pricing rules shall be deterministic and implemented in the application action/business layer.

## FR-10 — Offers

Offers shall be represented in JSON.

Example:

```json
{
  "id": "offer001",
  "title": "10% OFF",
  "category": "vegetables",
  "minimumAmount": 300,
  "discountType": "percentage",
  "discountValue": 10
}
```

The system shall apply only valid configured offers.

---

# 6. Voice AI Requirements

## FR-11 — LiveKit Voice Connection

The application shall provide a voice assistant control.

When activated:

```text
Connect
  ↓
LiveKit session
  ↓
Voice agent
  ↓
Listening
```

The UI shall expose connection status.

## FR-12 — Voice State

The application shall support:

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

## FR-13 — Voice Commands

The agent should understand natural requests such as:

### Search

> "Find tomatoes."

### Category

> "Show me vegetables."

### Filter

> "Show dishwashing liquids under ₹200."

### Add

> "Add 2 kg potatoes."

### Remove

> "Remove the tomatoes."

### Quantity

> "Make that two."

### Cart

> "What's in my cart?"

### Bill

> "What's my total?"

### Checkout

> "Checkout."

### Cancellation

> "Cancel that."

## FR-14 — Voice Agent Tools

The initial tool set shall include:

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

The agent must only execute approved tools.

## FR-15 — Voice Context

The agent/session context should maintain:

```text
currentCategory
lastSearch
lastDisplayedProducts
lastReferencedProduct
currentCart
lastAction
pendingConfirmation
```

The agent must not invent context.

If context is insufficient, it must ask a clarification question.

---

# 7. Conversation Requirements

## FR-16 — Contextual References

The agent shall resolve phrases such as:

- "that one"
- "the cheapest one"
- "add another"
- "remove the last item"
- "make that two"
- "show me more"
- "what about a cheaper one"

Example:

```text
User:
Show me dishwashing liquids under ₹200.

Agent:
Displays products.

User:
Which one is cheapest?

Agent:
Identifies cheapest displayed product.

User:
Add that one.

Agent:
Adds the previously referenced product.
```

## FR-17 — Ambiguous Products

If multiple products match:

```text
User:
Add Surf Excel.
```

The agent must NOT randomly select a product.

It should ask:

> "I found Surf Excel Matic 1 kg, Surf Excel Matic 2 kg, and Surf Excel Easy Wash 1 kg. Which one would you like?"

## FR-18 — Stock Handling

If requested quantity is available:

```text
Add requested quantity.
```

If partially available:

```text
User:
Add 5 packs.

Available:
2 packs.

Agent:
Only 2 packs are currently available. Would you like me to add those 2?
```

The agent must wait for confirmation before changing the requested quantity.

## FR-19 — Empty Search

If no product matches:

> "I couldn't find that product. Would you like me to show similar options?"

## FR-20 — Unrelated Requests

For requests outside the shopping scope:

> "I can help you search products, manage your cart, or checkout."

## FR-21 — User Interruption

The agent shall support interruption during agent speech.

Expected behavior:

```text
Agent speaking
  ↓
User interrupts
  ↓
Stop/interrupt current response
  ↓
Listen to new request
  ↓
Process new request
```

---

# 8. Checkout Requirements

## FR-22 — Checkout Validation

Checkout shall verify:

- Cart is not empty.
- Product quantities are valid.
- Products are available.
- Final total is calculated.

## FR-23 — Explicit Confirmation

The agent must not initiate payment merely because the user says:

> "Checkout."

Instead:

> "Your total is ₹495. Would you like to proceed to payment?"

Only an explicit confirmation should initiate payment.

Valid examples:

- "Yes."
- "Proceed."
- "Pay now."
- "Confirm."

If the user says:

- "Wait."
- "No."
- "Cancel."

Payment must not start.

---

# 9. Payment Requirements

## FR-24 — Razorpay Integration

The system shall integrate Razorpay for payment.

Razorpay order creation and payment signature verification shall be implemented in the Python FastAPI backend using the Razorpay Orders API and Checkout.js. The FastAPI backend shall recompute the order total from the JSON catalog and shall never trust a total sent by the client.

The exact Razorpay API requirements shall be verified during implementation. Razorpay MCP is optional developer tooling only; the voice agent never calls payment APIs directly.

## FR-25 — Payment Flow

```text
Checkout
  ↓
Calculate total
  ↓
User confirmation
  ↓
Create payment/order
  ↓
Razorpay checkout
  ↓
Payment result
  ↓
Verify result
  ↓
Success / Failure
```

## FR-26 — Payment Success

After verified successful payment:

- Show order success screen.
- Display order reference.
- Clear cart.
- Agent confirms successful order.

Example:

> "Your payment was successful and your order has been placed."

## FR-27 — Payment Failure

If payment fails:

- Do not mark order as paid.
- Show failure state.
- Explain that payment was unsuccessful.
- Allow retry.
- Allow return to cart.

The system must never assume that opening the Razorpay checkout means payment succeeded.

---

# 10. Data Requirements

## 10.1 No Database

The initial version shall not use a database.

Static catalog data will be stored in JSON.

Suggested structure:

```text
frontend/data/
├── products.json
├── categories.json
├── offers.json
└── pricing-cases.json   (shared pricing test cases)
```

The Next.js app reads these files for the catalog, search and pricing. The FastAPI backend reads the same files read-only to recompute payment totals. Neither writes to them.

## 10.2 Runtime State

Runtime cart/session state shall be maintained in frontend/application state.

Recommended:

- Zustand

or

- React state/context for a smaller implementation.

## 10.3 Data Source Principle

JSON is the catalog source.

The agent must not directly modify JSON files.

Actions should flow through controlled application functions. The voice agent (Python) operates the browser's cart and UI only through LiveKit RPC calls that run the same shared actions as the manual UI.

---

# 11. Technical Requirements

## 11.1 Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Responsive design
- App Router

The frontend owns the JSON catalog, search/filter, cart and pricing.

## 11.2 Backend

- Python 3.12+
- FastAPI
- Responsibilities: LiveKit token generation, Razorpay order creation and payment verification.
- Holds all secrets (LiveKit API secret, Razorpay key secret).
- Stateless; no database.

## 11.3 State

- Zustand preferred for cart/session state.

## 11.4 Voice

- LiveKit
- LiveKit Voice Agent (Python, LiveKit Agents framework), runs as a separate worker process
- Real-time audio/events
- LiveKit RPC between the agent and the browser

## 11.5 Payment

- Razorpay (Orders API + Checkout.js)
- Server-side logic in FastAPI using the official `razorpay` Python SDK

## 11.6 Data

- JSON files
- No database

## 11.7 Code Quality

The project should use:

- Reusable components.
- Typed interfaces.
- Small focused functions.
- Centralized business actions.
- Clear error handling.
- Environment variables for secrets.
- No secrets committed to Git.

---

# 12. Application Routes

```text
/
├── /category/[category]
├── /product/[id]
├── /search
├── /cart
├── /checkout
└── /order-success
```

Potential future routes:

```text
/orders
/profile
/settings
```

---

# 13. Suggested Project Structure

```text
cartiva-ai/
├── frontend/              # Next.js app
│   ├── app/               # views (App Router)
│   │   ├── page.tsx
│   │   ├── category/[category]/
│   │   ├── product/[id]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── search/
│   │   └── order-success/
│   ├── components/        # views
│   ├── hooks/             # read-only view models
│   ├── controllers/       # thin entry points (UI events + voice RPC)
│   ├── services/          # business rules: catalog, pricing, cart, checkout, payment
│   ├── models/
│   │   ├── entities/
│   │   └── repositories/  # JSON data access behind interfaces
│   ├── store/             # Zustand state only
│   ├── lib/
│   │   ├── container.ts   # composition root
│   │   └── voice/         # LiveKit client + RPC handlers
│   ├── types/
│   ├── data/
│   │   ├── products.json
│   │   ├── categories.json
│   │   ├── offers.json
│   │   └── pricing-cases.json
│   ├── public/
│   ├── .env.local
│   └── package.json
│
├── backend/               # Python (FastAPI + LiveKit agent)
│   ├── pyproject.toml
│   ├── .env               # LiveKit + Razorpay secrets
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── catalog.py     # read-only JSON loader
│   │   ├── pricing.py     # pricing port for payment totals
│   │   └── routers/
│   │       ├── livekit.py # POST /api/livekit/token
│   │       └── payment.py # POST /api/payment/create-order, /verify
│   ├── agent/
│   │   ├── worker.py
│   │   ├── tools.py
│   │   ├── context.py
│   │   └── rpc.py
│   └── tests/
│
├── README.md
├── SRS-PRD.md
└── PLAN.md
```

The exact folder structure can be adjusted during implementation if a simpler structure improves maintainability.

---

# 14. Non-Functional Requirements

## NFR-01 — Performance

- Product browsing should feel immediate.
- Cart updates should be reflected without unnecessary page reloads.
- Voice actions should provide visible execution feedback.
- Avoid unnecessary API requests.

## NFR-02 — Responsiveness

The application shall work across:

- Mobile.
- Tablet.
- Desktop.

Primary portfolio target:

```text
320px → 1440px+
```

## NFR-03 — Accessibility

The application should provide:

- Keyboard navigation.
- Accessible buttons.
- Visible focus states.
- Meaningful labels.
- Proper semantic HTML.
- Voice controls with clear status.

## NFR-04 — Reliability

The application shall handle:

- LiveKit connection failure.
- Voice action failure.
- Product not found.
- Product out of stock.
- Invalid quantity.
- Empty cart.
- Payment failure.
- Network/API failure (including FastAPI backend unreachable).

## NFR-05 — Security

- Never expose private API keys in frontend code.
- Use environment variables for secrets.
- Keep LiveKit and Razorpay secrets only in the FastAPI backend environment.
- Validate payment results server-side (FastAPI signature verification).
- Do not trust client-provided payment success.
- Restrict agent actions to approved tools.

---

# 15. UX Requirements

## Voice Assistant States

### Idle

```text
🎤 Ask Cartiva
```

### Listening

```text
🎤 Listening...
```

### Thinking

```text
✨ Thinking...
```

### Executing

```text
🛒 Adding to cart...
```

### Success

```text
✓ Added to cart
```

### Error

```text
⚠ Something went wrong
```

### Disconnected

```text
⚠ Connection lost
[Reconnect]
```

### Speaking

```text
🔊 Speaking...
```

The UI should make it clear whether the agent is:

- Listening.
- Thinking.
- Performing an action.
- Speaking.
- Disconnected.

---

# 16. Example End-to-End Scenario

### Step 1

User:

> "I want to buy groceries."

Agent opens or focuses the grocery shopping experience.

### Step 2

User:

> "Show me vegetables."

Agent navigates/filters to vegetables.

### Step 3

User:

> "Add 1 kg tomatoes and 2 kg potatoes."

Agent:

1. Searches products.
2. Validates matches.
3. Validates stock.
4. Adds requested quantities.
5. Updates cart.
6. Confirms the result.

### Step 4

User:

> "Now show me dishwashing liquids under ₹200."

Agent filters the catalog.

### Step 5

User:

> "Which one is cheapest?"

Agent identifies the cheapest currently displayed matching product.

### Step 6

User:

> "Add that one."

Agent uses conversation context to identify the product and adds it.

### Step 7

User:

> "What's my bill?"

Agent returns:

```text
Subtotal
Discount
Delivery
Final Total
```

### Step 8

User:

> "Checkout."

Agent:

> "Your total is ₹495. Would you like to proceed to payment?"

### Step 9

User:

> "Yes."

Payment flow begins.

### Step 10

Razorpay reports success.

Agent:

> "Your payment was successful and your order has been placed."

---

# 17. Acceptance Criteria

The MVP is considered complete when:

- [ ] User can browse products manually.
- [ ] User can search products.
- [ ] User can filter products.
- [ ] User can open product details.
- [ ] User can add products manually.
- [ ] User can modify cart quantities.
- [ ] User can remove products.
- [ ] Cart total is calculated correctly.
- [ ] Voice assistant can connect through LiveKit.
- [ ] Voice assistant can understand supported shopping requests.
- [ ] Voice agent can search products.
- [ ] Voice agent can filter products.
- [ ] Voice agent can navigate categories.
- [ ] Voice agent can add products.
- [ ] Voice agent can remove products.
- [ ] Voice agent can update quantities.
- [ ] Voice agent can read cart contents.
- [ ] Voice agent can calculate the bill.
- [ ] Agent handles ambiguous products.
- [ ] Agent handles unavailable products.
- [ ] Agent handles partial stock.
- [ ] Agent maintains relevant conversational context.
- [ ] Agent supports interruption.
- [ ] Checkout requires explicit confirmation.
- [ ] Razorpay payment flow works.
- [ ] Payment success is verified.
- [ ] Payment failure is handled.
- [ ] UI reflects voice actions immediately.
- [ ] Application is responsive.
- [ ] No database is required.
- [ ] Secrets are not committed.
- [ ] Project can be deployed.

---

# 18. Future Enhancements

Possible future versions may include:

- User accounts.
- Persistent orders.
- Database integration.
- Personalized recommendations.
- AI-powered product recommendations.
- Smart shopping lists.
- "Buy my usual groceries" workflows.
- Order history.
- Delivery tracking.
- Coupons.
- Multiple payment methods.
- Multilingual voice support.
- Customer support voice agent.
- Inventory synchronization.
- Real grocery delivery integration.

These are outside the initial MVP.

---

# 19. Success Definition

Cartiva succeeds as a portfolio project when a reviewer can see one continuous experience:

```text
Browse manually
      ↓
Switch to voice
      ↓
Ask naturally
      ↓
AI understands context
      ↓
AI executes real application actions
      ↓
UI changes
      ↓
AI reports the result
      ↓
Checkout
      ↓
Explicit confirmation
      ↓
Payment
      ↓
Order success
```

The most important demonstration is that **voice is an interface to the application, not a separate chatbot.**
