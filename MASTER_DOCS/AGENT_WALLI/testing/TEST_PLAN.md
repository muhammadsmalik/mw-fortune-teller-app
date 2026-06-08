# Agent WALLi — Core Flow Test Plan

**Created:** 2026-06-01 · **Owner:** Salman
**Companion to:** [`../architecture/CORE_FLOW_TECH_ARCHITECTURE.md`](../architecture/CORE_FLOW_TECH_ARCHITECTURE.md) · [`../product/CORE_FLOW_PRD.md`](../product/CORE_FLOW_PRD.md) · [`../status/AGENT_WALLI_STATUS.md`](../status/AGENT_WALLI_STATUS.md)

> Purpose: a self-contained, manual pre-event test pass for the WOO London booth flow
> (`select-name → reveal → concierge → confirmation`) plus the walk-in and email paths.
> There is **no automated test harness** in the repo (no `test` script, no spec files), so this
> is a manual/scripted plan. Each case lists **preconditions → steps → expected → how to verify**.
> IDs are stable so results can be logged against them.

---

## 0. Test environment setup (READ FIRST)

```bash
# In .env — SAFE testing config:
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENTS=your@email.com           # fallback if no booth email typed
# restart after changing (server-only var):
npm run dev                                     # http://localhost:3000
```

**What test mode does / does NOT do:**
- ✅ **Does** reroute *every* email of a submit to the email you type at `/concierge` (`testRerouteTo`),
  falling back to `EMAIL_TEST_RECIPIENTS`. Subjects are prefixed `[TEST→<real recipient>]`.
- ⚠️ **Does NOT** make the Google Sheet write fake — **a real lead row is still appended** on every submit.
  Use a throwaway sheet or expect test rows.
- ⚠️ **Masks CC + reply-to**: in test mode `CONCIERGE_CC_EMAILS` is suppressed and `matchIntro` reply-to
  falls back to the tester. So the **real CC and the attendee+team reply-to CANNOT be observed in test mode** —
  see suite **E5** for how to verify those (code review or one controlled live send).
- ⚠️ Do **not** run `next build` against a running `next dev` (corrupts `.next`; delete it and restart if so).

**Test fixtures (real names in the directory — verified 2026-06-01):**

| Fixture | Search name | Match breakdown | Why |
|---|---|---|---|
| **F-ALLWOO** | `Melanie Lindquist` (also: Juan Ignacio Alvarez Lescano, Santiago Mendive, Robert Dery, Kirsty Dollisson) | 3 matches, all WOO + all have email | Full fan-out: **5 emails** |
| **F-MIXED** | `Dominic Lis` | Michel Helmes [woo+email], Kacper Miller [crm+email], Milena Vermeulen [crm+email] | CRM-skip + mixed recap copy |
| **F-MIXED2** | `Julio Chamizo` | Federico Rodriguez [woo+email], Thomas Ghiazza [crm+email], Adrian Skelton [woo+email] | 2 woo + 1 crm |
| **F-NOEMAIL** | `Brad Bishopp` | includes Markus Grannenfelt [woo, **no email**] | No-email skip + DRI flag |
| **F-PENDING** | `Amaury Magalhaes` (has LinkedIn URL on file) | none precomputed (`pending`) | Walk-in reroute |
| **F-DEMO** | `Guillermo De Lella` | fully populated (headshots + 3 talking points) | Clean demo / screenshots |

> Re-derive fixtures any time with the `node -e` snippet in §8 (data drifts on a rebuild).

---

## 1. Suite A — `/select-name` (entry + search)

