# Handoff: Cartiva white-label (Cartiva + Coca-Cola + PepsiCo)

Written so a new Claude Code session can continue without the earlier conversation. Read this file,
`CLAUDE.md` (architecture rules: MVC + SOLID, mandatory) and `README.md` first.

**Last updated:** 2026-11-27 · **Last commit:** `22bffb6 feat(brand): Coca-Cola concept store` (pushed to `main`)

---

## 1. Goal

Build the same voice-shopping product as three demo stores from **one codebase**, each with its own link,
to make demo videos for companies:

| Store | Brand id | Assistant name | Link | Status |
|---|---|---|---|---|
| Cartiva (grocery) | `cartiva` | Cartiva | https://cartiva-kohl.vercel.app | ✅ live |
| Coca-Cola concept store | `coca-cola` | **CocaVoice** | https://cartiva-for-cocacola.vercel.app | ⚠️ live, but CORS not yet updated (see §4) |
| PepsiCo concept store | `pepsico` | **PepsiCoVoice** | not created yet | 🟡 Phase 5 built locally; needs push, `lk agent deploy`, Vercel project + CORS |

Everything runs on **free tiers**. India market (₹, Hindi/Hinglish voice). Concept stores use brand colours and name
but **no official logos**, and show "Concept demo by Cartiva, not affiliated with …; illustrative prices".

## 2. How the user wants to work (important)

- **Never `git commit`, `git push` or stage files.** Finish a phase, run all checks, then give the user a ready
  commit message (one command per line for PowerShell; multi-line pastes broke before). The user commits.
- **Phase by phase**, one commit per phase. The app must work and be deployable after every phase.
- **Budget-conscious:** free tiers; say the cost before running anything billable; prefer cheap variants.
- **Deploys:** after the user pushes, Claude may run `lk agent deploy` (the user agreed). Vercel/Render redeploy
  on push automatically. The user does dashboard steps (Vercel projects, Render env vars) themselves.
- UI taste: calm and professional (no idle animations, no "childish" styles), dark theme default (charcoal grey,
  not black), voice and scan-list are the headline features, offers should look like real ads.

## 3. Architecture (as built)

```
 Vercel: cartiva-kohl          ─┐  NEXT_PUBLIC_BRAND=cartiva
 Vercel: cartiva-for-cocacola  ─┼─▶ Render API (one) ──token{brand}──▶ LiveKit Cloud: ONE agent
 Vercel: (pepsico, Phase 5)    ─┘  NEXT_PUBLIC_BRAND=coca-cola|pepsico     reads ctx.job.metadata {"brand"}
```

- **Brand registry:** `frontend/data/brands/<brand>/` → `products.json`, `categories.json`, `offers.json`,
  `delivery.json`, `brand.json`. Registered in `frontend/data/brands/index.ts` (static imports).
  `frontend/lib/brand.ts` picks the brand from `NEXT_PUBLIC_BRAND` (default `cartiva`, unknown → throws).
  `frontend/data/pricing-cases.json` is a self-contained pricing fixture (not a brand).
- **`brand.json`** (type: `frontend/models/entities/brand.ts`): store name, wordmark, `conceptFor`, meta, tagline,
  delivery time/areas, assistant name, voice examples, search placeholder/suggestions, featured aisle,
  whole-order image category, deal example, `listScan` (vision prompt wording), `palette` (light+dark hex scales,
  null = default green), and `agent`: `greeting`, `ttsVoice`, `sttPriorityKeyterms`, `prompt` (19 slots, below).
- **Website:** copy, colours (CSS vars injected in `app/layout.tsx`), offer banners, deals band all read the brand.
  Services get the brand via the composition roots (`lib/container.ts`, `lib/client-container.ts`).
- **API (one Render service):** `backend/app/catalog.py` (`get_catalog(brand)`, `get_brand`, `get_categories`,
  `known_brands`, `resolve_brand`; `BRANDS_DIR`, `DEFAULT_BRAND`). Token, payment and list-scan endpoints take an
  optional `brand` (default `cartiva`); unknown → `400 UNKNOWN_BRAND`. The token puts `{"brand"}` in the
  agent dispatch metadata.
- **Voice agent (one LiveKit deployment):** `backend/agent/worker.py` entrypoint → `profile_for_job(ctx.job.metadata)`
  (`backend/agent/brand_profile.py`) → per-call instructions, greeting, TTS voice, STT keyterms, aisles.
  Instructions = shared template `backend/agent/instructions.py` + the brand's `agent.prompt` slots:
  `store_description, shop_for, language_examples, search_example, current_page_example, plain_product_example,
  pack_size_example, ambiguous_example, category_example, offers_aisle_example, category_open_example,
  tie_example, hindi_number_example, highlight_example, list_readout_example, list_choice_example,
  misheard_words, misheard_remove_example, misheard_extra_word_example`.
  Copy `frontend/data/brands/coca-cola/brand.json` as the model for a new brand.

