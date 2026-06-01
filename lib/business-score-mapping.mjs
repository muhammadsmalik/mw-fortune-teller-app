/**
 * Maps each scoring dimension to the Moving Walls product that addresses a gap
 * there. Source of truth: MASTER_DOCS/MW_PRODUCT_LINEUP.md. The route builds the
 * email's recommendation from the WEAKEST scored dimension.
 */
export const DIMENSION_PRODUCT = {
  discoverability: {
    product: 'MW Market',
    why: 'List your inventory in a self-serve marketplace so brands — and AI assistants — can find and buy it as easily as social media.',
  },
  easeOfPurchase: {
    product: 'MW Studio',
    why: 'Stand up self-serve booking, content and player management so buyers can transact directly without manual back-and-forth.',
  },
  measurement: {
    product: 'MW Measure',
    why: 'Give advertisers proof of performance — audience, attribution and post-campaign reporting — as a value-added service.',
  },
  programmaticReadiness: {
    product: 'MW Activate',
    why: 'Plug your inventory into global programmatic demand through SSP/DSP and marketplace connectivity.',
  },
  audienceIntelligence: {
    product: 'MW Science',
    why: 'Turn first-party and location data into audience planning and insights that shape smarter campaigns.',
  },
};

/** Build the recommendation object from a weakest-dimension key. Returns null if unknown. */
export function recommendationFor(weakestKey, label) {
  const m = DIMENSION_PRODUCT[weakestKey];
  if (!m) return null;
  return { dimensionKey: weakestKey, dimensionLabel: label || weakestKey, product: m.product, why: m.why };
}