| ID | Steps | Expected |
|---|---|---|
| A1 | Load `/select-name`, type a partial name (e.g. "lind") | Live-filtered directory results (max ~50), name + company shown |
| A2 | Pick **F-DEMO**, confirm "That's you?" | Routes to `/reveal`; localStorage `selectedAttendee*` set |
| A3 | On mount, confirm any prior `conciergeLeadSaved` marker is cleared (start-over hygiene) | New session starts clean (re-submitting logs a fresh lead) |
| A4 | Pick **F-PENDING** (`pending` person) | Routed into the **walk-in LinkedIn-paste** screen, not an empty reveal; LinkedIn URL pre-filled (it has one on file) |
| A5 | Click "Not on the list?" | Walk-in paste screen with the "How do I find my LinkedIn URL?" guide |
| A6 | Walk-in: paste a non-LinkedIn URL | Inline validation error; no API call |
| A7 | Walk-in: paste a valid `linkedin.com/in/...` (incl. a country subdomain like `uk.linkedin.com`) | Accepted → calls `/api/match` (see Suite H) |

---

## 2. Suite B — `/reveal` (matches render + selection)

| ID | Steps | Expected |
|---|---|---|
| B1 | Reach `/reveal` via F-DEMO | **Exactly 3** match cards; each: name, role, company, country, confidence pill, one-line reason |
| B2 | Inspect confidence pills | First match = **High** (guaranteed WOO attendee); others **Medium**. (Note: High≠highest similarity — it's the present-attendee guarantee) |
| B3 | Inspect talking points | Up to **3** per card; section **hidden** entirely when none (no empty placeholder) |
| B4 | All 3 cards pre-selected on load; deselect one | "Ask WALLi for an intro (N)" count updates; can narrow to 1–3 |
| B5 | Deselect all | Cannot proceed (button disabled / blocked) |
| B6 | Proceed with N selected | `selectedMatches` (JSON of full match objects incl. `lists`,`email`) stored; routes to `/concierge` |
| B7 | (Edge) a source with 0 precomputed matches | Graceful "WALLi is still preparing… check with booth team" panel — no dead-end |

---

## 3. Suite C — `/concierge` (capture + form)

| ID | Steps | Expected |
|---|---|---|
| C1 | Reach `/concierge` as an **RSVP person who shared an email** (39/522 have one) | Email field **pre-filled** |
| C2 | Reach `/concierge` as a non-RSVP / walk-in | Email field **blank**, prompted — **privacy rule** (no pre-fill of un-shared emails) |
| C3 | Submit with empty/invalid email (no `@`) | Inline error; no submit |
| C4 | Submit with 0 matches chosen | Error asking to go back and pick ≥1 |
| C5 | Inspect each chosen match row | Matches attending WOO show a "WOO London" badge |
| C6 | Multi-select preferred meeting windows from the 5-slot list; or leave blank | Selection captured (order = chronological); blank = "no preference" |
| C7 | Tap submit | Button disables ("submitting"); on success routes to `/confirmation` |
| C8 | Force a failure (e.g. offline) then retry | Error message shown; retry re-sends only the failed step (per `sent` ref); lead not double-written |

---

## 4. Suite D — Lead logging (`/api/submit-lead` → Google Sheet)

| ID | Steps | Expected |
|---|---|---|
| D1 | Submit once | **One** row appended, range `Sheet1!A1:P1` (16 cols A–P) |
| D2 | Inspect the row | `flowSource='twin-reveal'`, `persona='media_owner'`, **col P = preferredSlot** (selected windows joined `'; '`), col O = sessionId (slug) |
| D3 | Refresh `/concierge` and submit again (same attendee, same session) | **No** duplicate row (localStorage `conciergeLeadSaved===slug` guard) |
| D4 | "Start over" then redo | Marker cleared → a fresh row is allowed |

---

## 5. Suite E — Emails (`/api/send-email`) ★ highest-priority (changed 2026-06-01)

> All in **test mode**: every email lands in the inbox you typed at `/concierge`, subject `[TEST→<intended>]`.

| ID | Fixture | Steps | Expected emails in your inbox |
|---|---|---|---|
| **E1** | F-ALLWOO | Select all 3, submit | **5 emails**: 1 `twinConfirmation` (to you), 1 `salesRepNotification` (→ DRI), **3 `matchIntro`** (→ each woo match). Subjects show the real intended recipient. |
| **E2** | F-MIXED (Dominic Lis) | Select all 3, submit | **3 emails**: `twinConfirmation` + `salesRepNotification` + **only 1 `matchIntro`** (Michel Helmes, the woo one). The 2 CRM matches get **no** intro. |
| **E3** | F-MIXED (Dominic Lis) | In `salesRepNotification`, read the per-match list | Michel Helmes = green **(emailed: …)**; Kacper Miller & Milena Vermeulen = amber **(CRM — not at event; manual outreach: …)** |
| **E4** | F-NOEMAIL (Brad Bishopp) | Select Markus Grannenfelt (+others), submit | **No** matchIntro for Markus; DRI email flags him amber **(no email — needs manual intro)** |
| **E5** | F-MIXED | Verify reply-to + CC (see caveat) | `matchIntro` reply-to = **requesting attendee + CONCIERGE_CC_EMAILS**; the 3 concierge emails CC the team; `businessInsight` is **never** CC'd. ⚠️ **Not observable in test mode** — verify via `resolveReplyTo`/`cc` in `app/api/send-email/route.js` **or** one controlled live send (E9). |
| **E6** | F-ALLWOO | Read the `twinConfirmation` body | Copy says matches will **reply directly**; mentions the Moving Walls booth as **optional** + "set it up for the future" fallback. No "come find them at the booth" guarantee. |
| **E7** | F-MIXED, select **only the 2 CRM** matches | Submit | `twinConfirmation` uses the **all-CRM** copy variant ("the team will arrange an intro for afterwards"); **0** matchIntros; DRI shows 2 CRM-manual. |
| **E8** | F-MIXED2 (Julio Chamizo), select all 3 | Submit | `twinConfirmation` uses **mixed** copy (woo "reply directly" + CRM "afterwards"); 2 matchIntros (Federico, Adrian); 1 CRM flagged (Thomas). |
| **E9** | *(optional, live)* Set `EMAIL_TEST_MODE=false`, use **internal addresses only** for attendee + a real woo match you control | One controlled submit | Confirms real CC to `CONCIERGE_CC_EMAILS` and matchIntro reply-to = attendee+team. **Revert to test mode after.** |
| E10 | any | Check the `from` on every email | `Agent WALLi <RESEND_FROM_EMAIL>` |

---

## 6. Suite F — `/confirmation`

| ID | Steps | Expected |
|---|---|---|
| F1 | Arrive after a submit with preferred times chosen | Screen echoes **the attendee's chosen time(s)** (not the full 5-window list) |
| F2 | Arrive after a submit with **no** time chosen | "No preference — team will coordinate" style note |
| F3 | With an email on file, tap the **"market read"** opt-in CTA | Fires `POST /api/business-insight`; UI acknowledges (does not block); see Suite G |
| F4 | No email on file | Market-read CTA hidden/disabled |
| F5 | Tap "Start over" | localStorage cleared; returns to `/select-name` |

---

## 7. Suite G — `/api/business-insight` (opt-in market read)

| ID | Steps | Expected |
|---|---|---|
| G1 | Trigger via F3 | Route returns **`202`** immediately (no UI block) |
| G2 | Wait (~1–3 min) | A `businessInsight` scorecard email arrives (in test mode → your inbox) — 5-dimension read + Book-a-Demo CTA |
| G3 | Force scoring failure (e.g. sparse/invalid company) | Graceful **fallback** email arrives instead of an error / silence |
| G4 | Confirm it is **opt-in only** | Completing concierge **without** tapping the CTA sends **no** market-read email |

---

## 8. Suite H — Walk-in matching (`POST /api/match`)

| ID | Steps | Expected |
|---|---|---|
| H1 | Walk-in with a valid LinkedIn URL of a real media person | Returns `{source, matches:[3]}`; `/reveal` renders them identically to RSVP |
| H2 | Invalid URL | `400` friendly error |
| H3 | URL that EnrichLayer can't fetch | `502` friendly error; attendee can retry |
| H4 | Very sparse profile | `422` ("too sparse to match") |
| H5 | Inspect returned matches | Same rules as precompute: 3 results, diversity (diff company+country), first = High/woo; talking points present (Gemini) or empty (deterministic fallback) — never a crash |
| H6 | Gemini unavailable during walk-in | Matches still return with deterministic reason, empty talking points (fail-fast) |

---

## 9. Suite I — Matching rules (data-level spot checks)

> Mostly verifiable against `lib/twin_matches.json` without the UI. Snippet to recompute fixtures + invariants:

```bash
node -e '
const fs=require("fs");
const tm=JSON.parse(fs.readFileSync("lib/twin_matches.json","utf8"));
// twin-5 cap: no person appears as a match more than 5 times
const deg={}; for(const k in tm) for(const m of tm[k].matches||[]) deg[m.slug]=(deg[m.slug]||0)+1;
console.log("max in-degree:", Math.max(...Object.values(deg)), "(must be <= 5)");
// composition: first match is High for every full set
let bad=0; for(const k in tm){const m=tm[k].matches||[]; if(m.length===3 && m[0].confidence!=="High") bad++;}
console.log("full sets whose first match is NOT High:", bad, "(must be 0)");
'
```

| ID | Check | Expected |
|---|---|---|
| I1 | Twin-5 cap | max in-degree ≤ 5 across the graph |
| I2 | Composition | every full (3-match) set has a High first match |
| I3 | Diversity (spot-check 5 sources) | each match differs from source in company AND country (or relaxed to company-only when noted) |
| I4 | No dead-end | every non-pending source has ≥1 match; pending → walk-in (Suite A4) |

---

## 10. Regression checklist — the 2026-06-01 changes (do these every deploy)

- [ ] **R1** matchIntro fires **only** for woo-attending matches with an email (E1/E2).
- [ ] **R2** CRM matches are **never** auto-emailed; appear as "CRM — not at event; manual outreach" in the DRI email (E3).
- [ ] **R3** No-email matches still skipped + flagged "no email — needs manual intro" (E4).
- [ ] **R4** matchIntro reply-to = attendee + team (live) (E5/E9).
- [ ] **R5** `twinConfirmation` copy matches the woo/crm split: all-woo / all-crm / mixed (E6/E7/E8).
- [ ] **R6** Attendee-facing copy frames the booth as optional + future fallback (no "find them at the booth" promise) (E6).
- [ ] **R7** Sheet write includes preferredSlot in col P (D2).

---

## 11. Pre-event production cutover (from PRD §9 + status §5)

- [ ] `EMAIL_TEST_MODE=false` (restart to apply) — **the #1 footgun**.
- [ ] `NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` set to the real DRI inbox (build-time → rebuild).
- [ ] `CONCIERGE_CC_EMAILS` set to the right staff (currently Deewakshi + Savita; no group alias).
- [ ] Resend on a plan covering event-day burst (free = 100/day; up to ~5 emails/submit, fewer now CRM is skipped).
- [ ] Match graph rebuilt on the **final** pool (see architecture §9 runbook) with reasons + talking points.
- [ ] `lib/meeting-slots.js` times confirmed against the **final** WOO agenda (currently preliminary).
- [ ] Redeploy the branch that contains the RSVP-only email-prefill fix (status §2 "⚠️ needs redeploy").

---

## 12. Known gaps / explicitly NOT covered here

- Load/perf at booth scale (concurrent submits) — not tested; single-event volume assumed fine.
- Email deliverability/inboxing (SPF/DKIM, spam folder) — verify in Resend dashboard separately.
- Legacy fortune-teller flow (`NEXT_PUBLIC_LIVE_FLOW=fortune`) — out of scope for this plan.
- Actual reply-handling workflow (what staff do when a "yes" arrives) — process, not code.
</content>
</invoke>
