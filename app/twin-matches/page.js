import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Globe2,
  MapPin,
  MessageSquareText,
  Sparkles,
  Users,
} from 'lucide-react';
import BrandFooter from '@/components/ui/BrandFooter';

// Grounded twin-match preview for profile #247.
// Every signal, principle, and talking point below traces back to the real
// scraped LinkedIn data in scripts/output/linkedin-profiles/. No fabricated names.
const sourceProfile = {
  name: 'Craig Andrew Cook',
  index: 247,
  role: 'CEO & Co-Founder',
  company: 'GOOD TRAFFIC / densiti',
  location: 'Brooklyn, New York, USA',
  headline: 'ceo @ GOOD TRAFFIC // measuring out-of-home on anything that moves',
  focus: ['Rideshare / car-wrap OOH', 'OOH attribution', 'densiti measurement', '#mockupmonday creative', 'Garage Sessions podcast'],
  evidence: [
    'CEO/co-founder of GOOD TRAFFIC, rideshare and car-wrap OOH running NYC × CDMX (now expanding to Brazil).',
    'Also runs densiti — measures OOH campaign performance "from impressions all the way to conversion."',
    'Obsessed with OOH attribution: wrote the "Attribution in OOH" article and posts constantly under #ooh.',
    'Prolific creator: recurring "#mockupmonday" car-wrap creative series and the "Garage Sessions" OOH podcast.',
    'Former investment banker (Santander, Wells Fargo) turned OOH founder.',
  ],
};

const matches = [
  {
    index: 380,
    name: 'Mark Bracey',
    role: 'Co-Founder & CCO',
    company: 'DoohClick AB',
    location: 'London, United Kingdom',
    confidence: 'High',
    matchReason: 'Cross-regional DOOH alignment',
    linkedinUrl: 'https://www.linkedin.com/in/mark-bracey',
    principles: ['another market', 'complementary product', 'shared interest: OOH measurement', 'finance → OOH path'],
    talkingPoints: [
      'You run complementary sides of the same business — Mark co-founded DoohClick, an ad-tech / CMS platform built "by OOH owners for OOH owners," while Craig operates the car-wrap inventory plus the densiti measurement layer. Compare where software ends and media operations begin.',
      'Measurement is a shared obsession: Mark has posted that "accountability is OOH’s next growth lever," and Craig built densiti to measure OOH impressions-to-conversion. A natural debate on proving OOH works.',
      'You’ve both been pulled into the Mexico City OOH scene — Mark posted about DoohClick sponsoring the WOO Congress in CDMX, and Craig runs GOOD TRAFFIC’s sister operation there.',
    ],
  },
  {
    index: 117,
    name: 'Phil Clemas',
    role: 'Chief Executive Officer',
    company: 'Lumo Digital Outdoor',
    location: 'Auckland, New Zealand',
    confidence: 'High',
    matchReason: 'OOH market peer in another market',
    linkedinUrl: 'https://www.linkedin.com/in/phil-clemas-21b36a18',
    principles: ['another market', 'shared interest: audience data', 'creative-led OOH', 'CEO peer'],
    talkingPoints: [
      'Both lead OOH businesses in different markets — Phil is CEO of Lumo, "New Zealand’s only nationwide premium pure-play digital network," while Craig runs US/Mexico rideshare car-wrap OOH. A clean digital-screen vs moving-media comparison.',
      'Audience measurement is common territory: Phil posted about Lumo’s analytics platform "ticking over a billion datapoints," which maps directly onto Craig’s densiti work and his "prove OOH ads work" mission.',
      'You both lean into attention-grabbing creative — Phil’s "simple ideas, bigger impact" motion-enabled DOOH posts echo Craig’s steady stream of #ooh and #mockupmonday creative showcases.',
    ],
  },
  {
    index: 442,
    name: 'Hussein Khader',
    role: 'Founder & CEO',
    company: 'The Neuron',
    location: 'Jordan / Dubai',
    confidence: 'Medium',
    matchReason: 'Cross-market media-tech founder',
    linkedinUrl: 'https://www.linkedin.com/in/husseinkhader',
    principles: ['another market (MENA)', 'media-tech founder', 'shared interest: AI in media'],
    talkingPoints: [
      'Both are media / ad-tech founders in different regions — Hussein founded The Neuron (Dubai) and earlier Seagulls Media (Jordan); Craig founded GOOD TRAFFIC and densiti in the US and Mexico. A founder-to-founder intro across markets.',
      'There’s a shared automation thread: Hussein’s "My Journey to Automation" article and his "AI Powered Reporting" launch align with Craig’s stated interest in "testing technology" and the AI-in-advertising posts he engages with.',
      'DOOH is a credible bridge — Hussein engages with Broadsign and AdTech podcast content, so even though The Neuron is broader media automation, there’s a real entry point into Craig’s out-of-home world.',
    ],
  },
];

