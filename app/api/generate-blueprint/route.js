/**
 * Blueprint Generation API Endpoint
 *
 * Combines all journey data (legacy fortune + persona + selections) into a comprehensive blueprint.
 * This is the final stage of the hybrid fortune journey.
 *
 * Input: User info + legacy fortune + persona + high-level selections + tactical selections
 * Output: HTML blueprint for email + summary + action items
 *
 * Created: 2025-10-01 (Phase 2 of hybrid migration)
 * See: .cursor/DOCUMENTATION/HYBRID_ARCHITECTURE.md
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// LLM Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-preview-04-17";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME || "gpt-4o-2024-08-06";
const LLM_PROVIDER = process.env.LLM_PROVIDER || "GEMINI";

let openAIClient;
if (OPENAI_API_KEY) {
  try {
    openAIClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  } catch (e) {
    console.error("Failed to initialize OpenAI client:", e.message);
  }
}

/**
 * Generate blueprint using OpenAI
 */
async function generateBlueprintWithOpenAI(prompt) {
  if (!openAIClient) {
    throw new Error("OpenAI client not initialized. Check OPENAI_API_KEY.");
  }

  try {
    const completion = await openAIClient.chat.completions.create({
      model: OPENAI_MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are a strategic business consultant creating comprehensive action blueprints. Generate detailed, actionable HTML blueprints based on the user's fortune and selected challenges."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    if (completion.choices[0].finish_reason === "length") {
      console.error("OpenAI response incomplete due to max_tokens limit.");
      throw new Error("Blueprint generation was truncated. Try reducing content.");
    }

    const content = completion.choices[0].message?.content;
    if (!content) {
      throw new Error("OpenAI response did not include content.");
    }

    return content;
  } catch (error) {
    console.error("Error calling OpenAI API for blueprint:", error.message);
    throw new Error(`OpenAI blueprint generation failed: ${error.message}`);
  }
}

/**
 * Generate blueprint using Gemini
 */
async function generateBlueprintWithGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured.");
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3000,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    if (!response || !response.text) {
      throw new Error("Gemini response did not include text content.");
    }

    return response.text();
  } catch (error) {
    console.error("Error calling Gemini API for blueprint:", error.message);
    throw new Error(`Gemini blueprint generation failed: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    const requestBody = await request.json();
    const {
      userInfo,
      legacyFortune,
      persona,
      highLevelSelections,
      tacticalSelections,
      personaContext,
    } = requestBody;

    // Validate required fields
    if (!userInfo || !legacyFortune || !persona) {
      return new Response(JSON.stringify({
        error: "Missing required fields: userInfo, legacyFortune, or persona"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct the prompt for blueprint generation
    const prompt = `
You are creating a comprehensive strategic blueprint for ${userInfo.fullName} from ${userInfo.companyName}.

**USER PROFILE:**
- Name: ${userInfo.fullName}
- Company: ${userInfo.companyName}
- Industry: ${userInfo.industryType || 'Not specified'}
- Geographic Focus: ${userInfo.geographicFocus || 'Not specified'}
- Persona: ${persona.charAt(0).toUpperCase() + persona.slice(1)}

**THEIR FORTUNE (Generated Insights):**
${legacyFortune.openingLine}

📍 Location Insight: ${legacyFortune.locationInsight}
👀 Audience Opportunity: ${legacyFortune.audienceOpportunity}
💥 Engagement Forecast: ${legacyFortune.engagementForecast}
💸 Transactions Prediction: ${legacyFortune.transactionsPrediction}
🔮 AI Oracle's Guidance: ${legacyFortune.aiAdvice}

**SELECTED CHALLENGES:**
${highLevelSelections && highLevelSelections.length > 0 ?
  'High-Level Focus Areas:\n' + highLevelSelections.map((id, i) => `${i + 1}. ${id}`).join('\n') :
  'No high-level challenges specified'}

${tacticalSelections && tacticalSelections.length > 0 ?
  '\nTactical Priorities:\n' + tacticalSelections.map((id, i) => `${i + 1}. ${id}`).join('\n') :
  'No tactical challenges specified'}

**YOUR TASK:**
Create a comprehensive, actionable blueprint in HTML format that:

1. **Executive Summary** (2-3 sentences)
   - Synthesize their fortune into key takeaways
   - Connect to their selected challenges

2. **Strategic Roadmap** (3-5 key initiatives)
   - Based on their fortune insights
   - Address their selected challenges
   - Specific to ${persona}s in ${userInfo.industryType || 'their industry'}
   - Include timeframes (30/60/90 day milestones)

3. **Action Items** (5-7 concrete steps)
   - Immediately actionable
   - Prioritized
   - Measurable outcomes
   - Connected to Moving Walls' OOH solutions

4. **Success Metrics**
   - KPIs to track progress
   - Based on their fortune predictions

5. **Next Steps with Moving Walls**
   - How MW can help implement this blueprint
   - Specific solutions/services relevant to them
   - Clear call-to-action

**OUTPUT FORMAT:**
Generate well-structured HTML (no <html>, <head>, or <body> tags - just content divs).
Use modern, clean styling with inline CSS.
Make it email-friendly and printable.
Use the Moving Walls color scheme: #1B1E2B (dark), #5BADDE (light blue), #FEDA24 (gold).
`;

    let blueprintHtml;

    // Generate blueprint using configured LLM provider
    if (LLM_PROVIDER === "OPENAI") {
      console.log('[generate-blueprint] Using OpenAI for blueprint generation');
      blueprintHtml = await generateBlueprintWithOpenAI(prompt);
    } else {
      console.log('[generate-blueprint] Using Gemini for blueprint generation');
      blueprintHtml = await generateBlueprintWithGemini(prompt);
    }

    // Extract summary and action items from generated HTML (simple parsing)
    const summaryMatch = blueprintHtml.match(/<h2>Executive Summary<\/h2>\s*<p>(.*?)<\/p>/is);
    const blueprintSummary = summaryMatch ? summaryMatch[1].trim() : "Your personalized strategic blueprint awaits.";

    // Simple action item extraction (look for list items)
    const actionItemsMatch = blueprintHtml.match(/<h2>Action Items<\/h2>[\s\S]*?<ol>([\s\S]*?)<\/ol>/i);
    let actionItems = [];
    if (actionItemsMatch) {
      const listItems = actionItemsMatch[1].match(/<li>(.*?)<\/li>/gi);
      if (listItems) {
        actionItems = listItems.map(item => item.replace(/<\/?li>/gi, '').trim());
      }
    }

    return new Response(JSON.stringify({
      blueprintHtml,
      blueprintSummary,
      actionItems,
      generatedAt: new Date().toISOString(),
      meta: {
        persona,
        provider: LLM_PROVIDER,
        userInfo: {
          fullName: userInfo.fullName,
          companyName: userInfo.companyName
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-blueprint] Error:', error.message, error.stack);

    return new Response(JSON.stringify({
      error: "Failed to generate blueprint",
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
