import { z } from 'zod';
import OpenAI from 'openai';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// LLM Provider Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-preview-04-17";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME || "gpt-4o-mini";
const LLM_PROVIDER = process.env.LLM_PROVIDER || "GEMINI"; // GEMINI or OPENAI
const ENABLE_LLM_FALLBACK = process.env.ENABLE_LLM_FALLBACK === "true"; // true or false

// Define the schema for the initial fortune (Google Gemini format)
const initialFortuneSchema = {
  type: "OBJECT",
  properties: {
    openingStatement: {
      type: "STRING",
      description: "A powerful, ultra-concise opening statement (max 1 sentence, max 100 characters) that directly addresses the user by name in a compelling way. Should be punchy, memorable, and intriguing - like 'Sarah, Singapore's digital revolution starts with you.' or 'Mark, London's OOH future unfolds through your vision.'"
    },
    insight1: {
      type: "OBJECT",
      properties: {
        challenge: {
          type: "STRING",
          description: "The user's first selected challenge (exact text)."
        },
        insight: {
          type: "STRING",
          description: "A hyper-localized, futuristic insight formatted as 2-3 bullet points separated by newlines. Each line should be concise (max 100 characters per line) and use specific places/landmarks from the provided location. Format: 'Line 1\\nLine 2\\nLine 3'. NO generic placeholders."
        }
      },
      required: ["challenge", "insight"]
    },
    insight2: {
      type: "OBJECT",
      properties: {
        challenge: {
          type: "STRING",
          description: "The user's second selected challenge (exact text)."
        },
        insight: {
          type: "STRING",
          description: "A hyper-localized, futuristic insight formatted as 2-3 bullet points separated by newlines. Each line should be concise (max 100 characters per line) and use specific places/landmarks from the provided location. Format: 'Line 1\\nLine 2\\nLine 3'. NO generic placeholders."
        }
      },
      required: ["challenge", "insight"]
    }
  },
  required: [
    "openingStatement",
    "insight1",
    "insight2"
  ]
};

// Define the equivalent schema for OpenAI
const openAIInitialFortuneSchema = {
  name: "initialFortuneOutput",
  strict: true,
  schema: {
    type: "object",
    properties: {
      openingStatement: {
        type: "string",
        description: "A powerful, ultra-concise opening statement (max 1 sentence, max 100 characters) that directly addresses the user by name in a compelling way. Should be punchy, memorable, and intriguing - like 'Sarah, Singapore's digital revolution starts with you.' or 'Mark, London's OOH future unfolds through your vision.'"
      },
      insight1: {
        type: "object",
        properties: {
          challenge: {
            type: "string",
            description: "The user's first selected challenge (exact text)."
          },
          insight: {
            type: "string",
            description: "A hyper-localized, futuristic insight formatted as 2-3 bullet points separated by newlines. Each line should be concise (max 100 characters per line) and use specific places/landmarks from the provided location. Format: 'Line 1\\nLine 2\\nLine 3'. NO generic placeholders."
          }
        },
        required: ["challenge", "insight"],
        additionalProperties: false
      },
      insight2: {
        type: "object",
        properties: {
          challenge: {
            type: "string",
            description: "The user's second selected challenge (exact text)."
          },
          insight: {
            type: "string",
            description: "A hyper-localized, futuristic insight formatted as 2-3 bullet points separated by newlines. Each line should be concise (max 100 characters per line) and use specific places/landmarks from the provided location. Format: 'Line 1\\nLine 2\\nLine 3'. NO generic placeholders."
          }
        },
        required: ["challenge", "insight"],
        additionalProperties: false
      }
    },
    required: [
      "openingStatement",
      "insight1",
      "insight2"
    ],
    additionalProperties: false
  }
};

