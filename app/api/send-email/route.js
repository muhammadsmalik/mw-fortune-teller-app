import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Replace with your verified Resend "from" email or set in .env
const EMAIL_FOOTER_IMAGE_URL = process.env.EMAIL_FOOTER_URL || 'https://placehold.co/600x100/0B1C3D/FFFFFF/png?text=Your+Company+Logo+Here'; // Replace with your actual public image URL or set in .env

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

export async function POST(request) {
  try {
    const { emailTo, subject, fortuneText, fullName, blueprintHtml } = await request.json();

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
            ${twinHtml}
            <p class="signature">
              Best regards,<br />
              Your AI Fortune Teller at Moving Walls 🚀
            </p>
            <img src="${EMAIL_FOOTER_IMAGE_URL}" alt="Email Footer" class="footer-image" />
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `Moving Walls Fortune Teller <${FROM_EMAIL}>`,
      to: [emailTo],
      subject: subject,
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