function ConfidencePill({ confidence }) {
  const classes =
    confidence === 'High'
      ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
      : 'border-mw-gold-antique/40 bg-mw-gold-antique/15 text-mw-parchment';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {confidence}
    </span>
  );
}

function InitialsBadge({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  const dims =
    size === 'lg'
      ? 'h-20 w-20 text-2xl sm:h-24 sm:w-24 border-mw-gold-antique/70'
      : 'h-14 w-14 text-base border-[#5BADDE]/40';

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full border bg-[#5BADDE]/15 font-bold text-[#AFDFF6] ${dims}`}>
      {initials}
    </div>
  );
}

export default function TwinMatchesPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#151E43] via-[#1B3767] to-[#2554A2] text-mw-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid min-h-[calc(100vh-8rem)] grid-cols-1 content-center gap-6 lg:grid-cols-[0.9fr_1.35fr]">
          <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-[#151E43]/72 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="flex items-center gap-4">
              <InitialsBadge name={sourceProfile.name} size="lg" />
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mw-gold-antique/30 bg-mw-gold-antique/15 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-mw-parchment">
                  <Sparkles className="h-3.5 w-3.5" />
                  Twin preview
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{sourceProfile.name}</h1>
                <p className="mt-1 text-sm text-white/72">Profile index #{sourceProfile.index}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-white/82">
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#5BADDE]" />
                <p>
                  {sourceProfile.role} at <span className="font-semibold text-white">{sourceProfile.company}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#5BADDE]" />
                <p>{sourceProfile.location}</p>
              </div>
              <div className="flex gap-3">
                <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#5BADDE]" />
                <p>{sourceProfile.headline}</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-[#AFDFF6]">Raw profile signals</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sourceProfile.focus.map((item) => (
                  <span key={item} className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/84">
                    {item}
                  </span>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {sourceProfile.evidence.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-white/76">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mw-gold-antique" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-[#AFDFF6]">People you should meet</p>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Matches with ready-to-use talking points</h2>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/78">
                <Users className="h-4 w-4 text-[#5BADDE]" />
                3 curated introductions
              </div>
            </div>

            <div className="grid gap-4">
              {matches.map((match) => (
                <article key={match.index} className="rounded-lg border border-white/10 bg-white/[0.08] p-4 shadow-xl shadow-black/10 backdrop-blur">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <InitialsBadge name={match.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold leading-tight text-white">{match.name}</h3>
                            <ConfidencePill confidence={match.confidence} />
                          </div>
                          <p className="mt-1 text-sm text-white/76">
                            {match.role}, {match.company}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/66">
                            <span className="inline-flex items-center gap-1">
                              <Globe2 className="h-3.5 w-3.5 text-[#5BADDE]" />
                              {match.location}
                            </span>
                            <span>Profile index #{match.index}</span>
                            <span>{match.matchReason}</span>
                          </div>
                        </div>
                        <Link
                          href={match.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/14 bg-white/8 text-white/82 transition hover:border-mw-gold-antique/60 hover:text-mw-gold-antique"
                          aria-label={`Open ${match.name} on LinkedIn`}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.principles.map((principle) => (
                          <span key={principle} className="rounded-full bg-[#5BADDE]/16 px-2.5 py-1 text-xs font-medium text-[#D8F2FF]">
                            {principle}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-2">
                        {match.talkingPoints.map((point) => (
                          <div key={point} className="flex gap-2 rounded-md border border-white/8 bg-[#151E43]/42 px-3 py-2 text-sm leading-relaxed text-white/82">
                            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-mw-gold-antique" />
                            <p>{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
