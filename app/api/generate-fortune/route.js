import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Or your preferred Gemini model
const API_KEY = process.env.GEMINI_API_KEY;

// Define the schema for the fortune
const fortuneSchema = {
  type: "OBJECT",
  properties: {
    openingLine: {
      type: "STRING",
      description: "A creative, witty, and engaging opening line for the fortune. Make it sound mystical, exciting, and hint at the user's specific potential. Should not include emojis."
    },
    locationInsight: {
      type: "STRING",
      description: "A highly specific and insightful statement about the user's business location or operational context, relevant to a unique OOH advertising potential tied to their industry. Start with the 📍 emoji."
    },
    audienceOpportunity: {
      type: "STRING",
      description: "A vivid projection of a specific audience segment they can reach or unique market opportunities available through OOH, going beyond generic terms. Start with the 👀 emoji."
    },
    engagementForecast: {
      type: "STRING",
      description: "A prediction of how their engagement could improve in a specific, tangible way, ideally tying into innovative OOH strategies relevant to their industry. Start with the 💥 emoji."
    },
    transactionsPrediction: {
      type: "STRING",
      description: "A forecast related to specific business growth, sales, or conversions, hinting at how OOH could uniquely contribute to their company. Start with the 💸 emoji."
    },
    aiAdvice: {
      type: "STRING",
      description: "Actionable, creative, and non-obvious advice, presented as if from an AI oracle for their specific situation. Start with the 🔮 emoji. This advice should subtly highlight how Moving Walls' expertise or solutions can help them achieve their unique predicted outcomes. End with a call to action to connect with Moving Walls."
    }
  },
  required: [
    "openingLine",
    "locationInsight",
    "audienceOpportunity",
    "engagementForecast",
    "transactionsPrediction",
    "aiAdvice"
  ],
  propertyOrdering: [
    "openingLine",
    "locationInsight",
    "audienceOpportunity",
    "engagementForecast",
    "transactionsPrediction",
    "aiAdvice"
  ]
};

