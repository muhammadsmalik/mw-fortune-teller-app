import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
// PassThrough is not strictly needed if we directly return OpenAI's response body stream.
// import { PassThrough } from 'stream';

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Voice instructions for the "ballad" TTS voice to create a mystical, genie-like character
 * These instructions guide the OpenAI TTS model to generate audio with specific tonal qualities
 */
const BALLAD_TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone.`;

/**
 * Main handler function for both GET and POST requests to generate TTS audio
 * Supports streaming audio generation using OpenAI's TTS API
 * 
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} - Streaming audio response or error response
 */
async function handler(request) {
  console.log(`[API /generate-narration] Received ${request.method} request`);
  
  // Initialize request parameters with defaults
  let textInput = '';
  let voice = 'ballad'; // Default to mystical genie voice
  let instructions = '';

  try {
    // Parse request based on HTTP method
    if (request.method === 'POST') {
      // POST requests include parameters in request body (JSON)
      const body = await request.json();
      textInput = body.textInput;
      voice = body.voice || voice;
      instructions = body.instructions; // Custom instructions can be provided
      console.log('[API /generate-narration] Parsed POST request body:', { 
        textInputLength: textInput?.length, 
        voice, 
        instructionsLength: instructions?.length 
      });
    } else if (request.method === 'GET') {
      // GET requests include parameters in URL query string
      const { searchParams } = new URL(request.url);
      textInput = searchParams.get('textInput');
      voice = searchParams.get('voice') || voice;
      console.log('[API /generate-narration] Parsed GET request query params:', { 
        textInputLength: textInput?.length, 
        voice 
      });
      
      // For GET requests, apply server-side voice instructions based on voice type
      if (voice === 'ballad') {
        instructions = BALLAD_TTS_INSTRUCTIONS;
      }
      // Additional voice types can be added here in the future
    }

    // Validate required input
    if (!textInput) {
      console.error('[API /generate-narration] Error: Missing textInput');
      return NextResponse.json({ error: "Missing textInput" }, { status: 400 });
    }

    // Validate OpenAI API key configuration
    if (!process.env.OPENAI_API_KEY) {
      console.error('[API /generate-narration] Error: OpenAI API key not configured.');
      return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    console.log(`[API /generate-narration] Calling OpenAI API with model gpt-4o-mini-tts, voice ${voice}.`);
    
    /**
     * Create TTS request using OpenAI's audio.speech.create API
     * - model: Use the latest TTS model with custom voice support
     * - voice: Voice type (ballad for mystical character)
     * - input: The text to convert to speech
     * - instructions: Voice character instructions for custom voices
     * - response_format: MP3 for wide browser compatibility
     */
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice,
      input: textInput,
      instructions: instructions, // Empty for standard voices, custom for ballad
      response_format: "mp3",
    });

    console.log('[API /generate-narration] OpenAI TTS API response received successfully');
    
    /**
     * Validate response body exists
     * The OpenAI client returns a response object with a .body ReadableStream
     * Unlike fetch responses, this doesn't have .ok or .status properties
     */
    if (!response.body) {
      console.error('[API /generate-narration] No response body received from OpenAI');
      return NextResponse.json({ error: "No audio data received from OpenAI" }, { status: 500 });
    }

    console.log('[API /generate-narration] Streaming audio response back to client.');
    
    /**
     * Stream the audio data back to the client with proper headers
     * - Content-Type: audio/mpeg for MP3 format
     * - Cache-Control: no-cache to ensure fresh audio generation
     * - Content-Disposition: inline for browser audio playback
     */
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Content-Disposition': 'inline; filename="narration.mp3"',
      },
    });

  } catch (error) {
    console.error('[API /generate-narration] Error occurred:', error);
    
    /**
     * Handle specific OpenAI API errors with appropriate HTTP status codes
     * This provides better error messaging for different failure scenarios
     */
    if (error.code === 'insufficient_quota') {
      return NextResponse.json({ 
        error: "OpenAI API quota exceeded", 
        details: "The API quota has been exceeded. Please check your OpenAI account." 
      }, { status: 429 });
    }
    
    if (error.code === 'invalid_api_key') {
      return NextResponse.json({ 
        error: "Invalid OpenAI API key", 
        details: "The API key is invalid or not configured properly." 
      }, { status: 401 });
    }
    
    if (error.code === 'model_not_found') {
      return NextResponse.json({ 
        error: "TTS model not available", 
        details: "The requested TTS model is not available." 
      }, { status: 400 });
    }
    
    // Generic error handling for unexpected errors
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
}

// Export handler for both GET and POST HTTP methods
export { handler as GET, handler as POST };

/**
 * OPTIONS handler for CORS preflight requests
 * Allows cross-origin requests from the frontend during development
 */
export async function OPTIONS() {
  console.log('[API /generate-narration] Received OPTIONS request');
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production security
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 