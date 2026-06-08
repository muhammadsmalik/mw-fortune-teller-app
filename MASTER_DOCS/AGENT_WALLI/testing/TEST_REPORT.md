# Agent WALLi — Core Flow Test Report

**Created:** 2026-06-01 · **Owner:** Salman
**Companion to:** [`TEST_PLAN.md`](./TEST_PLAN.md) (what to test) · [`../product/CORE_FLOW_PRD.md`](../product/CORE_FLOW_PRD.md) · [`../architecture/CORE_FLOW_TECH_ARCHITECTURE.md`](../architecture/CORE_FLOW_TECH_ARCHITECTURE.md)

> **What this is:** the results sheet for [`TEST_PLAN.md`](./TEST_PLAN.md). Every test-plan ID has a row here.
> Rows already filled were **verified at the code/data level on 2026-06-01** (no browser needed). Rows marked
> ☐ **PENDING** need a manual run (`npm run dev` + a real inbox in test mode) — log the result and date in place.

**Status legend:** ✅ PASS (verified) · ⚠️ PASS — note/risk attached · ☐ PENDING (manual run) · 🔴 FAIL · ⏭️ skipped

---

## 0. What gets tested (the inventory)

| Suite | Area | Cases | Can verify now? |
|---|---|---|---|
| **A** | `/select-name` — entry, search, walk-in routing | A1–A7 | ☐ manual (UI) |
| **B** | `/reveal` — 3 cards, confidence, selection | B1–B7 | ☐ manual (UI) |
| **C** | `/concierge` — capture, email prefill, slots, submit | C1–C8 | ☐ manual (UI) |
| **D** | Lead logging → Google Sheet | D1–D4 | partly (D2 col map ✅) |
| **E** | Emails — fan-out, CRM-skip, reply-to, CC ★highest risk | E1–E10 | partly (logic ✅, delivery ☐) |
| **F** | `/confirmation` — chosen times, market-read opt-in | F1–F5 | ☐ manual (UI) |
| **G** | `/api/business-insight` — opt-in market read | G1–G4 | ☐ manual (async) |
| **H** | Walk-in matching `POST /api/match` | H1–H6 | ☐ manual (live API) |
| **I** | Matching rules — data invariants | I1–I4 | ✅ **done below** |
| **R** | Regression — the 2026-06-01 changes | R1–R7 | ✅ **logic done below** |
| **Cut** | Pre-event production cutover | 7 items | ☐ pre-event |

**Bottom line going in:** all data invariants (Suite I) and all 2026-06-01 logic changes (R1–R7) are **verified in code/data today**. What remains is **runtime/delivery** verification (do the emails actually arrive, does the UI behave) — that's your manual pass, and the plan's fixtures are confirmed valid for it.

---

## 1. Suite I — matching data invariants ✅ (run 2026-06-01 against `lib/twin_matches.json`)

| ID | Check | Result | Evidence |
|---|---|---|---|
| **I1** | Twin-5 exposure cap (max in-degree ≤ 5) | ✅ PASS | max in-degree = **5** across the graph |
| **I2** | Composition — every full (3-match) set has a **High** first match | ✅ PASS | **488** full sets, **0** with a non-High first match |
| **I3** | Diversity — matches differ from source in company AND country | ⚠️ PASS w/ note | country-relax in effect (259/488 sets share a country — allowed by **M3**). **But 40/488 sets (8.2%) contain two matches from the *same company*** — see Risk #1 |
| **I4** | No dead-end — every source has matches or routes to walk-in | ✅ PASS | **488/522** have 3 matches; **34/522 (6.5%)** have 0 → routed to walk-in paste (e.g. `amaury-magalhaes`). Distribution: `{0:34, 3:488}` |

**Total sources:** 522. **Re-run anytime:** snippet in `TEST_PLAN.md` §9.

---

## 2. Fixtures re-validated ✅ (2026-06-01 — all still hold)

The plan's named fixtures resolve and their match breakdowns are unchanged. (Source keys are LinkedIn-vanity slugs, not name-slugs — search by **display name** in the UI; slugs below are just for the data snippet.)

