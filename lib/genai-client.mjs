/**
 * Shared Google GenAI client for the app's grounded LLM paths — match reasons
 * (lib/match-reasons.mjs) and the business scorer (lib/business-scores.mjs).
 *
 * Prefers Vertex AI when GCP service-account creds are configured — far higher
 * quota than the AI Studio free tier (15 rpm) — and falls back to an AI Studio
 * API key otherwise. The client is cached for the life of the process, so it is
 * built once and reused across warm serverless invocations and both callers.
 */
import { GoogleGenAI } from '@google/genai';

let _ai;
export function genaiClient() {
  if (_ai) return _ai;
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (saJson && project) {
    let credentials;
    try { credentials = JSON.parse(saJson); }
    catch { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON'); }
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
    _ai = new GoogleGenAI({ vertexai: true, project, location, googleAuthOptions: { credentials } });
    return _ai;
  }
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Set GCP_PROJECT_ID + GOOGLE_SERVICE_ACCOUNT_JSON (Vertex) or an API key (GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY).');
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}
