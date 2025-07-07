import { NextResponse } from 'next/server';

// Helper function to parse date objects from LinkedIn experience
// (LinkedIn month is 1-indexed, Date month is 0-indexed)
const parseLinkedInDate = (dateObj) => {
    if (!dateObj || typeof dateObj.year !== 'number' || typeof dateObj.month !== 'number') {
        return null; // Invalid date object
    }
    // Day is optional in some LinkedIn entries, default to 1
    return new Date(dateObj.year, dateObj.month - 1, dateObj.day || 1);
};

// Helper function to normalize LinkedIn profile URLs
function normalizeLinkedInUrl(url) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== 'www.linkedin.com' && parsed.hostname !== 'linkedin.com') {
        return null;
    }
    const match = parsed.pathname.match(/^\/in\/([A-Za-z0-9\-_%]+)\/?$/);
    if (!match) return null;
    const username = match[1];
    return `https://www.linkedin.com/in/${username}`;
  } catch {
    return null;
  }
}


export async function POST(request) {
  try {
    const { linkedinUrl: rawLinkedinUrl } = await request.json();

    if (!rawLinkedinUrl) {
      return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
    }

    const linkedinUrl = normalizeLinkedInUrl(rawLinkedinUrl);
    if (!linkedinUrl) {
        return NextResponse.json({ error: 'Invalid LinkedIn Profile URL format.' }, { status: 400 });
    }

    const apiKey = process.env.ENRICHLAYER_API_KEY;
    if (!apiKey) {
      console.error('ENRICHLAYER_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error. API key missing.' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
    };

    // Step 1: Fetch Profile Data
    const profileApiUrl = `https://enrichlayer.com/api/v2/profile?url=${encodeURIComponent(linkedinUrl)}`;
    const profileResponse = await fetch(profileApiUrl, { headers });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error('Failed to fetch LinkedIn profile:', profileResponse.status, errorData);
      return NextResponse.json({ error: `Failed to fetch LinkedIn profile: ${profileResponse.statusText || errorData}` }, { status: profileResponse.status });
    }
    const profileData = await profileResponse.json();

    if (profileData.message && profileData.code) { 
        console.error('EnrichLayer profile API error:', profileData.message);
        return NextResponse.json({ error: `EnrichLayer profile API error: ${profileData.message}` }, { status: 400 });
    }

    // Step 2: Identify the Latest Company
    let latestExperience = null;
    if (profileData.experiences && profileData.experiences.length > 0) {
      const sortedExperiences = [...profileData.experiences].sort((a, b) => {
        const aEndsAt = a.ends_at ? parseLinkedInDate(a.ends_at) : null;
        const bEndsAt = b.ends_at ? parseLinkedInDate(b.ends_at) : null;
        const aStartsAt = a.starts_at ? parseLinkedInDate(a.starts_at) : new Date(0); 
        const bStartsAt = b.starts_at ? parseLinkedInDate(b.starts_at) : new Date(0); 

        if (!aEndsAt && bEndsAt) return -1; 
        if (aEndsAt && !bEndsAt) return 1;  

        if (!aEndsAt && !bEndsAt) {
          return bStartsAt && aStartsAt ? bStartsAt.getTime() - aStartsAt.getTime() : 0;
        }

        if (aEndsAt && bEndsAt) {
          if (bEndsAt.getTime() !== aEndsAt.getTime()) {
            return bEndsAt.getTime() - aEndsAt.getTime();
          }
          return bStartsAt && aStartsAt ? bStartsAt.getTime() - aStartsAt.getTime() : 0;
        }
        return 0;
      });
      latestExperience = sortedExperiences[0];
    }

    if (!latestExperience || !latestExperience.company_linkedin_profile_url) {
      return NextResponse.json({
        profileData,
        latestCompanyData: null,
        message: 'Latest company LinkedIn URL not found in profile experiences or profile has no experiences.',
      });
    }

    const companyProfileUrl = latestExperience.company_linkedin_profile_url;
    if (!companyProfileUrl.includes('/company/')) {
        console.warn('Latest experience company URL might not be a company profile:', companyProfileUrl);
    }

    // Step 3: Fetch Company Data for the Latest Company
    const companyApiUrl = `https://enrichlayer.com/api/v2/company?url=${encodeURIComponent(companyProfileUrl)}&categories=include&funding_data=include&exit_data=include&acquisitions=include&extra=include&use_cache=if-present&fallback_to_cache=on-error`;
    const companyResponse = await fetch(companyApiUrl, { headers });

    if (!companyResponse.ok) {
      const errorData = await companyResponse.text();
      console.error('Failed to fetch LinkedIn company data:', companyResponse.status, errorData);
      return NextResponse.json({
        profileData,
        latestCompanyData: null,
        error: `Failed to fetch company data: ${companyResponse.statusText || errorData}`,
      }, { status: companyResponse.status });
    }
    const latestCompanyData = await companyResponse.json();

     if (latestCompanyData.message && latestCompanyData.code) { 
        console.error('EnrichLayer company API error:', latestCompanyData.message);
        return NextResponse.json({
            profileData,
            latestCompanyData: null,
            error: `EnrichLayer company API error: ${latestCompanyData.message}`
        }, { status: 400 });
    }

    // Step 4: Return Combined Data
    return NextResponse.json({ profileData, latestCompanyData });

  } catch (error) {
    console.error('Error in get-linkedin-company-details endpoint:', error);
    // Ensure error.message is a string, and provide a fallback
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `An unexpected error occurred: ${errorMessage}` }, { status: 500 });
  }
} 