| Fixture | Search name | Slug | Breakdown | matchIntros sent |
|---|---|---|---|---|
| **F-ALLWOO** | Melanie Lindquist | `melanielindquist` | Katherine Buckee, Gaurav Verma, Glen Wilson — all woo+email | **3** → 5 emails total |
| **F-MIXED** | Dominic Lis | `dominiclis` | Michel Helmes [woo], Kacper Miller [crm], Milena Vermeulen [crm] | **1** |
| **F-MIXED2** | Julio Chamizo | `juliochamizo` | Federico Rodriguez [woo], Thomas Ghiazza [crm], Adrian Skelton [woo] | **2** |
| **F-NOEMAIL** | Brad Bishopp | `bradley-bishopp-74946016` | Martin Corke [woo], **Markus Grannenfelt [woo, NO email]**, Mary Ventresca [woo] | **2** (Markus skipped+flagged) |
| **F-PENDING** | Amaury Magalhaes | `amaury-magalhaes` | 0 precomputed → walk-in | 0 |
| **F-DEMO** | Guillermo De Lella | `guillermo-de-lella` | Tomas Almarza, Claudia Damas, Andréa Weiss — all woo+email, all tp:3 | 3 (clean demo) |

---

## 3. Suite R — regression on the 2026-06-01 changes ✅ (logic code-verified)

Each row is confirmed present in the **merged** code (`app/api/send-email/route.js`, `app/concierge/page.js`, `app/api/submit-lead/route.js`). "Code ✅" = the branch exists and is correct; runtime delivery still needs your manual send (see Suite E).

| ID | Requirement | Result | Code evidence |
|---|---|---|---|
| **R1** | matchIntro fires **only** for woo + has-email matches | ✅ code | `concierge/page.js:189,192` — `isAttending = lists.includes('woo')`; guard `if (!m.email || !isAttending(m) ...) return` |
| **R2** | CRM matches **never** auto-emailed; flagged to DRI | ✅ code | same guard skips them; `send-email/route.js:262` DRI line `(CRM — not at event; manual outreach: …)` |
| **R3** | No-email matches skipped + flagged | ✅ code | guard skips; `route.js:259` `(no email — needs manual intro)` |
| **R4** | matchIntro reply-to = attendee **+ team** | ✅ code (⚠️ live-only to *observe*) | `route.js:54–56` `resolveReplyTo` returns `[bodyReplyTo, ...CONCIERGE_CC_EMAILS]` when `matchIntro && !TEST_MODE && CC set`. **Masked in test mode** → see Risk #4 / E9 |
| **R5** | twinConfirmation copy = all-woo / all-crm / mixed | ✅ code | `route.js:189–193` `attendingCount`/`crmCount` three-way `coordination` text |
| **R6** | Attendee copy frames booth as **optional + future fallback** (no "find them at the booth" promise) | ✅ code | `route.js:231` — "We're on hand to help you connect… if you don't manage this time, we'll set up an intro for afterwards. You're also welcome to stop by **the Moving Walls booth**" |
| **R7** | Sheet write includes `preferredSlot` in **col P** | ✅ code | `submit-lead/route.js:79` range `Sheet1!A1:P1`; `:103` `preferredSlot` is the 16th value (P); `sessionId` 15th (O) |
| | E5 CC rules — team CC'd, `businessInsight` never CC'd, CC suppressed in test | ✅ code | `route.js:426` `template !== 'businessInsight' && !EMAIL_TEST_MODE && CC.length` |

---

## 4. Suites A–H — manual run log (PENDING your pass)

Run order: **E first** (highest risk), then A→D→F→G→H. Fill Result + date as you go.

