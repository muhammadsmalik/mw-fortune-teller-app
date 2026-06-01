# Agent WALLi Insights — "See what WALLi found on you" (PRD)

_Status: **DRAFT for review** · Author: Salman · Created: 2026-06-01 · Branch: `claude/integrate-ai-scoring-module-luquf`_

> This is the **product requirements** doc (the *what* and the *why* and the *logic*).
> The companion **technical/architecture** doc is `MASTER_DOCS/WALLI_INSIGHTS_TECH_ARCH.md`
> (the *how*). Read this one first.
>
> **How to use this doc:** it is written to be handed to an AI (or a teammate) to (a)
> verify the logic and recommend changes, then (b) generate test cases and starting
> code. Every requirement is numbered (`R#`) and every open decision is called out in
> §9 so a reviewer can resolve them without guessing.

---

## 1. Summary

Today the booth flow ends with a networking match + concierge intro:

```
/select-name  →  /reveal  →  /concierge  →  /confirmation
   pick name     see 3 people,   enter email,      thank-you
                 select 1–3      confirm intro      + reset
```

The **AI scoring module** already exists in the repo but is **not wired into the app**
(it runs as standalone scripts). This feature integrates it into the core flow: at the
end of the journey, **right before the attendee confirms they want to get matched**, WALLi
offers them an optional second reading — **a data-driven scorecard of how their own media
business looks to buyers and AI assistants**, across three dimensions:

1. **Discoverability** — how easily buyers and AI assistants can *find* their inventory.
2. **Ease of Purchase** — how easily a buyer can actually *transact* (programmatic / marketplaces).
3. **Measurement** — whether they *prove* what a campaign delivered (audience data, verification).

The offer is a single **yes/no prompt** inside the main flow (no separate QR code, no
separate device) — per the 30 May decision (`MASTER_DOCS/30-5-demo.md`):

> _"Interaction flow feature integration — The secondary discovery feature will be
> integrated into the main user flow via a yes/no prompt rather than using separate QR codes."_

> _"Agent WALLi Feature Expansion — \[Salman] proposed adding a feature where the system
> asks users if they would like to receive additional discoverability insights … rather
> than creating a separate flow."_

---

## 2. Background & rationale

- **The asset exists.** `scripts/score-mockup.mjs` already scores one media owner across the
  three dimensions using live Google-Search-grounded Gemini calls, with a 3-layer
  anti-hallucination guard (prevent / verify / reject), and renders an on-brand HTML
  scorecard. `scripts/score-all.mjs` is the batch/precompute variant. A deterministic
  self-assessment questionnaire also exists (`components/fortune-journey/SelfAssessment.js`).
  The booth email route even already has a `lookupScore()` helper
  (`app/api/send-email/route.js`). **What's missing is the in-flow integration.**
- **It deepens the value exchange.** The attendee already gets *who to meet*. This adds
  *here's where you stand* — a personalised, credible, take-away reason to engage with
  Moving Walls (whose products map onto exactly these three gaps).
- **It's a qualification signal.** A low score on a dimension is a warm lead for the
  matching MW product (Discoverability→Studio, Ease of Purchase→Market, Measurement→Measure).

### Branding constraint (hard requirement)
Per the 30 May "branding pivot" decision, copy and visuals must read as a **scientific,
data-driven agent analysis — NOT fortune-telling**. No "prophecy", "Oracle's Reading",
"the cards", "mystical" language **in the in-app feature**. (The existing
`score-mockup.mjs` email is still written in the old Oracle voice — see `R-COPY` and
the tech doc; that voice must not ship in the in-flow screen.)

---

## 3. Goals / Non-goals

### Goals
- **G1** Surface the existing AI scorecard inside the live booth flow, with zero extra hardware.
- **G2** Keep the core path (match → intro) fast and unblocked; insights are **opt-in and skippable**.
- **G3** Booth-grade reliability: works offline, never shows an un-grounded/hallucinated claim,
  never dead-ends if a score is missing.