// Zod schema for final validation
const FortuneSchema = z.object({
  openingStatement: z.string().max(100).describe("A powerful, ultra-concise opening statement that directly addresses the user with compelling brevity."),
  insight1: z.object({
    challenge: z.string().describe("The user's first selected challenge."),
    insight: z.string().max(300).describe("A hyper-localized, futuristic insight on how to solve this challenge with specific geographic references."),
  }),
  insight2: z.object({
    challenge: z.string().describe("The user's second selected challenge."),
    insight: z.string().max(300).describe("A hyper-localized, futuristic insight on how to solve this challenge with specific geographic references."),
  }),
});

let openAIClient;
if (OPENAI_API_KEY) {
  try {
    openAIClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  } catch (e) {
    console.error("Failed to initialize OpenAI client:", e.message);
  }
}

async function generateInitialFortuneWithOpenAI(prompt, schema) {
  if (!openAIClient) {
    throw new Error("OpenAI client not initialized. Check OPENAI_API_KEY or initialization error.");
  }
  try {
    const completion = await openAIClient.chat.completions.create({
      model: OPENAI_MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are Kai, a genius-level lead expert from Moving Walls. Generate a hyper-personalized, concise, and futuristic strategic vision for the user in JSON format according to the provided schema. Ensure all fields are populated as described. Adhere to all constraints like character limits and formatting."
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema
      },
      temperature: 0.7,
    });

    if (completion.choices[0].finish_reason === "length") {
      throw new Error("OpenAI response was truncated (max_tokens).");
    }

    const message = completion.choices[0].message;

    if (message.refusal) {
      throw new Error(`OpenAI generation refused: ${message.refusal}`);
    }

    if (!message.content) {
      throw new Error("OpenAI response did not include content.");
    }

    try {
      return JSON.parse(message.content);
    } catch (jsonError) {
      console.error("OpenAI response content was not valid JSON:", message.content, jsonError);
      throw new Error("Initial fortune from OpenAI was not in the expected JSON format.");
    }

  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    if (error.status === 401) throw new Error("OpenAI API request failed: Invalid API key.");
    if (error.status === 429) throw new Error("OpenAI API request failed: Rate limit exceeded.");
    throw new Error(`OpenAI API request failed: ${error.message}`);
  }
}