### Suite E — Emails ★ (test mode; everything lands in the inbox you type at `/concierge`)
| ID | Fixture | Expected | Result |
|---|---|---|---|
| E1 | F-ALLWOO | **5 emails**: twinConfirmation + DRI + **3** matchIntro | ☐ |
| E2 | F-MIXED | **3 emails**: confirmation + DRI + **1** matchIntro (Michel only) | ☐ |
| E3 | F-MIXED | DRI shows Michel green *(emailed)*; Kacper + Milena amber *(CRM…manual)* | ☐ |
| E4 | F-NOEMAIL | No intro for Markus; DRI flags him *(no email — needs manual intro)* | ☐ |
| E5 | F-MIXED | reply-to = attendee+team; CC=team; businessInsight not CC'd — **code ✅ above; not observable in test mode** | ☐ (or accept R4/E5 code) |
| E6 | F-ALLWOO | twinConfirmation: matches "reply directly"; booth optional + future fallback | ☐ |
| E7 | F-MIXED (2 CRM only) | all-CRM copy variant; 0 matchIntros; DRI = 2 CRM-manual | ☐ |
| E8 | F-MIXED2 | mixed copy; 2 matchIntros (Federico, Adrian); Thomas flagged CRM | ☐ |
| E9 | *(optional live)* internal addresses only | confirms real CC + attendee+team reply-to; **revert to test mode after** | ☐ |
| E10 | any | `from` = `Agent WALLi <RESEND_FROM_EMAIL>` on every email | ☐ |

### Suite A — `/select-name`
| ID | Expected | Result |
|---|---|---|
| A1 | live-filtered directory (name + company) | ☐ |
| A2 | F-DEMO → routes to `/reveal`; localStorage set | ☐ |
| A3 | prior `conciergeLeadSaved` cleared on mount | ☐ |
| A4 | F-PENDING → walk-in paste screen (LinkedIn URL pre-filled) | ☐ |
| A5 | "Not on the list?" → walk-in + find-URL guide | ☐ |
| A6 | non-LinkedIn URL → inline error, no API call | ☐ |
| A7 | valid `linkedin.com/in/…` (incl. `uk.`/`sg.`/`in.` subdomain) → `/api/match` | ☐ |

### Suite B — `/reveal`
| ID | Expected | Result |
|---|---|---|
| B1 | exactly 3 cards (name/role/company/country/pill/reason) | ☐ |
| B2 | first = High (present-attendee guarantee), others Medium | ☐ |
| B3 | ≤3 talking points; section hidden when none | ☐ |
| B4 | all 3 pre-selected; deselect updates "(N)" count | ☐ |
| B5 | deselect all → cannot proceed | ☐ |
| B6 | proceed → `selectedMatches` JSON stored (incl. lists/email) | ☐ |
| B7 | 0-match source → graceful "still preparing" panel | ☐ |

### Suite C — `/concierge`
| ID | Expected | Result |
|---|---|---|
| C1 | RSVP-with-email → email pre-filled | ☐ |
| C2 | walk-in / non-RSVP → email blank (privacy) | ☐ |
| C3 | invalid email (no `@`) → inline error | ☐ |
| C4 | 0 matches → error, go back | ☐ |
| C5 | woo matches show "WOO London" badge | ☐ |
| C6 | multi-select 5 slots; blank = no preference | ☐ |
| C7 | submit disables button → routes to `/confirmation` | ☐ |
| C8 | force failure + retry → no double lead (sent ref) | ☐ |

### Suite D — Lead logging
| ID | Expected | Result |
|---|---|---|
| D1 | one row, range `A1:P1` (16 cols) | ☐ |
| D2 | `flowSource='twin-reveal'`, `persona='media_owner'`, **col P = preferredSlot**, col O = sessionId — **col map code ✅** | ☐ (verify values) |
| D3 | resubmit same session → no duplicate | ☐ |
| D4 | start-over → fresh row allowed | ☐ |

### Suite F — `/confirmation`
| ID | Expected | Result |
|---|---|---|
| F1 | echoes chosen time(s) only | ☐ |
| F2 | no time → "no preference" note | ☐ |
| F3 | market-read opt-in → `POST /api/business-insight` (non-blocking) | ☐ |
| F4 | no email on file → CTA hidden/disabled | ☐ |
| F5 | start over → localStorage cleared → `/select-name` | ☐ |