- **G4** On-brand: science/data voice, Agent WALLi visual system.
- **G5** Reuse existing infrastructure (precompute scripts, email route, localStorage step model).

### Non-goals (this version)
- **N1** Not building a new public/marketing scorecard page or a separate QR flow.
- **N2** Not combining the AI-research score with the subjective self-assessment questionnaire
  in v1 (that's a candidate v2 — see §8). v1 ships the **AI-research scorecard only**, so the
  flow stays fast (no extra questions at the booth).
- **N3** Not persisting scores per-attendee in a database; precomputed static data + optional
  live generation only.
- **N4** Not scoring non-media-owner personas (event is media-owner-only; `lib/event-config.js`).

---

## 4. Users & placement

**User:** a WOO London attendee (a media owner) at the booth, mid-flow, on the booth device
or their phone.

**Placement (primary recommendation):** between match selection and the intro confirmation —
i.e. the moment described as *"right before they confirm they want to get matched."*

```
/reveal                         /concierge                /confirmation
 select 1–3                       enter email,
 tap "Ask WALLi for an intro"     confirm intro
        │                                ▲
        ▼                                │
   ┌─────────────────┐   yes    ┌────────────────┐
   │  WALLi offer     ├────────►│  /insights      │──── "Continue to my intros" ──┐
   │  (yes/no prompt) │         │  scorecard      │                               │
   └────────┬─────────┘         └────────────────┘                               │
            │ no                                                                  │
            └───────────────────────────────────────────────────────────────────┴──► /concierge
```

- The **offer** is a small yes/no prompt (modal or lightweight interstitial) fired when the
  attendee taps **"Ask WALLi for an intro (N)"** on `/reveal`.
- **Yes** → show the scorecard (`/insights`), which ends with a **"Continue to my intros"**
  button that proceeds to `/concierge`.
- **No** → go straight to `/concierge` (unchanged behaviour).

> **Open decision `D1` (placement) —** the 30 May notes also floated showing insights
> *after* the intro request ("after requesting introductions"). This PRD recommends
> *before* confirm (per the latest instruction) because it raises perceived value at the
> moment of commitment and keeps a single linear path. The alternative (offer it on
> `/confirmation`, after the intro is sent) is lower-risk to the conversion funnel. See §9.

---

## 5. The core logic (requirements)

### 5.1 The offer prompt
- **R1** On `/reveal`, when the attendee has ≥1 match selected and taps the primary CTA, show a
  yes/no offer **before navigating**. The CTA's existing job (persisting `selectedMatches`)
  still happens first so no selection is lost.
- **R2** The offer copy is data-framed and second-person, e.g.:
  > _"Before I introduce you — want to see what I found on **you**? I scanned your public
  > footprint the way a buyer (or an AI) would, and scored how easy you are to **find**,
  > **buy**, and **believe**."_
  > **[Show me what you found]**  ·  **[No thanks, just the intros]**
- **R3** The offer must be dismissible to "No" with one tap and must never block the intro path.
- **R4** If **no score is available** for this attendee and live generation is **not** possible/enabled
  (see R10/R11), **do not show the offer at all** — go straight to the existing CTA→`/concierge`
  behaviour. (Don't offer something we can't deliver.)

### 5.2 The scorecard screen (`/insights`)
- **R5** Show an **overall score (0–100)** = mean of the dimensions that were successfully scored.
- **R6** Show the **three dimensions**, each with: a label, a 0–100 score, a score bar, and up to
  **3 short, second-person, evidence-backed bullets** ("what buyers see").
- **R7** Show a one-line **summary** that names the weakest scored dimension as the fastest win
  (e.g. _"Your biggest opportunity is Measurement (40/100)."_).
- **R8** Show a **trust line**: _"WALLi based this on N live web sources,"_ where N is the count of
  grounded sources. If a dimension could not be grounded, its score is **withheld** (shown as
  "—") with a short honest note — **never** a fabricated number or claim. (Mirrors the existing
  `score-mockup.mjs` behaviour.)
- **R9** The screen ends with a primary **"Continue to my intros"** → `/concierge`, and a
  secondary **"Email me the full report"** (optional, see R12). A back affordance returns to `/reveal`.

### 5.3 Data availability & generation
- **R10** **Known attendees (precomputed):** scores are precomputed for the attendee/pool list and
  looked up by slug at runtime (works offline at the booth). This is the default path.
- **R11** **Walk-ins / missing scores (live):** if there's no precomputed score, the system MAY
  generate it live (grounded Gemini), behind a WALLi "analysing…" loading state.
  - **R11a** Live generation has a hard timeout (recommend ≤ 25s). On timeout/failure, fall back
    to **R12** (offer to email it) rather than spin forever or show an error dead-end.
  - **R11b** Whether live generation is enabled at the booth is a config flag (`D3`).
- **R12** **Async fallback ("email it to me"):** if a score can't be shown on screen in time (R11a)
  or the attendee prefers, WALLi captures it as a job and **emails the full scorecard** later,
  reusing the email pipeline (`app/api/send-email`, `lookupScore`). This also covers the
  case where we'd rather not make a booth visitor wait.

### 5.4 Anti-hallucination (carried over, non-negotiable)
- **R13** Every on-screen claim must be grounded in a retrieved web source (Layer 2 verification in
  `score-mockup.mjs`). Ungrounded bullets are dropped; ungrounded dimensions are withheld.
- **R14** Marketing-fluff phrases are rejected (Layer 3 blocklist: "world-class", "cutting-edge",
  "leverage", "seamless", "unlock", placeholders, etc.).
- **R15** "The swap test": a bullet that would still read as true with a rival company's name
  swapped in is too generic and must be regenerated/dropped.

### 5.5 Privacy & analytics
- **R16** The scorecard is about the attendee's **own public business footprint** — no third-party
  personal data is shown. The 30 May **email-pre-fill privacy rule still applies** to the
  `/concierge` step; this feature does not change it and does not pre-collect email to view the
  on-screen scorecard.
- **R17** Capture lightweight analytics: offer shown / accepted / declined, score viewed, email
  requested, live-gen used/timed-out. (Mechanism per `D4`.)

---

## 6. UX copy (draft, science-voiced — to be reviewed under `R-COPY`)

| Surface | Copy |
|---|---|
| Offer title | "One more thing before your intros…" |
| Offer body | "Want to see what I found on **you**? I looked at your business the way a buyer — and an AI — would, and scored how easy you are to **find**, **buy from**, and **measure**." |
| Offer accept | "Show me what you found" |
| Offer decline | "No thanks — just the intros" |
| Scorecard eyebrow | "AGENT WALLi · YOUR READOUT" |
| Scorecard heading | "How buyers see {FirstName}" |
| Overall label | "Buyer-readiness score" |
| Dimension labels | "Discoverability" · "Ease of Purchase" · "Measurement" |
| Withheld note | "Couldn't verify this against live sources — score withheld." |
| Trust line | "WALLi based this on {N} live web sources · {date}" |
| Continue CTA | "Continue to my intros" |
| Email CTA | "Email me the full report" |

> **R-COPY:** the existing `score-mockup.mjs` email is written in the old "Oracle's Reading /
> prophecy / the cards" voice. That voice **must not** appear in the in-flow screen or the
> in-flow email variant. A rebranded, science-voiced scorecard template is required.

---

## 7. Success metrics

- **M1 Attach rate:** % of attendees who reach the offer that tap "Show me" (target ≥ 40%).
- **M2 Completion:** % who view a scorecard and still proceed to `/concierge` (guard against
  the insight *reducing* intro conversion — should stay ≈ flat vs baseline).
- **M3 Reliability:** 0 hallucinated/un-grounded claims shown; < 2% error/dead-end rate.
- **M4 Latency:** precomputed view renders < 500ms; live-gen path resolves or falls back < 25s.
- **M5 Email follow-up:** % of "email me the report" requests delivered.

---

## 8. Phasing

- **Phase 1 (MVP, this PRD):** precomputed scorecard for known attendees + yes/no offer +
  `/insights` screen + "continue to intros". Missing score ⇒ no offer (R4). Science-voiced copy.
- **Phase 2:** live generation for walk-ins (R11) with loading state + email fallback (R12).
- **Phase 3:** combine the **self-assessment** (subjective, `SelfAssessment.js`) next to the
  **AI-research** score as a two-part "what you say vs what buyers see" view (the original
  vision noted in `score-all.mjs`).

---

## 9. Open decisions (resolve before build)

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| **D1** | Placement: **before** intro confirm (interstitial after `/reveal`) vs **after** (on `/confirmation`). | Before confirm (per latest instruction). | Changes the routing & funnel risk. |
| **D2** | Offer UI: modal on `/reveal` vs dedicated `/insights-offer` route. | Modal (Radix dialog already in deps) for speed; scorecard is its own `/insights` route. | Affects analytics granularity & back-button behaviour. |
| **D3** | Live generation for walk-ins at the booth on/off for the event. | Off for Phase 1 (precompute only); on in Phase 2 behind a flag. | Latency + Gemini quota/cost at the booth. |
| **D4** | Analytics mechanism (none today). | Minimal: console+sheet event, or a tiny `/api/track`. | Needed for M1–M5. |
| **D5** | Canonical dimension naming: scripts say **"Ease of Purchase"**; self-assessment says **"Bookability"**. | Pick one set repo-wide (recommend "Ease of Purchase" to match the grounded scorer + meeting language). | Avoids two names for one thing. |
| **D6** | Score key: precompute by **slug** (matches `/reveal` data) vs by **name** (current `lookupScore`). | Slug (stable, already the flow's key); migrate `lookupScore`. | Prevents name-collision/lookup misses. |
| **D7** | Which pool gets precomputed: RSVP picker list only, or full WOO∪CRM pool. | RSVP + WOO attendees first (who actually reach the booth); CRM later. | Cost of the grounded batch. |
| **D8** | "Email me the report" in Phase 1 or deferred to Phase 2. | Phase 2 (keep MVP to on-screen only). | Scope. |

---

## 10. Acceptance criteria (Phase 1)

- **AC1** Attendee with a precomputed score, on `/reveal`, taps the CTA → sees the yes/no offer.
- **AC2** "Show me" → `/insights` renders overall + 3 dimensions + summary + trust line in < 1s.
- **AC3** "No thanks" → goes straight to `/concierge`; selected matches preserved.
- **AC4** "Continue to my intros" on `/insights` → `/concierge` with the same matches/email behaviour as today.
- **AC5** Attendee **without** a precomputed score (and live-gen off) → **no offer**; CTA behaves exactly as today.
- **AC6** A dimension with no grounded evidence renders "—" + honest note; no fabricated bullets anywhere.
- **AC7** No "prophecy/Oracle/cards/mystical" language anywhere in the in-flow feature.
- **AC8** Back navigation from `/insights` returns to `/reveal` with selection intact.
- **AC9** The existing flow with the feature **disabled by flag** is byte-for-byte the current behaviour.

---

## 11. Test cases to generate (seed list for the AI)

Hand these to the test-generation step; expand each into concrete cases.

1. Offer visibility: precomputed-score attendee vs no-score attendee (R4/AC1/AC5).
2. Offer accept/decline routing & match preservation (AC2/AC3).
3. Scorecard rendering: full 3-dimension, partial (one withheld), all-withheld edge (R8/AC6).
4. Overall = mean of *scored* dimensions only (withheld excluded) (R5).
5. Summary names the lowest *scored* dimension, ignoring withheld (R7).
6. Anti-hallucination: bullet failing grounding is dropped; fluff phrase rejected; swap-test (R13–R15).
7. Branding lint: assert no banned mystical terms in rendered copy (AC7).
8. Live-gen timeout → email fallback (Phase 2) (R11a/R12).
9. Flag off ⇒ identical to current flow (AC9).
10. Slug-keyed lookup hit/miss, including walk-in slug & name-collision (D6).
```
