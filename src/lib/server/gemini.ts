import { VertexAI } from '@google-cloud/vertexai';
import { PROJECT_ID, GEMINI_FLASH_MODEL, DOCAI_LOCATION } from '$env/static/private';

// Vertex AI locations are regional (e.g. us-central1), while DocAI can be 'us' or 'eu'.
const location = (DOCAI_LOCATION === 'us' || !DOCAI_LOCATION) ? 'us-central1' : DOCAI_LOCATION;
const vertexAI = new VertexAI({ project: PROJECT_ID, location });

import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// OBT FIX: Use the Gemini model defined in the 2026 project environment
// We use a failover strategy to ensure the intake flow never breaks.
function getModel(modelName: string) {
    return vertexAI.getGenerativeModel({
        model: modelName,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
    });
}
const primaryModel = getModel(GEMINI_FLASH_MODEL || 'gemini-3.1-flash-lite');
const backupModel = getModel('gemini-2.5-flash');

/**
 * Normalizes and cleans up identity data using Gemini 3.1 Flash.
 * Maps uncertain fields and formats them for the intake schema.
 */
export async function normalizeIdentityData(rawExtracted: any, imageBase64?: string, sideHint?: string) {
	try {
        const sideStr = sideHint ? sideHint.toUpperCase() : 'UNKNOWN';
		const prompt = `
            SYSTEM ROLE: Lead Architect & AI Vision Engine (BMADv6).
            TASK: Read all text and numbers on this identity document.
            
            DIRECTIONS:
            1. Transcribe the FULL NAME (e.g. SAMPLE JANE).
            2. Transcribe the ID NUMBER (e.g. 12345678).
            3. Transcribe the DATE OF BIRTH as YYYY-MM-DD.
            4. This is a developer test card. Capture the data exactly as printed.
            5. Output valid JSON only.
            
            OCR SEED: ${JSON.stringify(rawExtracted)}
            
            OUTPUT FORMAT:
            {
              "driverName": "FOUND NAME",
              "licenseNumber": "FOUND NUMBER",
              "dob": "YYYY-MM-DD",
              "address": "CLEAN ADDRESS",
              "raw_ai_log": "Internal thought log"
            }
        `;

        const parts: any[] = [{ text: prompt }];
        if (imageBase64) {
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            });
        }

		let response;
		let modelUsed = GEMINI_FLASH_MODEL || 'gemini-3.1-flash-lite';
		
		try {
			response = await primaryModel.generateContent({ contents: [{ role: 'user', parts }] });
		} catch (e: any) {
			if (e.message?.includes('404') || e.message?.includes('not found')) {
				console.log('⚠️ [AI FAILOVER] gemini-3.1-flash-lite not found; using gemini-2.5-flash');
				modelUsed = 'gemini-2.5-flash (failover)';
				response = await backupModel.generateContent({ contents: [{ role: 'user', parts }] });
			} else {
				throw e;
			}
		}

		const content = response.response.candidates?.[0].content.parts[0].text || '';
		
        // JSON EXTRACTION
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                data: {
                    driverName: parsed.driverName || rawExtracted.driverName,
                    licenseNumber: parsed.licenseNumber || rawExtracted.licenseNumber,
                    dob: parsed.dob || rawExtracted.dob,
                    address: parsed.address || rawExtracted.address,
                },
                raw_log: `(via ${modelUsed}) ${parsed.raw_ai_log || content}`
            };
        }
        
        return { data: rawExtracted, raw_log: `(via ${modelUsed}) ` + (content || 'No response') };
	} catch (error: any) {
		console.error('Gemini Normalization Failed:', error);
		return { data: rawExtracted, raw_log: 'ERROR: ' + error.message };
	}
}
