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

            return {
                data: {
                    firstName: parsed.firstName || rawExtracted.firstName || '',
                    lastName: parsed.lastName || rawExtracted.lastName || '',
                    idNumber: (parsed.idNumber || rawExtracted.idNumber || '').toUpperCase().trim(),
                    dob: parsed.dob || rawExtracted.dob || '',
                    address: parsed.address || '',
                    issueDate: parsed.issueDate || '',
                    expirationDate: parsed.expirationDate || '',
                    physical: parsed.physical || {},
                    licenseDetails: parsed.licenseDetails || {},
                    documentDiscriminator: parsed.documentDiscriminator || '',
                    full_extraction: parsed
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
     * Placeholder for future Strategy Briefing (Gemini Pro)
     */
    async getStrategyBriefing(data: any) {
        // Implementation for DASH-6
        console.log('📈 [AIService] Generating Strategy Briefing...');
        return { status: 'pending_implementation' };
    }

    /**
     * Placeholder for Retention SMS Generation (Gemini Flash-Lite)
     */
    async generateRetentionSMS(driverName: string, event: string) {
        // Implementation for DASH-6
        console.log('📱 [AIService] Drafting Retention SMS...');
        return `Hello ${driverName}, this is a reminder for your ${event}.`;
    }
}

export const aiService = new AIService();
