import { NextResponse, after } from 'next/server';
import { scoreBusiness } from '@/lib/business-scores.mjs';
import { recommendationFor } from '@/lib/business-score-mapping.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // grounded 5-call sequence runs after the response

// Absolute base URL for the internal send-email call (server-to-server).
function baseUrl(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

async function sendInsightEmail(origin, payload) {
  const res = await fetch(`${origin}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[business-insight] send-email failed', res.status, detail);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { name, company, role, linkedinUrl, email } = body || {};
  if (!email || !email.includes('@')) {
    return NextResponse.json({ message: 'Missing valid email' }, { status: 400 });
  }

  const origin = baseUrl(request);
  const profile = { fullName: name, title: role, company, linkedinUrl };

  // Do the slow grounded research AFTER responding, so the booth flow never waits.
  after(async () => {
    try {
      const { scores, sources, summary, weakestKey } = await scoreBusiness(profile);
      const recommendation = recommendationFor(weakestKey, scores[weakestKey]?.label);
      await sendInsightEmail(origin, {
        template: 'businessInsight',
        emailTo: email,
        testRerouteTo: email,
        subject: `Your market read — ${company || 'Moving Walls'}`,
        fullName: name,
        title: role,
        company,
        scores,
        summary,
        recommendation,
        sourceCount: sources.length,
      });
    } catch (err) {
      console.error('[business-insight] scoring failed, sending fallback:', err.message);
      await sendInsightEmail(origin, {
        template: 'businessInsight',
        emailTo: email,
        testRerouteTo: email,
        subject: `A market read from Agent WALLi`,
        fullName: name,
        company,
        fallback: true,
      });
    }
  });

  return NextResponse.json({ message: 'accepted' }, { status: 202 });
}
