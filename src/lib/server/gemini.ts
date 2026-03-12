import { aiService } from './services/ai.service';

/**
 * 🚀 BACKWARD COMPATIBILITY LAYER
 * Routes to the new AIService (BMADv6)
 */
export async function normalizeIdentityData(rawExtracted: any, imageBase64?: string, sideHint?: string) {
    return await aiService.extractIdentity(rawExtracted, imageBase64, sideHint);
}
