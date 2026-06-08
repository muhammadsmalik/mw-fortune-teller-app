# Agent WALLi — Documentation

"Agent WALLi, the AI Concierge Wizard" — the self-serve booth flow for **WOO London Forum (June 2026)**. An attendee finds (or pastes) their profile, gets **3 matches** with a one-line **reason** and **3 talking points** each, then the **concierge** emails the intros and logs the lead.

This folder holds everything for the current Agent WALLi initiative. (Legacy fortune-teller / tarot / persona docs remain at the `MASTER_DOCS/` root.)

## Start here

1. **[`product/CORE_FLOW_PRD.md`](./product/CORE_FLOW_PRD.md)** — what the core flow does and why (goals, requirements, decisions).
2. **[`architecture/CORE_FLOW_TECH_ARCHITECTURE.md`](./architecture/CORE_FLOW_TECH_ARCHITECTURE.md)** — how it's built (components, data model, flows, env matrix, runbook).
3. **[`status/AGENT_WALLI_STATUS.md`](./status/AGENT_WALLI_STATUS.md)** — current live/operational status and remaining work.
4. **[`testing/TEST_PLAN.md`](./testing/TEST_PLAN.md)** — manual pre-event test plan (fixtures, suites, regression + cutover checklists).

## Layout

| Folder | Contents |
|---|---|
| `product/` | `CORE_FLOW_PRD.md` — product requirements for Matching → Talking Points → Concierge. |
| `architecture/` | `CORE_FLOW_TECH_ARCHITECTURE.md` — technical architecture (the companion to the PRD). |
| `matching/` | The matching engine's design + inputs: `GEMINI_MATCH_REASONS_PLAN.md` (reason + talking-point generation), `linkedin-profile-matching-prompt.md` / `-filled.md` (the matching prompt and its generated fill), `linkedin-profile-index-map.json` (index → profile metadata, **referenced by scripts**), `MATCHES/matches.md` (early hand-built match set, now superseded by the embeddings pipeline). |
| `design/` | Brand + theme: `AGENT_WALLI_THEME_REVAMP.md` (tokens, avatar, theme rollout) and `AGENT_WALLI_ASSET_GUIDE.md` (asset-generation prompts/specs). |
| `status/` | `AGENT_WALLI_STATUS.md` (booth-flow status) and `30-5-demo.md` (2026-05-30 demo / meeting notes). |
| `testing/` | `TEST_PLAN.md` — manual test plan: env setup, real-name fixtures, suites A–I, 2026-06-01 regression checklist, and the pre-event production cutover checklist. |

## Note for scripts

`matching/linkedin-profile-index-map.json` and `matching/linkedin-profile-matching-prompt-filled.md` are read/written by build scripts. If you move them again, update the paths in:
`scripts/build-pool-index.mjs`, `scripts/download-profile-pics.mjs`, `scripts/build-linkedin-matching-prompt.js`.