## 4. Pending right now (finish Phase 4)

1. **User:** on Render → `cartiva-api` → Environment, set
   `CORS_ORIGINS=["https://cartiva-kohl.vercel.app","https://cartiva-for-cocacola.vercel.app","http://localhost:3000"]`
   and save. Until then the Coca-Cola site's voice/payment/list scan are blocked by the browser.
2. **Claude:** verify — CORS preflight from `https://cartiva-for-cocacola.vercel.app` to
   `https://cartiva-api-mrnb.onrender.com/api/livekit/token` returns the allow-origin header; the page title is
   "Coca-Cola Store — …" and shows "Ask CocaVoice"; a token with `{"brand":"coca-cola"}` dispatches
   `{"brand": "coca-cola"}` (already verified on the API).
   The voice agent is already deployed at commit `22bffb6`.

## 5. What's left

### Phase 5 — PepsiCo concept store (link 3) — built, not yet pushed
Done: 34 SKUs (`pc01`–`pc34`), aisles soft-drinks · juices · sports-and-water · chips · namkeen · breakfast
(Sting and Cheetos left out: no trustworthy photos), 7 deals + 2 store offers, `brand.json`, `pepsico.yaml`
(33 scenarios). Evals `2026-11-27_1959_all` (Cartiva 30/30, Coca-Cola 31/31, PepsiCo 32/33) and
`2026-11-27_2010_pepsico` (32/33). Known miss: a bare "Add Pepsi" adds the can instead of asking the size.
Shared fix in `worker.py`: the search "plain match" hint now says to keep the shopper's quantity (Hindi "do" = 2);
"do Pepsi can" added 1 because "Pepsi can" matched Pepsi Can and Pepsi Black Can.
Remaining: push → `lk agent deploy` → Vercel project + CORS (below). Original spec:
- `frontend/data/brands/pepsico/` (5 files) + register in `frontend/data/brands/index.ts`.
- ~35–40 India SKUs, prefix ids `pc01…`: Pepsi, Pepsi Black, 7UP, Mirinda, Mountain Dew, Sting, Slice, Tropicana,
  Gatorade, Aquafina; Lay's (several flavours), Uncle Chipps, Doritos, Kurkure, Cheetos; Quaker Oats.
  Aisles: Soft Drinks · Energy & Sports · Juices · Chips · Namkeen · Breakfast. Realistic pack sizes
  (`unit` like "750 ml", "52 g"; names without sizes; cans named "… Can"), Hindi/Hinglish tags,
  a couple of low/out-of-stock items, ~7 product deals + 2 store offers, delivery fee 30 / free above 199.
