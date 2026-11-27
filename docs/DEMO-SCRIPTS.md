# Demo video scripts (about 90 seconds each)

One script per store. The spoken lines are the ones the evals check (`backend/evals/scenarios/`), so the assistant
handles them reliably. Times are a guide; cut pauses in editing.

## Before recording (all stores)

- **Wake the API** a minute before: open https://cartiva-api-mrnb.onrender.com/api/health (the free plan sleeps).
- **Voice credit:** LiveKit's free plan gives about 50 voice minutes a month, shared by all three stores. Rehearse
  the clicks without voice, then record voice in one or two focused takes.
- Use **headphones** (so the assistant doesn't hear itself) and a quiet room. Chrome, window ~1440 px wide,
  dark theme (default), zoom 100 %.
- Start with an **empty cart** (open the cart and remove items, or use a fresh private window).
- Write the **shopping list on paper** beforehand (each script says what to write) and photograph it with the
  phone, or keep the photo ready on the laptop.
- **Payment is Razorpay test mode** (no real money): choose **Netbanking → any bank → Success**, or UPI
  `success@razorpay`.
- Concept stores: keep the footer line visible at least once ("Concept demo by Cartiva, not affiliated with …").

---

## 1. Cartiva (grocery) — https://cartiva-kohl.vercel.app

**Paper list:** `Surf Excel`, `Coriander`, `Garlic`

| Time | Do / say | What viewers see |
|---|---|---|
| 0:00–0:08 | Show the home page. Voice-over: "Cartiva is a grocery store you can shop just by talking." | Voice panel, scan card, deals band |
| 0:08–0:15 | Tap **Ask Cartiva**. | Sphere wakes; "Hi, I'm Cartiva!" |
| 0:15–0:25 | Say **"Show me vegetables."** | Vegetables aisle opens; "Here are the vegetables…" |
| 0:25–0:35 | Say **"Add 2 kg potatoes."** | Glowing pointer clicks Potato; it flies to the cart |
| 0:35–0:45 | Say **"Mujhe ek kilo tamatar chahiye."** | Tomato added; reply in Hindi |
| 0:45–0:55 | Say **"Show only discounted vegetables."** | Offers page filtered to vegetables, deal badges |
| 0:55–1:10 | Say **"I want to scan a list"**, upload the photo. | Lines sorted into ready / choose; Cartiva reads them, asks about Surf Excel; answer, then **"Yes, add everything."** |
| 1:10–1:25 | Say **"Checkout"**, then **"Yes, pay now."** | Total read out; Razorpay opens; Netbanking → Success |
| 1:25–1:30 | — | "Your payment was successful and your order is placed." Order success page |

---

## 2. Coca-Cola Store (concept) — https://cartiva-for-cocacola.vercel.app

**Paper list:** `2 thums up 750`, `Maaza`, `Pepsi` (Pepsi is not sold here: shows "not sold here")

| Time | Do / say | What viewers see |
|---|---|---|
| 0:00–0:08 | Home page. Voice-over: "A concept voice store for Coca-Cola drinks in India." | Red theme, CocaVoice panel, deals band |
| 0:08–0:15 | Tap **Ask CocaVoice**. | "Hi, I'm CocaVoice from the Coca-Cola Store!…" |
| 0:15–0:27 | Say **"Add 2 Thums Up 750 ml bottles."** | Pointer clicks Thums Up 750 ml; quantity 2 in the cart |
| 0:27–0:37 | Say **"do Sprite can add kar do."** | 2 Sprite cans added (Hinglish) |
| 0:37–0:47 | Say **"Show only discounted juices."** | Offers page filtered to juices (Maaza deal) |
| 0:47–1:07 | Tap **Scan list**, upload the photo. | Thums Up ready, Maaza "choose one", Pepsi "not sold here". Say **"For Maaza take the 600 ml one"**, then **"Yes, add everything to my cart."** |
| 1:07–1:22 | Say **"Checkout"**, then **"Yes, pay now."** | Total with free delivery; Razorpay → Netbanking → Success |
| 1:22–1:30 | Scroll to the footer. | Order placed; "Concept demo by Cartiva, not affiliated with The Coca-Cola Company" |

---

## 3. PepsiCo Store (concept) — https://cartiva-for-pepsico.vercel.app

**Paper list:** `2 pepsi 750`, `Slice`, `Coca-Cola` (Coca-Cola is not sold here: shows "not sold here")

| Time | Do / say | What viewers see |
|---|---|---|
| 0:00–0:08 | Home page. Voice-over: "A concept voice store for PepsiCo drinks and snacks in India." | Blue theme, PepsiCoVoice panel, deals band |
| 0:08–0:15 | Tap **Ask PepsiCoVoice**. | "Hi, I'm PepsiCoVoice from the PepsiCo Store!…" |
| 0:15–0:25 | Say **"do Pepsi can add kar do."** | 2 Pepsi cans added (Hinglish) |
| 0:25–0:35 | Say **"Add 2 Mountain Dew 750 ml bottles."** | Pointer clicks Mountain Dew 750 ml; quantity 2 |
| 0:35–0:45 | Say **"Show only discounted chips."** | Offers page filtered to chips (Lay's, Doritos deals) |
| 0:45–1:05 | Tap **Scan list**, upload the photo. | Pepsi ready, Slice "choose one", Coca-Cola "not sold here". Say **"For Slice take the 600 ml one"**, then **"Yes, add everything to my cart."** |
| 1:05–1:20 | Say **"Checkout"**, then **"Yes, pay now."** | Total read out; Razorpay → Netbanking → Success |
| 1:20–1:30 | Scroll to the footer. | Order placed; "Concept demo by Cartiva, not affiliated with PepsiCo" |

**Avoid in the PepsiCo take:** a bare "Add Pepsi" (it adds the can instead of asking the size). Say the pack:
"a Pepsi can", "Pepsi 750 ml".

---

## Optional extra shots (any store)

- **Safety:** say "Checkout", then "No, wait": nothing is charged, the cart stays.
- **Asks when unsure:** "Add Thums Up" / "Add Lay's": the options are highlighted and it asks which one.
- **Low stock:** "Add 5 Coke Zero cans" / "Add 5 Doritos Nacho Cheese": it offers the 3 that are left.
