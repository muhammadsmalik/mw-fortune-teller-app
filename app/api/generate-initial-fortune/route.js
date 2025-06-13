import { z } from 'zod';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-preview-04-17";

// Define the schema for the initial fortune (Google Gemini format) - Removed summaryOfOtherPaths
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
  ],
  propertyOrdering: [
    "openingStatement",
    "insight1",
    "insight2"
  ]
};

// Zod schema for final validation (updated - removed summaryOfOtherPaths)
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

export async function POST(req) {
  try {
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2)); // Debug log
    
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
      linkedinData, // Add LinkedIn data if available
      companyDetails // Add company details if available
    } = requestBody;

    // Validate required fields
    if (!fullName || !companyName || !geographicFocus || !selectedPersona || !selectedQuestions || selectedQuestions.length < 2) {
      console.error('Missing required fields:', { fullName, companyName, geographicFocus, selectedPersona, selectedQuestions });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields', 
        details: 'fullName, companyName, geographicFocus, selectedPersona, and at least 2 selectedQuestions are required' 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const personaContext = {
      Advertiser: advertiserContext,
      Publisher: publisherContext,
      'Platform & Service Provider': platformContext,
    };

    const prompt = `
      You are Kai, a genius-level lead expert from Moving Walls, the world's leading provider of out-of-home (OOH) advertising technology.
      Your task is to create a hyper-personalized, concise, and futuristic strategic vision for this specific user.

      **ACTUAL USER PROFILE (USE THESE EXACT DETAILS):**
      - **Name:** ${fullName}
      - **Company:** ${companyName}
      - **Industry:** ${industryType || 'Not specified'}
      - **Geographic Focus:** ${geographicFocus}
      - **Persona:** ${selectedPersona}
      ${linkedinData ? `- **LinkedIn Context:** ${JSON.stringify(linkedinData)}` : ''}
      ${companyDetails ? `- **Company Details:** ${JSON.stringify(companyDetails)}` : ''}

      **USER'S CHOSEN FUTURE CHALLENGES:**
      1. "${selectedQuestions[0]}"
      2. "${selectedQuestions[1]}"

      **CRITICAL INSTRUCTIONS - READ CAREFULLY:**
      
      1. **ULTRA-CONCISE OPENING:** 
         - Address ${fullName} by name in a powerful, memorable way
         - MAX 100 characters total (about 10-15 words)
         - Reference ${geographicFocus} if possible
         - Make it intriguing and forward-looking
         - Examples: "${fullName}, Singapore's OOH revolution begins now."
         - Or: "${fullName}, your DOOH vision transforms ${geographicFocus}."
      
      2. **BE HYPER-LOCAL & SPECIFIC FOR ${geographicFocus}:**
         - If Singapore: mention Marina Bay, Orchard Road, CBD, Changi
         - If Kuala Lumpur: mention KLCC, Bukit Bintang, Federal Highway, Pavilion KL
         - If Jakarta: mention Sudirman, Thamrin, PIK, Grand Indonesia
         - If Bangkok: mention Sukhumvit, Siam, Silom, CentralWorld
         - If Manila: mention Makati, BGC, EDSA, SM Mall of Asia
         - Research and use REAL places from the specified location
      
      3. **BE CONCISE & READABLE:**
         - Opening statement: MAX 100 characters, ultra punchy
         - Each insight: 2-3 bullet points separated by newlines
         - Each bullet point: MAX 100 characters per line
         - Use specific locations and actionable advice
         - Format: "Deploy AR screens at Marina Bay Sands\nSync with Orchard Road foot traffic data\nLaunch pilot at Changi Airport terminals"
      
      4. **BULLET POINT FORMAT FOR INSIGHTS:**
         - Structure each insight as 2-3 actionable points
         - Each point should reference specific ${geographicFocus} locations
         - Use action verbs: "Deploy", "Launch", "Integrate", "Sync"
         - Make each point build on the previous one
         - Separate points with newline characters (\n)
      
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
      ${personaContext[selectedPersona] || ''}
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
        debugInfo = `Gemini response object received, but text() method or property is missing or returned null/empty. Candidates: ${JSON.stringify(response.candidates, null, 2)}`;
        if (response.promptFeedback) {
          debugInfo += ` Prompt Feedback: ${JSON.stringify(response.promptFeedback, null, 2)}`;
        }
      }
      console.error("Invalid response structure from Gemini API.", debugInfo);
      throw new Error(`Received no valid text response from Gemini API. ${debugInfo}`);
    }

    const responseJsonString = response.text();
    console.log('Gemini raw response:', responseJsonString); // Debug log
    
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseJsonString);
    } catch (jsonError) {
      console.error("Gemini response was not valid JSON:", responseJsonString, jsonError);
      throw new Error("Fortune received from Gemini AI was not in the expected JSON format.");
    }

    // Validate required fields
    const requiredFields = initialFortuneSchema.required;
    for (const field of requiredFields) {
      if (!(field in parsedResponse) || parsedResponse[field] === null || parsedResponse[field] === undefined || parsedResponse[field] === "") {
        console.error(`Missing, null, undefined, or empty required field '${field}' in Gemini AI response:`, parsedResponse);
        throw new Error(`Fortune received from Gemini AI is missing or has an invalid value for the required field: ${field}.`);
      }
    }

    // Additional validation for nested objects
    if (!parsedResponse.insight1?.challenge || !parsedResponse.insight1?.insight) {
      console.error("Missing required fields in insight1:", parsedResponse.insight1);
      throw new Error("Fortune received from Gemini AI is missing required fields in insight1.");
    }
    
    if (!parsedResponse.insight2?.challenge || !parsedResponse.insight2?.insight) {
      console.error("Missing required fields in insight2:", parsedResponse.insight2);
      throw new Error("Fortune received from Gemini AI is missing required fields in insight2.");
    }

    // Validate character limits and check for placeholder text
    if (parsedResponse.openingStatement.length > 100) {
      console.warn("Opening statement exceeds character limit, truncating...");
      parsedResponse.openingStatement = parsedResponse.openingStatement.substring(0, 97) + "...";
    }
    
    // Check for placeholder text that shouldn't be there
    const placeholderPatterns = [
      /Your Company/gi,
      /Your Region/gi,
      /Valued User/gi,
      /\[Local Landmark\]/gi,
      /\[Specific District Name\]/gi,
      /\[.*?\]/gi // Any text in square brackets
    ];
    
    let hasPlaceholders = false;
    placeholderPatterns.forEach(pattern => {
      if (pattern.test(parsedResponse.openingStatement) || 
          pattern.test(parsedResponse.insight1.insight) || 
          pattern.test(parsedResponse.insight2.insight)) {
        hasPlaceholders = true;
      }
    });
    
    if (hasPlaceholders) {
      console.error("Generated response contains placeholder text:", parsedResponse);
      throw new Error("AI generated generic content instead of personalized insights. Please try again.");
    }
    
    if (parsedResponse.insight1.insight.length > 300) {
      console.warn("Insight 1 exceeds character limit, truncating...");
      parsedResponse.insight1.insight = parsedResponse.insight1.insight.substring(0, 297) + "...";
    }
    
    if (parsedResponse.insight2.insight.length > 300) {
      console.warn("Insight 2 exceeds character limit, truncating...");
      parsedResponse.insight2.insight = parsedResponse.insight2.insight.substring(0, 297) + "...";
    }

    // Validate with Zod for additional type safety
    const validatedResponse = FortuneSchema.parse(parsedResponse);
    
    console.log('Final validated response:', JSON.stringify(validatedResponse, null, 2)); // Debug log
    
    return new Response(JSON.stringify(validatedResponse), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error generating initial fortune:', error);
    let errorMessage = 'Failed to generate initial fortune due to an internal error.';
    let finalErrorDetails = error.message || error.toString();
    
    if (error instanceof z.ZodError) {
      errorMessage = 'Response validation failed.';
      console.error('Zod validation errors:', error.errors);
      finalErrorDetails = `Validation errors: ${JSON.stringify(error.errors)}`;
    } else if (error.message) {
      const lowerErrorMessage = error.message.toLowerCase();
      if (lowerErrorMessage.includes("schema") || lowerErrorMessage.includes("format") || lowerErrorMessage.includes("json")) {
        errorMessage = "Initial fortune generation failed. The AI's response did not match the expected structure or was not valid JSON.";
      } else if (lowerErrorMessage.includes("api key") || lowerErrorMessage.includes("authentication")) {
        errorMessage = "Initial fortune generation failed due to an API key or authentication issue. Please check server configuration.";
      } else if (lowerErrorMessage.includes("quota") || lowerErrorMessage.includes("rate limit")) {
        errorMessage = "Initial fortune generation failed due to API quota or rate limits. Please check your quota or try again later.";
      } else if (lowerErrorMessage.includes("safety") || lowerErrorMessage.includes("refused")) {
        errorMessage = "Initial fortune generation was blocked or refused due to safety settings or content policy.";
      } else if (lowerErrorMessage.includes("placeholder")) {
        errorMessage = "AI generated generic content instead of personalized insights. Please try again.";
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage, details: finalErrorDetails }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 