export async function POST(req) {
  const isServerInDebugMode = process.env.NEXT_PUBLIC_DEBUG === "true";
  const forceGeminiError = process.env.DEBUG_FORCE_GEMINI_ERROR === "true"; // New flag
  let effectiveProvider = LLM_PROVIDER;
  let debugProviderClient = null;

  let initialFortune;
  let providerUsed = "";
  let errorDetailsForResponse = "";

  try {
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const {
      fullName,
      companyName,
      industryType,
      geographicFocus,
      selectedPersona,
      selectedQuestions,
      unselectedQuestions,
      advertiserContext,
      publisherContext,
      platformContext,
      linkedinData,
      companyDetails,
      debugProvider
    } = requestBody;

    if (isServerInDebugMode && debugProvider) {
      if (debugProvider === "GEMINI" || debugProvider === "OPENAI") {
        effectiveProvider = debugProvider;
        debugProviderClient = debugProvider;
        console.log(`SERVER DEBUG: Client requested override to ${effectiveProvider}`);
      } else {
        console.warn(`SERVER DEBUG: Invalid debugProvider value \'${debugProvider}\' from client. Ignoring.`);
      }
    }

    if (!fullName || !companyName || !geographicFocus || !selectedPersona || !selectedQuestions || selectedQuestions.length < 2) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: 'fullName, companyName, geographicFocus, selectedPersona, and at least 2 selectedQuestions are required'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const capitalizedPersona = selectedPersona.charAt(0).toUpperCase() + selectedPersona.slice(1);
    const personaContext = {
      Advertiser: advertiserContext,
      Publisher: publisherContext,
      'Platform & Service Provider': platformContext,
    };
    const isGenericLocation = geographicFocus === 'Your Region';

    const locationInstruction = isGenericLocation
      ? `2. **BE INSIGHTFUL & STRATEGIC:**
         - Provide insights that are broadly applicable to the user's industry (${industryType}).
         - Focus on strategic business concepts and future trends.
         - Do NOT use specific city or country names. Do NOT mention words like 'Region' or 'Area'. Keep the advice general but powerful.`
      : `2. **BE HYPER-LOCAL & SPECIFIC FOR ${geographicFocus}:**
         - If Singapore: mention Marina Bay, Orchard Road, CBD, Changi
         - If Kuala Lumpur: mention KLCC, Bukit Bintang, Federal Highway, Pavilion KL
         - If Jakarta: mention Sudirman, Thamrin, PIK, Grand Indonesia
         - If Bangkok: mention Sukhumvit, Siam, Silom, CentralWorld
         - If Manila: mention Makati, BGC, EDSA, SM Mall of Asia
         - Research and use REAL places from the specified location`;

    const prompt = `
      You are Kai, a genius-level lead expert from Moving Walls, the world's leading provider of out-of-home (OOH) advertising technology.
      Your task is to create a hyper-personalized, concise, and futuristic strategic vision for this specific user.
      **ACTUAL USER PROFILE (USE THESE EXACT DETAILS):**
      - **Name:** ${fullName}
      - **Company:** ${companyName}
      - **Industry:** ${industryType || 'Not specified'}
      ${!isGenericLocation ? `- **Geographic Focus:** ${geographicFocus}` : ''}
      - **Persona:** ${selectedPersona}
      ${linkedinData && Object.keys(linkedinData).length > 0 ? `- **LinkedIn Context:** ${JSON.stringify(linkedinData)}` : ''}
      ${companyDetails && Object.keys(companyDetails).length > 0 ? `- **Company Details:** ${JSON.stringify(companyDetails)}` : ''}
      **USER'S CHOSEN FUTURE CHALLENGES:**
      1. "${selectedQuestions[0]}"
      2. "${selectedQuestions[1]}"
      **CRITICAL INSTRUCTIONS - READ CAREFULLY:**
      1. **ULTRA-CONCISE OPENING:** 
         - Address ${fullName} by name in a powerful, memorable way
         - MAX 100 characters total (about 10-15 words)
         - ${isGenericLocation ? 'Reference their industry or a powerful business concept.' : `Reference ${geographicFocus} if possible`}
         - Make it intriguing and forward-looking
         - Examples: "${fullName}, your vision will redefine the ${industryType} landscape."
         - Or: "${fullName}, your DOOH vision transforms ${geographicFocus}."
      ${locationInstruction}
      3. **BE CONCISE & READABLE:**
         - Opening statement: MAX 100 characters, ultra punchy
         - Each insight: 2-3 bullet points separated by newlines
         - Each bullet point: MAX 100 characters per line
         - Use specific locations and actionable advice if location is not generic
         - Format: "Deploy AR screens at Marina Bay Sands\\nSync with Orchard Road foot traffic data\\nLaunch pilot at Changi Airport terminals"
      4. **BULLET POINT FORMAT FOR INSIGHTS:**
         - Structure each insight as 2-3 actionable points
         - ${isGenericLocation ? 'Each point should offer a strategic advantage.' : `Each point should reference specific ${geographicFocus} locations`}
         - Use action verbs: "Deploy", "Launch", "Integrate", "Sync"
         - Make each point build on the previous one
      5. **BE FUTURISTIC & ACTIONABLE:** Reference concepts like:
         - Omni-Media Sequencing, AI Co-pilots, Blockchain Attribution
         - Performance Subscriptions, Dynamic Pricing, AR Integration
         - Audience Architects, Journey Orchestration, Clean Room Data
      6. **LEVERAGE COMPANY CONTEXT:** If available, reference:
         - Company size, industry position, recent developments
         - Team composition or growth stage
         - Market presence or expansion plans
      **Your Knowledge Base Context:**
      Use the following Moving Walls persona insights to inform your response:
      <PersonaContext>
      ${personaContext[capitalizedPersona] || ''}
      </PersonaContext>
      **EXAMPLE OF WHAT NOT TO DO:**
      ❌ "Valued User, your focus at Your Company in Your Region..."
      ❌ "Srikanth Ramachandran, your leadership at Moving Walls in Singapore, Singapore is shaping the future. Let's look at OOH possibilities here."
      **EXAMPLE OF WHAT TO DO:**
      ✅ "${fullName}, Singapore's DOOH future starts now."
      ✅ "${fullName}, your vision transforms ${geographicFocus}'s skyline."
      ✅ "${fullName}, Marina Bay's screens await your revolution."
      **Output Format:** Generate a JSON object with the exact structure specified in the schema. Make the opening statement ULTRA-CONCISE and MEMORABLE.
    `;

    if (effectiveProvider === "OPENAI") {
      providerUsed = debugProviderClient ? "OpenAI (Debug Forced)" : "OpenAI (Primary)";
      console.log(`Attempting to generate initial fortune with ${providerUsed}...`);
      if (!OPENAI_API_KEY) {
        throw new Error("API key for OpenAI not configured. Please set the OPENAI_API_KEY environment variable.");
      }
      initialFortune = await generateInitialFortuneWithOpenAI(prompt, openAIInitialFortuneSchema);
    } else { // GEMINI is primary (or default, or debug forced)
      providerUsed = debugProviderClient ? "Gemini (Debug Forced)" : "Gemini (Primary)";
      console.log(`Attempting to generate initial fortune with ${providerUsed}...`);
      if (!GEMINI_API_KEY) {
        throw new Error("API key for Gemini not configured. Please set the GEMINI_API_KEY environment variable.");
      }

      try {
        // Artificial Error for Gemini Fallback Test
        if (forceGeminiError && effectiveProvider === "GEMINI") {
          console.log("DEBUG: Forcing an artificial error in Gemini path to test fallback...");
          throw new Error("Artificial Gemini Error for Fallback Test");
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL_NAME,
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: initialFortuneSchema,
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
          let debugInfo = "Gemini response object was null or undefined.";
          if (response) {
            debugInfo = `Gemini response object received, but text() method or property is missing. Candidates: ${JSON.stringify(response.candidates, null, 2)}`;
            if (response.promptFeedback) {
              debugInfo += ` Prompt Feedback: ${JSON.stringify(response.promptFeedback, null, 2)}`;
            }
          }
          throw new Error(`Received no valid text response from Gemini API. ${debugInfo}`);
        }

        const responseJsonString = response.text();
        console.log('Gemini raw response:', responseJsonString);
        initialFortune = JSON.parse(responseJsonString);

      } catch (geminiError) {
        console.error(`${providerUsed} failed:`, geminiError.message);
        errorDetailsForResponse = geminiError.message;
        if (ENABLE_LLM_FALLBACK && effectiveProvider === "GEMINI") {
          if (!OPENAI_API_KEY) {
            console.warn("Fallback to OpenAI requested but OPENAI_API_KEY is not configured.");
            throw geminiError;
          }
          providerUsed = "OpenAI (Fallback after Gemini failed)";
          console.log(`Attempting to generate initial fortune with ${providerUsed}...`);
          initialFortune = await generateInitialFortuneWithOpenAI(prompt, openAIInitialFortuneSchema);
        } else {
          throw geminiError;
        }
      }
    }

    // Validate required fields from any provider
    const requiredFields = initialFortuneSchema.required;
    for (const field of requiredFields) {
      if (!(field in initialFortune) || initialFortune[field] === null || initialFortune[field] === undefined || initialFortune[field] === "") {
        throw new Error(`Initial fortune from ${providerUsed} is missing or has an invalid value for the required field: ${field}.`);
      }
    }
    if (!initialFortune.insight1?.challenge || !initialFortune.insight1?.insight) {
      throw new Error(`Initial fortune from ${providerUsed} is missing required fields in insight1.`);
    }
    if (!initialFortune.insight2?.challenge || !initialFortune.insight2?.insight) {
      throw new Error(`Initial fortune from ${providerUsed} is missing required fields in insight2.`);
    }

    // Sanitize and validate content
    if (initialFortune.openingStatement.length > 100) {
      console.warn("Opening statement exceeds character limit, truncating...");
      initialFortune.openingStatement = initialFortune.openingStatement.substring(0, 97) + "...";
    }

    const placeholderPatterns = [
      /Your Company/gi,
      /Valued User/gi,
      /\[Local Landmark\]/gi,
      /\[Specific District Name\]/gi,
      /\[.*?\]/gi
    ];
    if (!isGenericLocation) {
      placeholderPatterns.push(/Your Region/gi);
    }
    let hasPlaceholders = false;
    placeholderPatterns.forEach(pattern => {
      if (pattern.test(initialFortune.openingStatement) ||
          pattern.test(initialFortune.insight1.insight) ||
          pattern.test(initialFortune.insight2.insight)) {
        hasPlaceholders = true;
      }
    });
    if (hasPlaceholders) {
      throw new Error("AI generated generic content instead of personalized insights. Please try again.");
    }

    if (initialFortune.insight1.insight.length > 300) {
      console.warn("Insight 1 exceeds character limit, truncating...");
      initialFortune.insight1.insight = initialFortune.insight1.insight.substring(0, 297) + "...";
    }
    if (initialFortune.insight2.insight.length > 300) {
      console.warn("Insight 2 exceeds character limit, truncating...");
      initialFortune.insight2.insight = initialFortune.insight2.insight.substring(0, 297) + "...";
    }

    const validatedResponse = FortuneSchema.parse(initialFortune);
    console.log(`Initial fortune successfully generated using: ${providerUsed}`);
    console.log('Final validated response:', JSON.stringify(validatedResponse, null, 2));

    return new Response(JSON.stringify(validatedResponse), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`Error in /api/generate-initial-fortune (Provider path: ${providerUsed || 'initialization'}):`, error.stack);
    let errorMessage = 'Failed to generate initial fortune due to an internal error.';
    let finalErrorDetails = errorDetailsForResponse || error.message || error.toString();

    if (error instanceof z.ZodError) {
      errorMessage = `Response validation failed for ${providerUsed}.`;
      finalErrorDetails = `Validation errors: ${JSON.stringify(error.errors)}`;
    } else if (error.message) {
      const lowerErrorMessage = error.message.toLowerCase();
      if (lowerErrorMessage.includes("schema") || lowerErrorMessage.includes("format") || lowerErrorMessage.includes("json")) {
        errorMessage = `Generation failed (${providerUsed}). The AI's response did not match the expected structure or was not valid JSON.`;
      } else if (lowerErrorMessage.includes("api key") || lowerErrorMessage.includes("authentication")) {
        errorMessage = `Generation failed (${providerUsed}) due to an API key or authentication issue.`;
      } else if (lowerErrorMessage.includes("quota") || lowerErrorMessage.includes("rate limit")) {
        errorMessage = `Generation failed (${providerUsed}) due to API quota or rate limits.`;
      } else if (lowerErrorMessage.includes("safety") || lowerErrorMessage.includes("refused")) {
        errorMessage = `Generation was blocked by ${providerUsed} due to safety settings or content policy.`;
      } else if (lowerErrorMessage.includes("placeholder") || lowerErrorMessage.includes("generic content")) {
        errorMessage = "AI generated generic content instead of personalized insights. Please try again.";
      }
    }

    return new Response(JSON.stringify({ error: errorMessage, details: finalErrorDetails, provider: providerUsed || 'N/A' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 