- `brand.json`: store "PepsiCo Store", wordmark "pepsico store", `conceptFor: "PepsiCo"`, Pepsi blue palette
  (base ~`#004B93`; write light and dark scales like Coca-Cola's), assistant **PepsiCoVoice**, greeting
  "Hi, I'm PepsiCoVoice from the PepsiCo Store! …", all 19 prompt slots with PepsiCo examples, keyterms
  (include "PepsiCoVoice" and "Pepsi Co Voice"; keep total ≤ 500 characters — tests check it).
- Photos: best-matching Unsplash. **Check every photo by eye** (make a contact sheet with PIL, which is in the
  backend venv) — titles lie (a "Sprite" photo was Mineragua, a "coke" can was Dr Pepper). No competitor logos,
  no alcohol. Already verified usable: 7UP can `photo-1624517286326-62fc932dffca`; Mountain Dew bottles in a fridge
  (also shows Kickstart) `photo-1579895989279-38560ff80a3e`. From the Cartiva catalog: Lay's
  `photo-1528751014936-863e6e7a319c`, Kurkure `photo-1754088605508-4148fefd8a43`, Quaker
  `photo-1722882270575-f437c338a4de`, orange juice `photo-1600271886742-f049cd451bba`, water bottle
  `photo-1616118132534-381148898bb4`. Still needed: Pepsi can/bottle, more chips, Doritos, sports drink, etc.
  Unsplash blocks curl; use WebSearch (allowed_domains unsplash.com) to find photo pages, then the **web-fetch
  agent** to read each page's `images.unsplash.com/photo-…` URL. Image URLs go in without query strings
  (the loader in `frontend/lib/image-loader.ts` adds them).
- Evals: `backend/evals/scenarios/pepsico.yaml` (~30, mirror `coca-cola.yaml`: sizes, ties, low stock,
  scanned list with a Coca-Cola product that isn't sold, Hinglish "do Pepsi can add kar do", offers vs price
  limits, checkout safety). Gate: safety 100 %, overall ≥ 90 %.
- Checks, then commit message `feat(brand): PepsiCo concept store`; after push: `lk agent deploy`; user creates
  Vercel project `cartiva-for-pepsico` (`NEXT_PUBLIC_BRAND=pepsico`, `NEXT_PUBLIC_BACKEND_URL=https://cartiva-api-mrnb.onrender.com`)
  and adds its URL to Render `CORS_ORIGINS`.

### Phase 6 — Demo kit
- README section: multi-brand setup (add a brand = folder + index.ts entry + Vercel project + CORS) and evals.
- A ~90-second **video script per brand** (voice order, "show only discounted …", scan a list, checkout with a
  Razorpay test payment: Netbanking → Success, or UPI `success@razorpay`, or card `5267 3181 8797 5449`).
- Final eval run across all three brands; final live check of all three links.
- Commit message `docs: multi-brand setup, demo video scripts and eval results`.

## 6. Commands and accounts (this machine: Windows)

| What | How |
|---|---|
| Backend tests (fast, free) | `cd backend` → `.venv\Scripts\python -m pytest -q --ignore=tests/test_conversation.py` (97 pass) |
| Conversation tests | use LiveKit's free credit (keep for voice demos) — prefer the evals |
| Evals (OpenAI key, ~$0.07 per brand) | `cd backend` → `uv run python -m evals.run --brand all` (or `--brand coca-cola`, `--only <id or category>`); results in `backend/evals/results/` |
| Frontend | `cd frontend` → `npm test` (125 pass), `npx tsc --noEmit`, `npx eslint app components controllers services models lib store hooks data`, `npm run build` (per brand: set `NEXT_PUBLIC_BRAND`) |
| Run a brand locally | `NEXT_PUBLIC_BRAND=coca-cola npm run dev` (only one `next dev` per folder; stop the old one first — on Windows the node process may survive, check the port) |
| Local API | `cd backend` → `.venv\Scripts\fastapi dev app/main.py` |
| Local agent | `cd backend` → `.venv\Scripts\python -m agent.worker dev` (backend/.env has `CARTIVA_AGENT_NAME=cartiva-agent-dev`, so laptop calls never reach the cloud agent) |
| uv | `C:\Users\rsmpa\.local\bin\uv.exe` (not on the Bash PATH) |
| LiveKit CLI | `%LOCALAPPDATA%\Microsoft\WinGet\Packages\LiveKit.LiveKitCLI_Microsoft.Winget.Source_8wekyb3d8bbwe\lk.exe`; run `lk agent deploy --yes` **from the repo root**; project `cartiva`, agent `CA_eG7aJRBkjBNE` (`cartiva-agent`), region ap-south; check with `lk agent status` / `lk agent logs` |
| API | https://cartiva-api-mrnb.onrender.com (`/api/health`, `/docs`); kept awake by a cron-job.org ping |
| Repo | github.com/kaursimar12/Cartiva, branch `main` |

## 7. Lessons learned (avoid repeating)

- Text-mode `AgentSession.run` skips `on_user_turn_completed`; evals and conversation tests call
  `assistant.set_reply_language(text)` first, like a real voice turn.
- Tool "say" instructions get the turn's reply-language rule appended (`_in_reply_language`), or Hindi requests got
  English replies after a search.
- `show_offers` only runs if the shopper's words contain an offer word (`OFFER_WORDS` in `worker.py`); price limits
  ("under 200 rupees") are searches. Don't put example phrases in the *wrong* tool's description — the model
  copies them.
- Search matches pack sizes (`packWords` in `services/catalog-service.ts`, mirrored in `tests/fake_browser.py`).
- Windows shell: long inline Python heredocs break on quotes/escapes (a `\b` became a backspace once). Write
  scripts to a file, or build tricky characters with `chr()`.
- Free LiveKit plan: 1 agent deployment, ~$2.50 inference credit (~50 voice minutes/month) shared by all stores.
- Brand prompt slots get copied literally: an aisle example ("Here are the chips, seven packs") made the agent open
  that aisle for product requests. Keep examples on products that don't collide with eval/demo phrases.
- "कुरकुरे" also means "crunchy" in Hindi; the agent may open the Namkeen aisle for it (all Kurkure, acceptable).
