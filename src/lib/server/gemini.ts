import { GoogleGenAI } from '@google/genai';
import { GCP_CONFIG, GEMINI_CONFIG, validateConfig } from './config';

// 🚀 REVENUE ENGINE 2026 STACK: Standardized Foundation
// Using Consolidated Configuration (config.ts) to prevent logic fractures.

validateConfig();

console.log(`📡 [AI CLIENT] Initializing Foundation: Project=${GCP_CONFIG.PROJECT_ID} | Location=${GCP_CONFIG.LOCATION}`);

/**
 * Enterprise AI Client (Unified SDK)
 * Using Vertex AI mode with centralized location routing.
 */
const genAI = new GoogleGenAI({
    project: GCP_CONFIG.PROJECT_ID,
    location: GCP_CONFIG.LOCATION,
    vertexai: true
} as any);

const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

/**
 * Normalizes identity extraction data using the Gemini 3.1 series.
 * Tier-2 Semantic Recovery Phase.
 */
export async function normalizeIdentityData(rawExtracted: any, imageBase64?: string, sideHint?: string) {
    try {
        const sideStr = sideHint ? sideHint.toUpperCase() : 'FRONT';
        console.log(`🧠 [NORMALIZATION] Starting 3.1 Pass for ${sideStr} via ${GCP_CONFIG.LOCATION}...`);

        const systemPrompt = `
            SYSTEM ROLE: Lead Architect & AI Vision Engine (BMADv6).
            TASK: Read and extract EVERY single data point visible on this identity document (${sideStr}).
            
            DIRECTIONS:
            1. Transcribe ALL fields: Names, ID Number, Address (Full), Dates (DOB, Issue, Expiration), Sex, Height, Eyes, Class, Restrictions, and Endorsements.
            2. Extract any "Document Discriminator" or DD numbers.
            3. Output ONLY valid JSON.
            
            OCR SEED: ${JSON.stringify(rawExtracted)}
            
            REQUIRED JSON SCHEMA:
            {
              "firstName": "string",
              "lastName": "string",
              "idNumber": "string",
              "dob": "YYYY-MM-DD",
              "address": "full address string",
              "issueDate": "YYYY-MM-DD",
              "expirationDate": "YYYY-MM-DD",
              "physical": {
                "sex": "string",
                "height": "string",
                "eyes": "string"
              },
              "licenseDetails": {
                "class": "string",
                "restrictions": "string",
                "endorsements": "string"
              },
              "documentDiscriminator": "string",
              "extracted_all": {} 
            }
        `;

        const parts: any[] = [{ text: systemPrompt }];
        if (imageBase64) {
             const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
             parts.push({
                 inlineData: { mimeType: 'image/jpeg', data: base64Data }
             });
        }

        // Selection based on complexity: Pro for recovery, Flash for efficiency
        const targetModelId = sideStr === 'BACK' ? GEMINI_CONFIG.MODELS.PRO : GEMINI_CONFIG.MODELS.FLASH;
        
        console.log(`🚀 [AI CALL] Targeting Model: ${targetModelId}`);

        // Unified SDK Call Pattern (Alpha/Beta v1.44+)
        const result = await genAI.models.generateContent({
            model: targetModelId,
            contents: [{ role: 'user', parts }],
            config: {
                safetySettings: SAFETY_SETTINGS as any,
                responseMimeType: 'application/json'
            }
        });

        // VERIFIED PATH: result.candidates[0].content.parts[0].text
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);
        
        console.log(`✅ [PHASE 3: RESULT] (${sideStr}) Comprehensive Normalize complete via ${targetModelId}`);

        return {
            data: {
                // Backward compatibility mapping
                firstName: parsed.firstName || rawExtracted.firstName || '',
                lastName: parsed.lastName || rawExtracted.lastName || '',
                idNumber: (parsed.idNumber || rawExtracted.idNumber || '').toUpperCase().trim(),
                dob: parsed.dob || rawExtracted.dob || '',
                // New comprehensive fields
                address: parsed.address || '',
                issueDate: parsed.issueDate || '',
                expirationDate: parsed.expirationDate || '',
                physical: parsed.physical || {},
                licenseDetails: parsed.licenseDetails || {},
                documentDiscriminator: parsed.documentDiscriminator || '',
                full_extraction: parsed // Everything the AI extracted
            },
            raw_log: `(via ${targetModelId}) Location: ${GCP_CONFIG.LOCATION}`
        };

    } catch (error: any) {
        console.error('❌ [GEMINI 3.1 CRITICAL ERROR]:', error.message);
        return { 
            data: rawExtracted, 
            raw_log: 'ERROR: AI foundation returned 404 or connectivity fault.' 
        };
    }
}
