import { 
    GCP_PROJECT_ID, 
    GCP_LOCATION, 
    DOCAI_LOCATION, 
    DOCAI_PROCESSOR_ID, 
    GOOGLE_APPLICATION_CREDENTIALS,
    GEMINI_PRO_MODEL,
    GEMINI_FLASH_MODEL,
    GEMINI_FLASH_LITE_MODEL,
    DATABASE_URL,
    ENCRYPTION_KEY,
    AOV_TARGET,
    GROWTH_GOAL_PERCENT,
    MOBILE_BASE_RADIUS_MILES,
    SURCHARGE_PER_MILE,
    SQUARE_ENVIRONMENT
} from '$env/static/private';
import { env } from '$env/dynamic/private';

/**
 * 🚀 CONSOLIDATED APPLICATION CONFIGURATION (BMADv6)
 * Single source of truth for all environment variables.
 * Standardized, centralized, and robust to prevent logic fractures.
 */

// 1. Core Operating Environment
export const APP_CONFIG = {
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    DATABASE_URL: DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/revenue_engine',
    ENCRYPTION_KEY: ENCRYPTION_KEY || env.ENCRYPTION_KEY,
    SQUARE_ENV: SQUARE_ENVIRONMENT || 'sandbox'
};

// 2. Google Cloud Platform Identity (Bridging Static Env to process.env for ADC)
export const GCP_CONFIG = {
    PROJECT_ID: GCP_PROJECT_ID || '351328298118',
    LOCATION: (GCP_LOCATION || 'global').trim(), 
    KEY_PATH: GOOGLE_APPLICATION_CREDENTIALS,
};

// CRITICAL BRIDGE: Google SDKs (ADC) often require this variable in process.env
if (GCP_CONFIG.KEY_PATH && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GCP_CONFIG.KEY_PATH;
}

// 3. Document AI (Intake Specialist)
export const DOCAI_CONFIG = {
    PROJECT_ID: GCP_CONFIG.PROJECT_ID,
    LOCATION: DOCAI_LOCATION || 'us', 
    PROCESSOR_ID: DOCAI_PROCESSOR_ID || '99902dfde23907ec',
};

// 4. Generative AI (Adaptive Thinking Foundation)
export const GEMINI_CONFIG = {
    LOCATION: GCP_CONFIG.LOCATION, 
    MODELS: {
        PRO: GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview',
        FLASH: GEMINI_FLASH_MODEL || 'gemini-3.1-flash-lite-preview',
        LITE: GEMINI_FLASH_LITE_MODEL || 'gemini-3-flash-preview',
    }
};

// 5. Shared Business Logic Metrics (BMADv6)
export const BUSINESS_CONFIG = {
    AOV_TARGET: Number(AOV_TARGET || 125),
    GROWTH_GOAL: Number(GROWTH_GOAL_PERCENT || 20),
    BASE_RADIUS: Number(MOBILE_BASE_RADIUS_MILES || 20),
    MILE_SURCHARGE: Number(SURCHARGE_PER_MILE || 2.50)
};

/**
 * Global Validation Suite
 * SURFACE ERRORS IMMEDIATELY TO PREVENT SILENT FRACTURES.
 */
export function validateConfig() {
    const missing = [];
    if (!GCP_CONFIG.PROJECT_ID) missing.push('GCP_PROJECT_ID');
    if (!GCP_CONFIG.KEY_PATH) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
    if (!DOCAI_CONFIG.PROCESSOR_ID) missing.push('DOCAI_PROCESSOR_ID');
    if (!APP_CONFIG.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
    
    if (missing.length > 0) {
        console.warn(`⚠️ [CONFIG WARNING] Unconfigured Keys: ${missing.join(', ')}`);
        // We only throw in production to prevent deployment of broken images
        if (APP_CONFIG.IS_PRODUCTION) {
             throw new Error(`❌ [CRITICAL CONFIG ERROR] Missing production variables: ${missing.join(', ')}`);
        }
    }
}
