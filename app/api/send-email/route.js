import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { MEETING_SLOTS } from '@/lib/meeting-slots';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Replace with your verified Resend "from" email or set in .env
const EMAIL_FOOTER_IMAGE_URL = process.env.EMAIL_FOOTER_URL || 'https://placehold.co/600x100/0B1C3D/FFFFFF/png?text=Your+Company+Logo+Here'; // Replace with your actual public image URL or set in .env

// --- Email test mode (booth testing) ---
// When EMAIL_TEST_MODE=true, EVERY outbound email is rerouted to the fixed
// EMAIL_TEST_RECIPIENTS list instead of the real attendee/DRI, so a test run can
// never hit a real inbox. Server-only (no NEXT_PUBLIC_ prefix) so it can't be
// toggled from the client. Both env vars live in .env; flip the flag off before
// the live event.
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
const EMAIL_TEST_RECIPIENTS = (process.env.EMAIL_TEST_RECIPIENTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Internal MW staff CC'd on every concierge email (twinConfirmation, matchIntro,
// salesRepNotification) so they can follow up with attendees. Comma-separated in
// .env. Suppressed in test mode so booth test runs don't hit their inboxes.
const CONCIERGE_CC_EMAILS = (process.env.CONCIERGE_CC_EMAILS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Single chokepoint every send passes through: in test mode it swaps the real
// recipient for the test target and prefixes the subject with the intended
// recipient so you can still see where it WOULD have gone. `rerouteTo` lets a
// tester collect every email from one submit (attendee + DRI + match-intros) in
// their OWN inbox — the address they typed at the booth — falling back to the
// fixed EMAIL_TEST_RECIPIENTS list when none is supplied. Ignored in production.
function resolveDelivery(emailTo, subject, rerouteTo) {
  if (EMAIL_TEST_MODE) {
    const target = rerouteTo ? [rerouteTo] : EMAIL_TEST_RECIPIENTS;
    if (target.length > 0) {
      console.log(`[send-email] TEST MODE — rerouting ${emailTo} -> ${target.join(', ')}`);
      return { to: target, subject: `[TEST→${emailTo}] ${subject}` };
    }
  }
  return { to: [emailTo], subject };
}

// Where a matchIntro reply lands. The match clicks "Reply" to confirm interest,
// so we point reply-to at the Moving Walls concierge team (the CC'd staff) — that
// way WE catch the confirmation and coordinate the introduction, rather than the
// reply going straight to the attendee. Falls back to the attendee address
// (body.replyTo) when no MW team is configured, and in test mode keeps body.replyTo
// so a test reply lands with the tester instead of real staff.
function resolveReplyTo(template, bodyReplyTo) {
  if (template === 'matchIntro' && !EMAIL_TEST_MODE && CONCIERGE_CC_EMAILS.length > 0) {
    return CONCIERGE_CC_EMAILS;
  }
  return bodyReplyTo;
}

// Look up the attendee's precomputed twin from the twinning pipeline state
// (scripts/twins.json), matched by the name we already have. Returns { twin, reason } or null.
// The twin is delivered ONLY in the email (not on screen) so a real address is required to receive it.
function lookupTwin(fullName) {
  try {
    if (!fullName) return null;
    const storePath = path.join(process.cwd(), 'scripts', 'twins.json');
    if (!fs.existsSync(storePath)) return null;
    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const norm = (s) => String(s || '').trim().toLowerCase();
    const me = (store.people || []).find((p) => norm(p.name) === norm(fullName));
    if (!me) return null;
    const match = (store.matches || []).find((m) => [m.a, m.b, m.c].includes(me.id));
    if (!match) return null;
    const others = [match.a, match.b, match.c]
      .filter((id) => id && id !== me.id)
      .map((id) => (store.people.find((p) => p.id === id) || {}).name)
      .filter(Boolean);
    if (!others.length) return null;
    return { twin: others.join(' & '), reason: match.reason || null };
  } catch (e) {
    console.error('[send-email] twin lookup error:', e.message);
    return null;
  }
}

// Look up the attendee's precomputed AI scorecard (scripts/scores.json, written
// by scripts/score-all.mjs). Returns the 3-dimension score object or null.
function lookupScore(fullName) {
  try {
    if (!fullName) return null;
    const p = path.join(process.cwd(), 'scripts', 'scores.json');
    if (!fs.existsSync(p)) return null;
    const store = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const norm = (s) => String(s || '').trim().toLowerCase();
    const hit = Object.entries(store).find(([name]) => norm(name) === norm(fullName));
    return hit ? hit[1] : null;
  } catch (e) {
    console.error('[send-email] score lookup error:', e.message);
    return null;
  }
}

const DIM_LABELS = { discoverability: 'Discoverability', easeOfPurchase: 'Ease of Purchase', measurement: 'Measurement' };
function scoreSection(score) {
  if (!score) return '';
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const rows = Object.keys(DIM_LABELS).map((k) => {
    const d = score[k] || {};
    const pct = clamp(d.score);
    const bullets = (d.bullets || []).map((b) => `<li style="margin:4px 0;font-size:12px;color:#555;">${b}</li>`).join('');
    return `
      <div style="margin:14px 0;">
        <table width="100%" style="border-collapse:collapse;"><tr>
          <td style="font-weight:bold;color:#2554A2;font-size:14px;">${DIM_LABELS[k]}</td>
          <td style="text-align:right;font-weight:bold;color:#151E43;font-size:15px;">${pct}<span style="font-size:10px;color:#888;">/100</span></td>
        </tr></table>
        <div style="background:#e6eef9;border-radius:10px;height:8px;margin:5px 0;overflow:hidden;"><div style="width:${pct}%;height:8px;background:#5BADDE;border-radius:10px;"></div></div>
        <ul style="margin:4px 0 0;padding-left:18px;">${bullets}</ul>
      </div>`;
  }).join('');
  return `
    <div class="score-section" style="margin-top:30px;padding:18px 20px;background:#fbfcff;border:1px solid #dde6f5;border-radius:8px;">
      <p style="margin:0 0 2px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2554A2;">&#128202; Your Media-Owner Scorecard</p>
      <p style="margin:0 0 12px;font-size:28px;font-weight:bold;color:#151E43;">${clamp(score.overall)}<span style="font-size:13px;color:#888;">/100 overall</span></p>
      ${rows}
    </div>`;
}

// Render the live self-assessment score (passed from the client; computed from the
// attendee's questionnaire answers). Shown next to the AI score — the meeting's "two scores".
function selfScoreSection(selfScore, selfSubScores) {
  if (selfScore === null || selfScore === undefined) return '';
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const subs = selfSubScores && typeof selfSubScores === 'object' ? Object.values(selfSubScores) : [];
  const rows = subs.map((d) => {
    const pct = clamp(d.score);
    return `
      <div style="margin:10px 0;">
        <table width="100%" style="border-collapse:collapse;"><tr>
          <td style="font-weight:bold;color:#6a4fb3;font-size:13px;">${d.dimension || ''}${d.product ? ` <span style="color:#999;font-weight:normal;">&rarr; ${d.product}</span>` : ''}</td>
          <td style="text-align:right;font-weight:bold;color:#151E43;font-size:14px;">${pct}<span style="font-size:10px;color:#888;">/100</span></td>
        </tr></table>
        <div style="background:#efe9fb;border-radius:10px;height:7px;margin:4px 0;overflow:hidden;"><div style="width:${pct}%;height:7px;background:#8b6fd6;border-radius:10px;"></div></div>
      </div>`;
  }).join('');
  return `
    <div class="self-score-section" style="margin-top:22px;padding:18px 20px;background:#fbfaff;border:1px solid #e4ddf5;border-radius:8px;">
      <p style="margin:0 0 2px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6a4fb3;">&#9997;&#65039; How You Rated Yourself</p>
      <p style="margin:0 0 12px;font-size:28px;font-weight:bold;color:#151E43;">${clamp(selfScore)}<span style="font-size:13px;color:#888;">/100 self-assessment</span></p>
      ${rows}
    </div>`;
}

// ---------- New WOO booth flow templates ----------
// Shared styled <ul> of talking points, used by both booth templates so the list
// styling lives in one place. Callers supply their own (context-specific) heading.
function talkingPointsList(items) {
  return `<ul style="margin:0;padding-left:18px;">${(items || []).map((t) => `<li style="margin:3px 0;font-size:13px;color:#333;">${t}</li>`).join('')}</ul>`;
}

function twinConfirmationHtml({ fullName, matches }) {
  const cards = (matches || []).map((m) => `
    <div style="margin:14px 0;padding:14px 16px;background:#fbfcff;border:1px solid #dde6f5;border-radius:8px;">
      <p style="margin:0;font-size:16px;font-weight:bold;color:#151E43;">${m.name || ''}</p>
      <p style="margin:2px 0 8px;font-size:13px;color:#555;">${[m.role, m.company].filter(Boolean).join(' — ')}</p>
      ${Array.isArray(m.talkingPoints) && m.talkingPoints.length ? `
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2554A2;">Talking points</p>
        ${talkingPointsList(m.talkingPoints)}
      ` : ''}
    </div>`).join('');
  const count = (matches || []).length;
  const people = count === 1 ? 'the person' : `the ${count} people`;
  return `
    <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
      <div style="padding:20px;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:5px;">
        <p style="font-size:1.2em;font-weight:bold;">Hello ${fullName || 'there'},</p>
        <p>Agent WALLi here — your AI Concierge Wizard at WOO London. I peered into your LinkedIn and here ${count === 1 ? 'is' : 'are'} ${people} you asked to meet:</p>
        ${cards || '<p><em>My team will follow up shortly with your matches.</em></p>'}
        <p style="margin-top:24px;">Drop by the Moving Walls booth and we&apos;ll handle the introductions in person.</p>
        <p style="margin-top:20px;font-style:italic;">— Agent WALLi, AI Concierge Wizard<br/>Moving Walls</p>
      </div>
    </body></html>`;
}

// Intro email to a matched person: the attendee asked to meet them, with the
// shared list of booth networking windows and the grounded "why you two" talking
// points. We don't assign a specific slot per pairing — the same windows go to
// everyone and the two coordinate via reply-to (set to the attendee in the route)
// or by dropping by the booth.
function matchIntroHtml({ matchName, attendeeName, attendeeRole, attendeeCompany, matchReason, talkingPoints }) {
  const requester = [attendeeRole, attendeeCompany].filter(Boolean).join(', ');
  const slot = `
    <div style="margin:16px 0;padding:12px 16px;background:#f0f6ff;border:1px solid #b9d4f0;border-radius:8px;">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2554A2;">Find each other at the Moving Walls booth</p>
      <ul style="margin:0;padding-left:18px;">${MEETING_SLOTS.map((s) => `<li style="margin:3px 0;font-size:14px;color:#151E43;">${s}</li>`).join('')}</ul>
    </div>`;
  const tp = Array.isArray(talkingPoints) && talkingPoints.length ? `
    <p style="margin:18px 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2554A2;">What you two share</p>
    ${talkingPointsList(talkingPoints)}
  ` : '';
  // Prominent confirm CTA — sits ABOVE the timing so it isn't buried. Replying
  // confirms interest; the Moving Walls team (reply-to) then coordinates the intro.
  const confirmCta = `
    <div style="margin:18px 0;padding:16px 18px;background:#eef6ff;border:1px solid #2554A2;border-radius:8px;">
      <p style="margin:0;font-size:15px;color:#151E43;"><strong>Interested in meeting?</strong> Just reply to this email to confirm, and the Moving Walls team will set up the introduction. You can suggest another time, or drop by the Moving Walls booth and we&apos;ll introduce you in person.</p>
    </div>`;
  return `
    <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
      <div style="padding:20px;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:5px;">
        <p style="font-size:1.2em;font-weight:bold;">Hello ${matchName || 'there'},</p>
        <p>Agent WALLi here — your AI Concierge Wizard at WOO London. <strong>${attendeeName || 'An attendee'}</strong>${requester ? ` (${requester})` : ''} would like to meet you at the event.</p>
        ${matchReason ? `<p style="font-style:italic;color:#555;">${matchReason}</p>` : ''}
        ${confirmCta}
        ${slot}
        ${tp}
        <p style="margin-top:20px;font-style:italic;">— Agent WALLi, AI Concierge Wizard<br/>Moving Walls</p>
      </div>
    </body></html>`;
}

function salesRepNotificationHtml({ fullName, email, emailOnFile = true, company, role, linkedinUrl, attendeeSlug, matches }) {
  const matchLines = (matches || []).map((m) => {
    const meta = [m.role, m.company].filter(Boolean).join(', ');
    const li = m.linkedinUrl
      ? `<a href="${m.linkedinUrl}" style="color:#2554A2;">${m.name || m.linkedinUrl}</a>`
      : (m.name || '');
    // Flag whether WALLi already emailed this match or the DRI must intro manually.
    const status = m.email
      ? `<span style="color:#15803d;">(emailed: ${m.email})</span>`
      : `<span style="color:#b45309;font-weight:bold;">(no email — needs manual intro)</span>`;
    return `<li style="margin:3px 0;">${li}${meta ? ` — ${meta}` : ''} ${status}</li>`;
  }).join('') || '<li>(no match data attached)</li>';
  const count = (matches || []).length;
  const emailRow = emailOnFile
    ? `<tr><td style="padding:3px 8px 3px 0;color:#666;">Email</td><td>${email || ''}</td></tr>`
    : `<tr><td style="padding:3px 8px 3px 0;color:#666;">Email</td><td>${email || ''} <span style="color:#b45309;font-weight:bold;">(entered at booth — not previously on file)</span></td></tr>`;
  const requesterLi = linkedinUrl ? `<tr><td style="padding:3px 8px 3px 0;color:#666;">LinkedIn</td><td><a href="${linkedinUrl}" style="color:#2554A2;">${linkedinUrl}</a></td></tr>` : '';
  return `
    <html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
      <div style="padding:20px;max-width:640px;margin:auto;">
        <h2 style="margin:0 0 12px;">Concierge request — ${fullName || '(unknown)'}</h2>
        <p style="margin:0 0 12px;">${fullName || 'An attendee'} requested an intro to ${count} ${count === 1 ? 'person' : 'people'}. Please make the ${count === 1 ? 'introduction' : 'introductions'} at the booth.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:3px 8px 3px 0;color:#666;">Name</td><td>${fullName || ''}</td></tr>
          ${emailRow}
          <tr><td style="padding:3px 8px 3px 0;color:#666;">Company</td><td>${company || ''}</td></tr>
          <tr><td style="padding:3px 8px 3px 0;color:#666;">Role</td><td>${role || ''}</td></tr>
          ${requesterLi}
          <tr><td style="padding:3px 8px 3px 0;color:#666;">Slug</td><td>${attendeeSlug || ''}</td></tr>
        </table>
        <p style="margin:18px 0 4px;font-weight:bold;">Requested intro${count === 1 ? '' : 's'} (${count}):</p>
        <ul style="margin:0;padding-left:20px;">${matchLines}</ul>
      </div>
    </body></html>`;
}

// ----- Business Insight scorecard (Agent WALLi market read) -----
const BI_NAVY = '#151E43';
const BI_LIGHT = '#5BADDE';
const BI_GOLD = '#FEDA24';
const BI_DIM_ORDER = ['discoverability', 'easeOfPurchase', 'measurement', 'programmaticReadiness', 'audienceIntelligence'];
const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || 'https://www.movingwalls.com/contact';

function biEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function biClamp(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }

function biDimensionRow(dim) {
  const withheld = typeof dim?.score !== 'number';
  const pct = biClamp(dim?.score);
  const scoreCell = withheld
    ? `&mdash;<span style="font-size:11px;color:#8aa0c8;"> /100</span>`
    : `${pct}<span style="font-size:11px;color:#8aa0c8;">/100</span>`;
  const note = withheld
    ? `<li style="margin:7px 0;color:${BI_GOLD};font-size:13px;line-height:1.45;">Couldn't verify this against live sources — score withheld.</li>`
    : '';
  const items = (dim?.bullets || [])
    .map((b) => `<li style="margin:7px 0;color:#dce6f7;font-size:13px;line-height:1.45;">${biEscape(b.point)}</li>`)
    .join('') + note;
  return `
    <div style="margin:22px 0;">
      <table width="100%" style="border-collapse:collapse;"><tr>
        <td style="text-align:left;font-weight:700;color:${BI_GOLD};font-size:15px;letter-spacing:.3px;">${biEscape(dim?.label || '')}</td>
        <td style="text-align:right;font-weight:700;color:#ffffff;font-size:18px;">${scoreCell}</td>
      </tr></table>
      <div style="background:rgba(255,255,255,0.09);border-radius:20px;height:9px;margin:8px 0;overflow:hidden;">
        <div style="width:${withheld ? 0 : pct}%;height:9px;background:${BI_LIGHT};border-radius:20px;"></div>
      </div>
      <ul style="margin:6px 0 0;padding-left:18px;">${items}</ul>
    </div>`;
}

function businessInsightHtml({ fullName, title, company, region, scores, summary, recommendation, sourceCount, fallback }) {
  const firstName = (fullName || '').split(' ')[0] || 'there';
  const demoBtn = `
    <div style="text-align:center;margin:26px 0 6px;">
      <a href="${DEMO_URL}" style="display:inline-block;background:${BI_GOLD};color:${BI_NAVY};font-weight:800;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:10px;">Book a Demo</a>
    </div>`;

  if (fallback || !scores) {
    return biShell(`
      <div style="padding:30px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:12px;letter-spacing:3px;color:${BI_LIGHT};text-transform:uppercase;">Agent WALLi · Market Read</div>
      </div>
      <div style="padding:24px 28px 28px;">
        <p style="color:#c2cfe6;font-size:14px;line-height:1.65;margin:0 0 18px;">Hello ${biEscape(firstName)}, I started pulling a market read on ${biEscape(company || 'your business')} but couldn't gather enough verified detail to score it fairly this time. The Moving Walls team can walk you through it directly.</p>
        ${demoBtn}
        <p style="margin-top:20px;color:#c2cfe6;font-size:13px;">— Agent WALLi, AI Concierge · Moving Walls</p>
      </div>`);
  }

  const scoredKeys = BI_DIM_ORDER.filter((k) => typeof scores[k]?.score === 'number');
  const overall = scoredKeys.length
    ? Math.round(scoredKeys.reduce((s, k) => s + biClamp(scores[k].score), 0) / scoredKeys.length)
    : 0;
  const rows = BI_DIM_ORDER.map((k) => biDimensionRow(scores[k])).join('');
  const trust = sourceCount ? `Backed by ${sourceCount} live web sources` : 'Backed by live web search';
  const rec = recommendation ? `
    <div style="margin-top:22px;padding:16px 18px;background:rgba(91,173,222,0.10);border:1px solid rgba(91,173,222,0.4);border-radius:10px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${BI_LIGHT};">Where Moving Walls can help most</p>
      <p style="margin:0;font-size:15px;color:#eaf0fa;"><strong style="color:#fff;">${biEscape(recommendation.product)}</strong> — ${biEscape(recommendation.why)}</p>
    </div>` : '';

  return biShell(`
    <div style="padding:30px 28px 22px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;letter-spacing:3px;color:${BI_LIGHT};text-transform:uppercase;">Agent WALLi · Market Read</div>
      <div style="font-size:24px;font-weight:800;margin-top:10px;color:#ffffff;">${biEscape(company || fullName || '')}</div>
      ${title || region ? `<div style="font-size:13px;color:#9fb2d8;margin-top:3px;">${[biEscape(title), biEscape(region)].filter(Boolean).join(' · ')}</div>` : ''}
    </div>
    <div style="padding:24px 28px 28px;">
      <p style="color:#c2cfe6;font-size:14px;line-height:1.65;margin:0 0 20px;">Hello ${biEscape(firstName)}, here's my data-driven read on ${biEscape(company || 'your business')} across the five dimensions that decide whether your inventory is <em>found</em>, <em>bought</em>, and <em>believed</em>.</p>
      <div style="text-align:center;margin:6px 0 20px;padding:18px;background:rgba(254,218,36,0.06);border:1px solid rgba(254,218,36,0.28);border-radius:12px;">
        <div style="font-size:12px;letter-spacing:2px;color:${BI_GOLD};text-transform:uppercase;">Market Presence Score</div>
        <div style="font-size:50px;font-weight:800;color:#ffffff;line-height:1.05;">${overall}<span style="font-size:18px;color:#7e93bd;">/100</span></div>
      </div>
      ${rows}
      ${summary ? `<p style="margin-top:22px;padding:14px 16px;background:rgba(91,173,222,0.08);border-left:3px solid ${BI_LIGHT};color:#dce6f7;font-size:13px;border-radius:6px;font-style:italic;">${biEscape(summary)}</p>` : ''}
      ${rec}
      ${demoBtn}
      <p style="margin-top:18px;color:#c2cfe6;font-size:13px;">— Agent WALLi, AI Concierge · Moving Walls</p>
      <p style="margin-top:12px;font-size:10px;color:#5e6e92;text-align:center;letter-spacing:.5px;">${biEscape(trust)}</p>
    </div>`);
}

function biShell(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"></head>
  <body style="margin:0;padding:0;background-color:#0c0e16;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0c0e16;padding:24px;"><tr><td align="center">
      <div style="max-width:600px;margin:auto;text-align:left;background:${BI_NAVY};border:1px solid #2a3566;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;color:#eaf0fa;">
        ${inner}
      </div>
    </td></tr></table>
  </body></html>`;
}

// Booth-flow templates, keyed by the `template` field in the request body.
const BOOTH_TEMPLATES = {
  twinConfirmation: twinConfirmationHtml,
  salesRepNotification: salesRepNotificationHtml,
  matchIntro: matchIntroHtml,
  businessInsight: businessInsightHtml,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { template, emailTo, subject } = body;

    // ----- New booth-flow templates (keyed off `template`) -----
    if (BOOTH_TEMPLATES[template]) {
      if (!emailTo || !subject) {
        return NextResponse.json({ message: 'Missing required fields: emailTo or subject' }, { status: 400 });
      }
      const { to, subject: finalSubject } = resolveDelivery(emailTo, subject, body.testRerouteTo);
      // matchIntro routes the reply to the MW concierge team so we coordinate the
      // intro (see resolveReplyTo); other templates fall back to body.replyTo.
      const replyTo = resolveReplyTo(template, body.replyTo);
      const { data, error } = await resend.emails.send({
        from: `Agent WALLi <${FROM_EMAIL}>`,
        to,
        subject: finalSubject,
        html: BOOTH_TEMPLATES[template](body),
        // CC internal MW staff on live concierge sends; skipped in test mode and
        // for businessInsight (a 1:1 automated report, not a concierge handoff).
        ...(template !== 'businessInsight' && !EMAIL_TEST_MODE && CONCIERGE_CC_EMAILS.length > 0 && { cc: CONCIERGE_CC_EMAILS }),
        ...(replyTo && { replyTo }),
      });
      if (error) {
        console.error('Resend API Error Details:', JSON.stringify(error, null, 2));
        return NextResponse.json({ message: 'Error sending email', error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Email sent successfully', data }, { status: 200 });
    }

    // ----- Legacy fortune-teller path (unchanged) -----
    const { fortuneText, fullName, blueprintHtml, selfScore, selfSubScores } = body;

    if (!emailTo || !subject || !fortuneText) {
      return NextResponse.json({ message: 'Missing required fields: emailTo, subject, or fortuneText' }, { status: 400 });
    }

    // Modify CTA in the fortune text
    const modifiedFortuneText = fortuneText.replace(
      /Learn more about Moving Walls:/gi,
      'Book an appointment here:'
    );

    // Prepare HTML content for the email
    // Split by one or more newlines and wrap each part in <p> tags for better paragraph formatting
    const fortuneParagraphs = modifiedFortuneText
      .split(/\n+/)
      .filter(paragraph => paragraph.trim() !== '')
      .map(paragraph => `<p>${paragraph.trim()}</p>`).join('');

    // Email-gated scorecard + twin: included here (not on screen) so a real inbox is needed to see them.
    const scoreHtml = scoreSection(lookupScore(fullName));
    const selfHtml = selfScoreSection(selfScore, selfSubScores);
    const twin = lookupTwin(fullName);
    const twinHtml = twin && twin.twin ? `
      <div class="twin-section" style="margin-top:30px;padding:18px 20px;background:#f0f6ff;border:1px solid #b9d4f0;border-radius:8px;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2554A2;">&#10024; Your Twin at WOO</p>
        <p style="margin:0;font-size:20px;font-weight:bold;color:#151E43;">${twin.twin}</p>
        ${twin.reason ? `<p style="margin:6px 0 0;font-size:13px;color:#555;font-style:italic;">${twin.reason}</p>` : ''}
        <p style="margin:10px 0 0;font-size:12px;color:#777;">Drop by the booth and we&apos;ll introduce you.</p>
      </div>
    ` : '';

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px; }
            .header { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
            .fortune-text { margin-bottom: 20px; }
            .blueprint-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            .footer-image { width: 100%; max-width: 600px; height: auto; margin-top: 20px; }
            .signature { margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="header">Hello ${fullName || 'there'},</p>
            <p>✨ Here's your business fortune as requested:</p>
            <div class="fortune-text">
              ${fortuneParagraphs}
            </div>
            ${blueprintHtml ? `
              <div class="blueprint-section">
                ${blueprintHtml}
              </div>
            ` : ''}
            ${scoreHtml}
            ${selfHtml}
            ${twinHtml}
            <p class="signature">
              Best regards,<br />
              Agent WALLi at Moving Walls 🚀
            </p>
            <img src="${EMAIL_FOOTER_IMAGE_URL}" alt="Email Footer" class="footer-image" />
          </div>
        </body>
      </html>
    `;

    const { to, subject: finalSubject } = resolveDelivery(emailTo, subject);
    const { data, error } = await resend.emails.send({
      from: `Agent WALLi <${FROM_EMAIL}>`,
      to,
      subject: finalSubject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API Error Details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ message: 'Error sending email', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Email sent successfully', data: data }, { status: 200 });
  } catch (error) {
    console.error('API Route Exception Details:', JSON.stringify(error, null, 2));
    if (error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    return NextResponse.json({ message: 'Error processing request', error: error.message }, { status: 500 });
  }
}
