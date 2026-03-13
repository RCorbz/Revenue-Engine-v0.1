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
        console.log(`⚡ [AIService] Initializing Vertex AI: ${GCP_CONFIG.PROJECT_ID} in ${GCP_CONFIG.LOCATION}`);
        this.genAI = new GoogleGenAI({
            project: GCP_CONFIG.PROJECT_ID,
            location: GCP_CONFIG.LOCATION,
            vertexai: true,
            apiVersion: 'v1beta1'
        } as any);
    }

    /**
     * Extracts and normalizes identity data from an image.
     * Uses Flash for speed on front-side, Pro for complex back-side recovery.
     */
    async extractIdentity(rawExtracted: any, imageBase64?: string, sideHint: string = 'FRONT', forcePro: boolean = false) {
        try {
            const side = sideHint.toUpperCase();
            let targetModelId = side === 'BACK' ? GEMINI_CONFIG.MODELS.PRO : (forcePro ? GEMINI_CONFIG.MODELS.PRO : GEMINI_CONFIG.MODELS.FLASH);
            
            console.log(`🧠 [AIService] Extracting ${side} via ${targetModelId}... [ForcePro: ${forcePro}]`);

            const parts: any[] = [{ text: IDENTITY_SYSTEM_PROMPT(side, rawExtracted) }];
            if (imageBase64) {
                 const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                 console.log(`📏 [AIService] Payload Part Size: ${base64Data.length} chars (~${Math.round(base64Data.length * 3/4 / 1024)}KB)`);
                 parts.push({
                     inlineData: { mimeType: 'image/jpeg', data: base64Data }
                 });
            }

            console.log(`⏳ [AIService] Awaiting response from ${targetModelId}...`);
            const start = performance.now();
            
            // Heartbeat interval to signal it's not stalled
            const heartbeat = setInterval(() => {
                const elapsed = Math.round((performance.now() - start) / 1000);
                console.log(`💓 [HEARTBEAT] AIService waiting for ${targetModelId}... (${elapsed}s elapsed)`);
            }, 3000);

            let result;
            try {
                result = await this.genAI.models.generateContent({
                    model: targetModelId,
                    contents: [{ role: 'user', parts }],
                    config: {
                        responseMimeType: 'application/json',
                        safetySettings: this.safetySettings,
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 800,
                            topP: 0.8
                        }
                    }
                });
            } finally {
                clearInterval(heartbeat);
            }
            const duration = Math.round(performance.now() - start);

            let text = '{}';
            const candidate = result.candidates?.[0];
            
            if (candidate?.content?.parts?.[0]?.text) {
                text = candidate.content.parts[0].text;
            }

            console.log(`💎 [AIService] Response received in ${duration}ms.`);
            
            if (text === '{}' || text === '') {
                console.warn('⚠️ [AIService] Unexpected Empty Response. Diagnostics:');
                console.warn(`  - Finish Reason: ${candidate?.finishReason}`);
                console.warn(`  - Safety Ratings: ${JSON.stringify(candidate?.safetyRatings)}`);
                console.warn(`  - Full Candidate: ${JSON.stringify(candidate)}`);
            } else {
                // Log a snippet for verification
                console.log(`💎 [AIService] Extracted text: ${text.substring(0, 50)}...`);
            }
            
            let parsed: any = {};
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                console.error('❌ [AIService] JSON Parse Error:', e);
            }

            // ESCALATION LOGIC: Only escalate for BACK side (complex) or if FRONT is truly zero-signal.
            const isZeroSignal = Object.keys(parsed).length < 1;
            if (isZeroSignal && side === 'FRONT' && targetModelId !== GEMINI_CONFIG.MODELS.PRO && !forcePro) {
                console.log(`⚠️ [AIService] 3.1 Signal empty. Escalating to 3.1 PRO Deep Think...`);
                return this.extractIdentity(rawExtracted, imageBase64, sideHint, true); 
            }

            // BMADv6 Standard Mapping (Ensuring Backward Compatibility)
            const firstName = parsed.firstName || rawExtracted.firstName || '';
            const lastName = parsed.lastName || rawExtracted.lastName || '';
            const driverName = parsed.driverName || (firstName || lastName ? `${firstName} ${lastName}`.trim() : rawExtracted.driverName || '');
            const idNumber = (parsed.idNumber || parsed.licenseNumber || rawExtracted.idNumber || rawExtracted.licenseNumber || '').toUpperCase().trim();

            // Calculate confidence base on data density
            const criticalFields = [firstName, lastName, idNumber, parsed.dob];
            const filledCount = criticalFields.filter(f => f && f.length > 0).length;
            const compositeConfidence = filledCount / criticalFields.length;

            return {
                data: {
                    firstName,
                    lastName,
                    driverName,
                    idNumber,
                    licenseNumber: idNumber,
                    dob: parsed.dob || rawExtracted.dob || '',
                    address: parsed.address || rawExtracted.address || '',
                    issueDate: parsed.issueDate || rawExtracted.issueDate || '',
                    expirationDate: parsed.expirationDate || rawExtracted.expirationDate || '',
                    physical: { ...rawExtracted.physical, ...parsed.physical },
                    licenseDetails: { ...rawExtracted.licenseDetails, ...parsed.licenseDetails },
                    documentDiscriminator: parsed.documentDiscriminator || rawExtracted.documentDiscriminator || '',
                    verificationStatus: parsed.verificationStatus || rawExtracted.verificationStatus || 'Verified',
                    full_extraction: parsed,
                    confidence: compositeConfidence > 0 ? compositeConfidence : 0.01 
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
            const prompt = `
                As a Senior Revenue Architect, analyze these metrics:
                - Current AOV: $${metrics.aov}
                - Target AOV: $${metrics.target}
                - Gap: $${metrics.gap}

                Provide a 1-sentence reactive strategy to close this gap. Focus on OBT-2 surcharge logic vs volume expansion.
                Return ONLY the 1-sentence string.
            `;

            const result = await this.genAI.models.generateContent({
                model: GEMINI_CONFIG.MODELS.PRO,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
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
            const prompt = `
                Draft a professional, friendly SMS to re-engage a driver named ${driverName} who has been inactive for ${daysInactive} days. 
                Focus on high-revenue regional opportunities. Keep it under 160 characters.
            `;

            const result = await this.genAI.models.generateContent({
                model: GEMINI_CONFIG.MODELS.LITE,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return result.response?.text().trim() || `Hi ${driverName}, we've missed you! High-revenue routes are available in your area. Log in to see your strategy briefing.`;
        } catch (error) {
            console.error('❌ [AIService] SMS Gen Error:', error);
            return `Hello ${driverName}, we have high-demand routes waiting for you. Re-activate your status to see increased rates.`;
        }
    }
}

export const aiService = new AIService();
