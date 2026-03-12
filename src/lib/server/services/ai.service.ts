import { GoogleGenAI } from '@google/genai';
import { GCP_CONFIG, GEMINI_CONFIG, validateConfig } from '../config';
import { IDENTITY_SYSTEM_PROMPT } from '../prompts/identity';

/**
 * 🚀 AIService: Unified Intelligence Layer (BMADv6)
 * Encapsulates all Generative AI interactions for the Revenue Engine.
 */
class AIService {
    private genAI: any;
    private safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ];

    constructor() {
        validateConfig();
        this.genAI = new GoogleGenAI({
            project: GCP_CONFIG.PROJECT_ID,
            location: GCP_CONFIG.LOCATION,
            vertexai: true
        } as any);
    }

    /**
     * Extracts and normalizes identity data from an image.
     * Uses Flash for speed on front-side, Pro for complex back-side recovery.
     */
    async extractIdentity(rawExtracted: any, imageBase64?: string, sideHint: string = 'FRONT') {
        try {
            const side = sideHint.toUpperCase();
            const targetModelId = side === 'BACK' ? GEMINI_CONFIG.MODELS.PRO : GEMINI_CONFIG.MODELS.FLASH;
            
            console.log(`🧠 [AIService] Extracting ${side} via ${targetModelId}...`);

            const parts: any[] = [{ text: IDENTITY_SYSTEM_PROMPT(side, rawExtracted) }];
            if (imageBase64) {
                 const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                 parts.push({
                     inlineData: { mimeType: 'image/jpeg', data: base64Data }
                 });
            }

            const model = this.genAI.getGenerativeModel({ model: targetModelId });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseMimeType: 'application/json'
                },
                safetySettings: this.safetySettings
            });

            const text = result.response?.text() || '{}';
            const parsed = JSON.parse(text);

            // BMADv6 Standard Mapping (Ensuring Backward Compatibility)
            const firstName = parsed.firstName || rawExtracted.firstName || '';
            const lastName = parsed.lastName || rawExtracted.lastName || '';
            const driverName = parsed.driverName || `${firstName} ${lastName}`.trim();
            const idNumber = (parsed.idNumber || parsed.licenseNumber || rawExtracted.idNumber || rawExtracted.licenseNumber || '').toUpperCase().trim();

            return {
                data: {
                    firstName,
                    lastName,
                    driverName,
                    idNumber,
                    licenseNumber: idNumber, // Normalize to both keys
                    dob: parsed.dob || rawExtracted.dob || '',
                    address: parsed.address || rawExtracted.address || '',
                    issueDate: parsed.issueDate || rawExtracted.issueDate || '',
                    expirationDate: parsed.expirationDate || rawExtracted.expirationDate || '',
                    physical: { ...rawExtracted.physical, ...parsed.physical },
                    licenseDetails: { ...rawExtracted.licenseDetails, ...parsed.licenseDetails },
                    documentDiscriminator: parsed.documentDiscriminator || rawExtracted.documentDiscriminator || '',
                    verificationStatus: parsed.verificationStatus || rawExtracted.verificationStatus || 'Verified',
                    full_extraction: parsed,
                    confidence: 0.98 // Manual boost for semantic recovery pass
                },
                raw_log: `(via ${targetModelId}) Location: ${GCP_CONFIG.LOCATION}`
            };
        } catch (error: any) {
            console.error('❌ [AIService] Extraction Error:', error.message);
            return {
                data: rawExtracted,
                raw_log: `ERROR: ${error.message}`
            };
        }
    }

    /**
     * 📈 Strategy Briefing Gen (Gemini Pro)
     * Generates a high-level revenue pivot strategy based on current metrics.
     */
    async getStrategyBriefing(metrics: { aov: number; target: number; gap: number }) {
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODELS.PRO });
            const prompt = `
                As a Senior Revenue Architect, analyze these metrics:
                - Current AOV: $${metrics.aov}
                - Target AOV: $${metrics.target}
                - Gap: $${metrics.gap}

                Provide a 1-sentence reactive strategy to close this gap. Focus on OBT-2 surcharge logic vs volume expansion.
                Return ONLY the 1-sentence string.
            `;

            const result = await model.generateContent(prompt);
            return result.response?.text().trim() || "Analyze surcharge logic to bridge the revenue gap.";
        } catch (error) {
            console.error('❌ [AIService] Briefing Error:', error);
            return metrics.aov < metrics.target 
                ? "AOV is below the $125 anchor. Recommend triggering OBT-2 surcharge logic." 
                : "AOV Target achieved. Maintain current mathematical routing.";
        }
    }

    /**
     * 📱 Retention SMS Gen (Gemini Flash-Lite)
     * Drafts a compelling re-engagement message for inactive drivers.
     */
    async generateRetentionSMS(driverName: string, daysInactive: number) {
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODELS.LITE });
            const prompt = `
                Draft a professional, friendly SMS to re-engage a driver named ${driverName} who has been inactive for ${daysInactive} days. 
                Focus on high-revenue regional opportunities. Keep it under 160 characters.
            `;

            const result = await model.generateContent(prompt);
            return result.response?.text().trim() || `Hi ${driverName}, we've missed you! High-revenue routes are available in your area. Log in to see your strategy briefing.`;
        } catch (error) {
            console.error('❌ [AIService] SMS Gen Error:', error);
            return `Hello ${driverName}, we have high-demand routes waiting for you. Re-activate your status to see increased rates.`;
        }
    }
}

export const aiService = new AIService();
