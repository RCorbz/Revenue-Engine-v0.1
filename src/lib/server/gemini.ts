import { GoogleGenAI } from '@google/genai';
import { GCP_PROJECT_ID, GEMINI_FLASH_MODEL, GCP_LOCATION, GEMINI_FLASH_LITE_MODEL, GOOGLE_APPLICATION_CREDENTIALS } from '$env/static/private';

// 🚀 REVENUE ENGINE 2026 STACK
// Standardizing on @google/genai (v1.44.0+) for Enterprise Vertex AI
// 🚨 NOTE: Numerical Project ID (351328298118) is the most stable for preview resolution.

// 🛡️ CRITICAL: Explicitly set ADC for local development path resolution
if (GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;
}

const gcp_location = (GCP_LOCATION || 'us-central1').replace('cenntral1', 'central1');

console.log(`📡 [AI CLIENT] Initializing Foundation: Project=${GCP_PROJECT_ID} | Region=${gcp_location}`);

/**
 * Enterprise AI Client
 * Targets v1beta1 endpoints for Gemini 3.1 Adaptive Thinking connectivity.
 */
const client = new GoogleGenAI({
    project: GCP_PROJECT_ID,
    location: gcp_location,
    vertexai: true,
    apiVersion: 'v1beta1'
} as any);

const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

// 🚀 REVENUE ENGINE 2026 STACK: Robust Model Mapping
const PRIMARY_MODEL = GEMINI_FLASH_MODEL || 'gemini-1.5-flash-002';
const BACKUP_MODEL = GEMINI_FLASH_LITE_MODEL || 'gemini-1.5-flash-8b';
const STABLE_MODEL = 'gemini-1.5-flash';

const GARDEN_URL = 'https://console.cloud.google.com/vertex-ai/model-garden';

/**
 * Normalizes identity extraction data using the Adaptive Thinking engine.
 * Fallback mechanism for low-confidence DocAI triage.
 */
export async function normalizeIdentityData(rawExtracted: any, imageBase64?: string, sideHint?: string) {
    try {
        const sideStr = sideHint ? sideHint.toUpperCase() : 'FRONT';
        console.log(`🧠 [NORMALIZATION] Starting Pass for Side: ${sideStr}`);

        const prompt = `
            SYSTEM ROLE: Lead Architect & AI Vision Engine (BMADv6).
            TASK: Read all text and numbers on this identity document (${sideStr}).
            
            DIRECTIONS:
            1. Transcribe the FIRST NAME and LAST NAME.
            2. Transcribe the ID NUMBER (e.g. S8901234).
            3. Transcribe the DATE OF BIRTH as YYYY-MM-DD.
            4. Output valid JSON only.
            
            OCR SEED: ${JSON.stringify(rawExtracted)}
            
            OUTPUT FORMAT:
            {
              "firstName": "GIVEN",
              "lastName": "FAMILY",
              "idNumber": "ID_VAL",
              "dob": "YYYY-MM-DD",
              "raw_ai_log": "Internal thought log"
            }
        `;

        const parts: any[] = [{ text: prompt }];
        if (imageBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            });
        }

        let result;
        let modelUsed = PRIMARY_MODEL;

        try {
            // Attempt 1: Primary
            result = await client.models.generateContent({
                model: modelUsed,
                contents: [{ role: 'user', parts }],
                config: { safetySettings: SAFETY_SETTINGS as any, responseMimeType: 'application/json' }
            });
        } catch (e: any) {
            console.warn(`⚠️ [AI FALLBACK] Primary model failed: ${e.message}`);
            if (e.message?.includes('404') || e.message?.includes('not found')) {
                console.warn(`🔄 [AI FALLBACK] Dropping to Backup (${BACKUP_MODEL})...`);
                modelUsed = BACKUP_MODEL;
                try {
                    result = await client.models.generateContent({
                        model: modelUsed,
                        contents: [{ role: 'user', parts }],
                        config: { safetySettings: SAFETY_SETTINGS as any, responseMimeType: 'application/json' }
                    });
                } catch (e2: any) {
                    console.warn(`🔄 [AI FALLBACK] Backup failed. Using Stable (${STABLE_MODEL})...`);
                    modelUsed = STABLE_MODEL;
                    result = await client.models.generateContent({
                        model: modelUsed,
                        contents: [{ role: 'user', parts }],
                        config: { safetySettings: SAFETY_SETTINGS as any, responseMimeType: 'application/json' }
                    });
                }
            } else {
                throw e;
            }
        }

        const response = await result.response;
        const content = response.text() || '{}';
        
        const parsed = JSON.parse(content);
        console.log(`✅ [PHASE 3: RESULT] (${sideStr}) Normalize complete via ${modelUsed}`);
        
        return {
            data: {
                firstName: parsed.firstName || rawExtracted.firstName,
                lastName: parsed.lastName || rawExtracted.lastName,
                idNumber: parsed.idNumber || rawExtracted.idNumber,
                dob: parsed.dob || rawExtracted.dob
            },
            raw_log: `(via ${modelUsed}) ${parsed.raw_ai_log || 'Success'}`
        };

    } catch (error: any) {
        let msg = error.message;
        if (msg.includes('404') || msg.includes('not found')) {
            msg = `API_NOT_READY: 1. Enable 'Vertex AI API' in GCP Console. 2. Enable models at ${GARDEN_URL}`;
        }
        console.error('❌ [AI ERROR] Normalization failed:', msg);
        return { data: rawExtracted, raw_log: 'ERROR: ' + msg };
    }
}