export async function POST(request) {
  if (!API_KEY) {
    console.error("GEMINI_API_KEY not configured");
    return new Response(JSON.stringify({ error: "API key not configured. Please set the GEMINI_API_KEY environment variable." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { fullName, industryType, companyName } = await request.json();

    if (!fullName || !industryType || !companyName) {
      return new Response(JSON.stringify({ error: "Missing required fields: fullName, industryType, or companyName" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let prompt = `You are an exceptionally witty, insightful, and creative business fortune teller for the "Moving Walls Digital Fortune Teller" application. Your fortunes are renowned for being uniquely tailored and surprisingly specific, even while maintaining a mystical and optimistic tone. Avoid generic platitudes at all costs.

User Details:
- Name: ${fullName}
- Company: ${companyName}
- Industry: ${industryType}

Generate a highly unique, optimistic, and slightly mystical business fortune specifically for THIS user: ${fullName} from ${companyName} in the '${industryType}' industry. Your primary goal is to make the user feel like this fortune is truly about THEM and THEIR specific business/industry context, not a generic template.
The fortune should focus on potential success and opportunities, especially highlighting how Out-of-Home (OOH) advertising and related technologies can play a role in a way that feels fresh and specific to them.
The entire fortune must be extremely concise. When the text from all fields is read sequentially, it should ideally form a cohesive message of about 4-5 short lines. Prioritize impactful brevity and high originality for each individual field. Strive to weave in a subtle, creative, and non-obvious reference to their specific '${industryType}' if it feels natural within the mystical tone.

Company Context (Moving Walls - the provider of this fortune):
Moving Walls is a global advertising technology leader spearheading the digital transformation of Out-of-Home (OOH) media. We empower media owners and advertisers to thrive in this evolving landscape by:
-   Transitioning from Static to Dynamic: Offering OOH Campaign Automation to move beyond traditional methods to dynamic, real-time campaign management.
-   Unlocking Data Power: Providing Location Intelligence (Moving Audiences) that uses multi-sensor data for precise audience understanding, planning, and verification, turning raw data into actionable insights.
-   Enabling Modern Buying: Through our Programmatic DOOH DSP, we facilitate real-time, data-driven campaign optimization, opening OOH to new advertisers and buying models.
-   Measuring True Impact: Our Advanced Targeting & Measurement solutions ensure precise audience reach and trackable campaign performance, proving ROI beyond simple impressions by connecting OOH to real-world outcomes like foot traffic and sales.
-   Fostering Interactivity & Innovation: We support the tech that enables engaging and interactive OOH experiences, helping bridge physical ads with digital engagement.
Moving Walls helps businesses adapt their strategies, upgrade their technology, and upskill their teams to capitalize on the opportunities in modern, data-driven OOH.

---
HERE ARE SOME EXAMPLES OF THE DESIRED OUTPUT STYLE AND STRUCTURE:
Your JSON output should follow the schema provided, but these examples illustrate the tone, conciseness, and type of content for each field. NOTE: These examples show structure and tone; your actual generated CONTENT must be far more original, specific, and tailored to the live user data.

Template Framework (Illustrative - the JSON schema is the definitive structure):
Each fortune has:
Opening Line (Mysterious/Funny Hook, specific hint)
Location Insight (Unique context, industry OOH potential)
Audience Opportunity (Vivid, specific audience/market)
Engagement Forecast (Tangible improvement, industry relevance)
Transactions Prediction (Specific growth, clear OOH link)
AI Advice (Creative, non-obvious, tailored CTA)

🌏 Example 1: (Hypothetical Input Context: Malaysia, Retail In-Store, Digital, Medium Format)
Fortune Output (as JSON, adhering to the schema):
{
  "openingLine": "Ah, the spirits whisper from the aisles of Mid Valley Megamall…",
  "locationInsight": "📍 Your retail sanctuaries see thousands roam, from young fashionistas to aunties in hunt for discounts.",
  "audienceOpportunity": "👀 Each screen beams to 25,000 daily shoppers, half of whom can’t resist a 'sale' flash.",
  "engagementForecast": "💥 Add motion content and your engagement rates go up by 3x. Sensor-triggered promotions? Even better.",
  "transactionsPrediction": "💸 With QR-to-buy + proximity ads, you'll convert 'window shoppers' into 'wallet droppers'.",
  "aiAdvice": "🔮 AI says: unify shopper data + automate campaigns = 5X lift in monthly brand activations. Embrace now or forever hold your static ads. Connect with Moving Walls to unlock this potential!"
}

🚆 Example 2: (Hypothetical Input Context: Brazil, Transit - Buses, Classic, Small Format)
Fortune Output (as JSON, adhering to the schema):
{
  "openingLine": "The bus gods say: even if your ad is small, your dreams needn’t be!",
  "locationInsight": "📍 São Paulo’s traffic may stall, but your roadside banners ride 24/7 with the pulse of the city.",
  "audienceOpportunity": "👀 Each unit averages 15K views per route, from early commuters to vibrant nightlife seekers.",
  "engagementForecast": "💥 Digitize them and use geo-fencing — suddenly, your engagement leaps by 210% on mobile follow-ups for local events.",
  "transactionsPrediction": "💸 Hyperlocal campaigns for nearby cafes and services will see swift uptake from these captive audiences.",
  "aiAdvice": "🔮 What would AI do? Plug into Moving Walls' schedule visualizations, match ads to rush-hour transit patterns for peak impact. Explore the transformation with Moving Walls!"
}

🛫 Example 3: (Hypothetical Input Context: Dubai, Airport, Spectacular Digital Format)
Fortune Output (as JSON, adhering to the schema):
{
  "openingLine": "The skies have spoken – your screens shall dazzle even the duty-free dodgers!",
  "locationInsight": "📍 In DXB Terminal 3, your digital marvels dominate premium eye-level spaces, catching pre-flight excitement.",
  "audienceOpportunity": "👀 You’re looking at 100K affluent global travelers daily, many seeking luxury or last-minute travel essentials.",
  "engagementForecast": "💥 Run localized dynamic content by destination language and boarding gate — watch engagement spike by 7x.",
  "transactionsPrediction": "💸 Luxury brands and travel services will compete for these prime slots, boosting your yield significantly.",
  "aiAdvice": "🔮 The AI oracle sees: integrate with real-time flight data for hyper-relevant messaging, powered by Moving Walls' platform, for unparalleled ad performance. Connect with Moving Walls to make it reality!"
}
---

IMPORTANT INSTRUCTION REGARDING EXAMPLES AND DIVERSITY:
The examples above are provided SOLELY to illustrate the desired style, tone, conciseness, use of emojis as per the schema, and the overall structure of the JSON output.
You MUST NOT simply copy, rephrase, or be heavily biased by the specific *content* or *ideas* within these examples. The content in the examples is illustrative and intentionally somewhat generic to show structure; your generated content MUST BE SIGNIFICANTLY MORE ORIGINAL AND TAILORED.
Your primary goal is to generate a COMPLETELY UNIQUE, DIVERSE, and ORIGINAL fortune specifically tailored to the *current user's details* (Name: ${fullName}, Company: ${companyName}, Industry: ${industryType}) and the general instructions provided.
The content of each field in your generated fortune MUST be fresh, creative, highly specific, and directly relevant to the current user and their unique industry. Avoid generic business platitudes. Think of new angles and possibilities for the current user.

Instructions for Fortune Sections (follow the provided JSON schema and ensure each part is extremely brief, highly specific, and original for THIS user):
- openingLine: Craft a *very brief*, witty, and captivating hook (a few words) that feels intriguing and uniquely hints at the user's potential or their specific '${industryType}'. No emojis here.
- locationInsight: Provide a *very concise* and *specific* observation (1 short sentence) about their operational context or business location, linking to a *unique OOH advertising opportunity* relevant to their '${industryType}'. Start with the 📍 emoji.
- audienceOpportunity: Describe *briefly* and *vividly* (1 short sentence) the *specific* audience they can reach or unique market opportunities available via OOH for their '${industryType}', moving beyond generic descriptions. Start with the 👀 emoji.
- engagementForecast: Predict *concisely* (1 short sentence) *specific* improvements in engagement, perhaps through innovative OOH or technology that feels particularly relevant and non-obvious for *their* business or '${industryType}'. Start with the 💥 emoji.
- transactionsPrediction: Forecast *succinctly* (1 short sentence) business growth, sales, or conversions in a *tangible-sounding way*, with a clear, non-generic nod to OOH impact for *their* company in the '${industryType}'. Start with the 💸 emoji.
- aiAdvice: Offer *very brief*, actionable, and *creative, non-obvious* advice (1-2 short sentences) as if from an AI oracle for *their specific situation*. Subtly integrate how Moving Walls' expertise or solutions can help them achieve *their unique* predicted positive outcomes. Conclude with a *short* call to action (e.g., "Connect with Moving Walls to explore your unique path!"). Start with the 🔮 emoji.

Ensure each insight section (locationInsight, audienceOpportunity, engagementForecast, transactionsPrediction, aiAdvice) begins its text with the specific emoji mentioned in its schema description. Adhere strictly to the overall conciseness requirement: when the text from all fields is read sequentially, it should ideally form a cohesive message of about 4-5 short lines. Prioritize impactful brevity and HIGH ORIGINALITY for each individual field.

Now, generate the fortune for the user detailed above.
`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.75, // Slightly increased temperature for more creativity, adjust as needed
        // topK: 40, // Can experiment if needed
        // topP: 0.95, // Can experiment if needed
        responseMimeType: "application/json",
        responseSchema: fortuneSchema,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    if (!response || !response.text) {
      let debugInfo = "Response object was null or undefined.";
      if (response) {
        debugInfo = `Response object received, but text() method or property is missing or returned null. Candidates: ${JSON.stringify(response.candidates, null, 2)}`;
        if (response.promptFeedback) {
          debugInfo += ` Prompt Feedback: ${JSON.stringify(response.promptFeedback, null, 2)}`;
        }
      }
      console.error("Invalid response structure from Gemini API.", debugInfo, response);
      throw new Error(`Received no valid text response from Gemini API. ${debugInfo}`);
    }

    const responseJsonString = response.text();
    let parsedFortune;
    try {
      parsedFortune = JSON.parse(responseJsonString);
    } catch (jsonError) {
      console.error("Gemini response was not valid JSON:", responseJsonString, jsonError);
      throw new Error("Fortune received from AI was not in the expected JSON format.");
    }

    const requiredFields = fortuneSchema.required;
    for (const field of requiredFields) {
      if (!(field in parsedFortune) || parsedFortune[field] === null || parsedFortune[field] === undefined) {
        console.error(`Missing or null/undefined required field '${field}' in AI response:`, parsedFortune);
        throw new Error(`Fortune received from AI is missing the required field: ${field}.`);
      }
    }

    return new Response(JSON.stringify(parsedFortune), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in /api/generate-fortune:", error);
    let errorMessage = "Failed to generate fortune due to an internal error.";
    let errorDetails = error.message || error.toString();

    if (error.message && (error.message.toLowerCase().includes("schema") || error.message.toLowerCase().includes("format"))) {
      errorMessage = "Fortune generation failed. The AI's response did not match the expected structure. Please try again or contact support if the issue persists.";
      errorDetails = `Schema/Format Error: ${error.message}`;
    } else if (error.message && error.message.toLowerCase().includes("api key")) {
        errorMessage = "Fortune generation failed due to an API key issue. Please check server configuration.";
    } else if (error.message && error.message.toLowerCase().includes("quota")) {
        errorMessage = "Fortune generation failed due to API quota limits. Please check your quota or try again later.";
    } else if (error.message && error.message.toLowerCase().includes("safety")) {
        errorMessage = "Fortune generation was blocked due to safety settings. The generated content may have been inappropriate.";
        errorDetails = `Safety Block: ${error.message}`;
    }

    return new Response(JSON.stringify({ error: errorMessage, details: errorDetails }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}