### Suite G — `/api/business-insight`
| ID | Expected | Result |
|---|---|---|
| G1 | returns 202 immediately | ☐ |
| G2 | scorecard email arrives (~1–3 min) | ☐ |
| G3 | scoring failure → graceful fallback email | ☐ |
| G4 | opt-in only — no CTA tap = no email | ☐ |

### Suite H — Walk-in matching
| ID | Expected | Result |
|---|---|---|
| H1 | valid LinkedIn → `{source, matches:[3]}` | ☐ |
| H2 | invalid URL → 400 | ☐ |
| H3 | EnrichLayer can't fetch → 502, retryable | ☐ |
| H4 | very sparse profile → 422 | ☐ |
| H5 | same rules as precompute (3, diverse, High first) | ☐ |
| H6 | Gemini down → matches + deterministic reason, empty points | ☐ |

---

## 5. Edge cases & risks surfaced (review *before* the event)

| # | Risk | Evidence | Severity | Action |
|---|---|---|---|---|
| **1** | **Two matches from the same company** in one reveal | 40/488 full sets (8.2%) | Low–Med | Decide if a same-org pair is acceptable. If not, add inter-match company dedup to `selectMatches`. Eyeball F-* fixtures for it. |
| **2** | **17.6% of WOO match-slots have no email** → become DRI manual outreach | 170/966 woo slots | Med (ops load) | DRI does manual intros for ~1 in 6 woo matches. Confirm the DRI email's amber flags are legible (E4) and the DRI is staffed for the volume. |
| **3** | **34 sources (6.5%) have no precompute** → all rely on the live walk-in path | `{0:34}` | Med | If EnrichLayer/Gemini is flaky on event day, these people hit H3/H4. Verify the walk-in path is solid (Suite H) and the retry/error copy is friendly. |
| **4** | **reply-to (R4) and CC (E5) are invisible in test mode** | `route.js:37,55,426` | **High** (looks-fine-then-breaks) | Code is correct, but the *only* runtime proof is one live send (E9) with internal addresses. Do E9 once before the event. |
| **5** | **`EMAIL_TEST_MODE=false` cutover** — the #1 footgun | cutover §11 | **High** | Real attendees get rerouted to a tester if left `true`. Flip + restart + confirm a live send. |
| **6** | **`lib/meeting-slots.js` times are preliminary** | cutover §11 | Med | Confirm the 5 windows against the final WOO agenda; they appear in 3 emails + confirmation + sheet col P. |

---

## 6. Production cutover checklist (from PRD §9 / status §5) — ☐ pre-event

- [ ] `EMAIL_TEST_MODE=false` (restart to apply) — **#1 footgun (Risk #5)**
- [ ] `NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` = real DRI inbox (build-time → rebuild)
- [ ] `CONCIERGE_CC_EMAILS` = correct staff (currently Deewakshi + Savita; no group alias)
- [ ] Resend plan covers event-day burst (free = 100/day)
- [ ] Match graph rebuilt on **final** pool with reasons + talking points (re-run Suite I after)
- [ ] `lib/meeting-slots.js` confirmed vs final agenda (Risk #6)
- [ ] Redeploy the branch with the RSVP-only email-prefill fix (status §2)
- [ ] One controlled live send (E9) to confirm reply-to + CC (Risk #4)

---

## 7. Not covered here (out of scope)

- Load/perf at booth scale (concurrent submits) — single-event volume assumed fine.
- Email deliverability/inboxing (SPF/DKIM, spam) — check Resend dashboard.
- Legacy fortune-teller flow (`NEXT_PUBLIC_LIVE_FLOW=fortune`).
- Reply-handling workflow (what staff do when a "yes" arrives) — process, not code.

---

### Summary line for sign-off

> **Data + logic: verified clean (Suite I + R1–R7, 2026-06-01).** Manual delivery pass (A–H) and 6 cutover items remain. Two HIGH risks before go-live: do one live send (E9) to prove reply-to/CC, and flip `EMAIL_TEST_MODE=false`.
