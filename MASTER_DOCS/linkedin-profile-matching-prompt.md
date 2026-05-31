# LinkedIn Profile Matching Prompt

Use this prompt to ask an AI model to match attendee LinkedIn profiles from a compact indexed profile list.

The goal of this first pass is only to identify the top 3 matched profiles for each profile and explain why each match makes sense. Do not ask for talking points in this pass; generate those in a separate follow-up prompt after the matches are approved.

Generated files can be rebuilt from scraped profile JSON with:

```bash
npm run build:linkedin-matching-prompt
```

This writes:

- `MASTER_DOCS/linkedin-profile-matching-prompt-filled.md`
- `MASTER_DOCS/linkedin-profile-index-map.json`

## Prompt

You are matching event attendees for high-value business conversations.

You will receive an indexed list of LinkedIn-derived profiles. Each profile is intentionally compact to reduce token usage. Names may be excluded, so refer to people only by their profile index.

Your task:

1. Review all indexed profiles.
2. For each profile, identify its top 3 strongest matches from the rest of the list.
3. Return only the source profile index, matched profile indexes, and a concise justification for each match.
4. Do not invent details. Use only the profile information provided.
5. Do not include generic networking advice, talking points, intro messages, or biographies.

Matching criteria:

- Prioritize complementary business relevance, not just similarity.
- Prioritize cross-company, cross-market, and cross-capability matches that create new conversations.
- Strong matches can be based on buyer-seller fit, geographic expansion, product/platform compatibility, audience/channel overlap, measurement/data needs, leadership peer relevance, or strategic partnership potential.
- Avoid matching people only because both are senior or both are in advertising.
- Prefer matches where there is a clear reason they would have something specific and useful to discuss.
- Avoid same-company matches by default; delegates from the same company likely already know each other and often attend together.
- Treat obvious company variants, parent/subsidiary names, and same delegation groups as same-company unless the profile data clearly says otherwise.
- Same-company matches are allowed only as rare exceptions when their roles are clearly complementary across different functions, regions, business units, or buyer-seller responsibilities.
- If you choose a same-company match, the reason must state the specific cross-functional value, not company overlap.
- Each profile's 3 matches should be diverse: avoid matches all coming from the same company, delegation group, country cluster, or narrow functional peer set.
- If the data is thin, say the match is lower confidence instead of overstating it.

Input profile format:

```text
[1]
Bio: <summary/headline/occupation, excluding name if needed>
Current or most recent experience:
- Title: <title>
- Company: <company>
- Description: <description if available>
- Location: <location if available>
Industry: <industry if available>
Country/region: <country or location if available>
Skills/themes: <short list if available>

[2]
Bio: ...
Current or most recent experience:
- Title: ...
- Company: ...
...
```

Important interpretation notes:

- Treat `summary`, `headline`, and `occupation` as the main bio signal.
- Treat the current role as the experience where `ends_at` is null.
- If multiple roles have `ends_at: null`, use the one that appears most commercially relevant, usually the most senior operating role.
- If no current role exists, use the latest role by `ends_at`, then `starts_at`.
- Do not expose names if names are omitted from the input.

Output format:

Return valid minified JSON only, with this compact shape:

```json
{"1":[[3,"H","reason"],[2,"M","reason"],[7,"M","reason"]],"2":[[1,"H","reason"],[3,"H","reason"],[8,"M","reason"]]}
```

Format meaning:

- Object key = source profile index as a string.
- Each value = exactly 3 match tuples.
- Tuple format = `[matchedProfileIndex, confidence, reason]`.
- Confidence codes: `H` = high, `M` = medium, `L` = low.

Constraints:

- Return one object key for every input profile.
- Each profile must have exactly 3 matches.
- A profile must never match to itself.
- Match direction matters: profile 1 can choose profile 2 even if profile 2 has different top matches.
- It is acceptable for many profiles to choose the same strong connector profile if justified by the data.
- Prefer all 3 matches to be from different companies than the source profile.
- Same-company matches are capped at 1 per source profile, and only when clearly stronger than external alternatives.
- Prefer the 3 matches to come from 3 different companies unless the input set lacks enough useful alternatives.
- Do not use same-company matches as filler; if only weak same-company value exists, choose a lower-confidence external match instead.
- Do not give a same-company match `H` confidence unless the cross-functional or cross-market value is exceptional.
- Keep each reason under 22 words.
- Confidence must be one of: `H`, `M`, `L`.
- Minify the JSON: no indentation, no line breaks, no markdown, no commentary.

Profiles:

```text
<paste indexed profiles here>
```

## Compact Profile Builder Guidance

When converting raw EnrichLayer JSON into the indexed input, include only these fields:

- `summary`
- `headline`
- `occupation`
- `industry`
- `country_full_name`, `country`, `location_str`, `city`, `state`
- Current or latest `experiences[]` item:
  - `title`
  - `company`
  - `description`
  - `location`
  - `starts_at`
  - `ends_at`
- A short, capped list of `skills` if present

Do not include:

- Personal emails
- Personal phone numbers
- Profile picture URLs
- People also viewed
- Recommendations
- Raw activity feeds
- Full historical experience unless it is essential for matching

## Example Input

```text
[1]
Bio: CEO and co-founder of an adtech platform; software engineer background; builds technology products for companies.
Current or most recent experience:
- Title: CEO & Co-Founder
- Company: LatinAd
- Description:
- Location:
Industry: Advertising Services
Country/region: Argentina
Skills/themes: software engineering, product development, adtech, platform development

[2]
Bio: Programmatic out-of-home platform operator with long experience in web technology and digital advertising.
Current or most recent experience:
- Title: Company Owner
- Company: Taggify
- Description:
- Location:
Industry: Advertising Services
Country/region: Argentina
Skills/themes: programmatic OOH, web technology, operations, digital advertising

[3]
Bio: CEO of an outdoor advertising company focused on business growth, community engagement, and outdoor media.
Current or most recent experience:
- Title: Managing Director/CEO
- Company: Bishopp
- Description:
- Location: Kelvin Grove
Industry: Advertising Services
Country/region: Australia
Skills/themes: outdoor advertising, leadership, community engagement, media owner
```

## Example Output

```json
{"1":[[2,"H","Both run Argentina ad platforms with strong DOOH technology and monetization overlap."],[3,"M","Outdoor media operator could discuss adtech automation and platform-led inventory growth."],[4,"L","LED screen operator may benefit from ad platform monetization ideas."]],"2":[[1,"H","Argentina platform leaders share programmatic OOH and product growth concerns."],[3,"H","Both are Taggify/programmatic DOOH leaders with direct strategic overlap."],[4,"M","Programmatic OOH experience could help monetize LED screen inventory."]]}
```
