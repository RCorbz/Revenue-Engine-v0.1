import { z } from 'zod';
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
 * 🚀 TYPE-SAFE CONFIGURATION SCHEMA (BMADv6)
 * Enforces strong typing and fail-fast validation at startup.
 */

const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url().optional().default('postgres://localhost:5432/revenue_engine'),
    ENCRYPTION_KEY: z.string().min(32, "Encryption key must be at least 32 characters (AES-256)").default('dev-key-placeholder-must-be-32-chars-long-!!!'),
    SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    VITE_USE_MOCKS: z.coerce.boolean().default(false),

    // GCP
    GCP_PROJECT_ID: z.string().default('351328298118'),
    GCP_LOCATION: z.string().default('global'),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    // DocAI
    DOCAI_LOCATION: z.string().default('us'),
    DOCAI_PROCESSOR_ID: z.string().default('99902dfde23907ec'),

    // Gemini
    GEMINI_PRO_MODEL: z.string().default('gemini-3.1-pro-preview'),
    GEMINI_FLASH_MODEL: z.string().default('gemini-3.1-flash-lite-preview'),
    GEMINI_FLASH_LITE_MODEL: z.string().default('gemini-3-flash-preview'),

    // Business
    AOV_TARGET: z.coerce.number().default(125),
    GROWTH_GOAL: z.coerce.number().default(20),
    BASE_RADIUS: z.coerce.number().default(20),
    MILE_SURCHARGE: z.coerce.number().default(2.50)
});

// Merged static and dynamic environment
const rawConfig = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: DATABASE_URL || process.env.DATABASE_URL,
    ENCRYPTION_KEY: ENCRYPTION_KEY || env.ENCRYPTION_KEY,
    SQUARE_ENV: SQUARE_ENVIRONMENT,
    VITE_USE_MOCKS: env.VITE_USE_MOCKS,
    GCP_PROJECT_ID: GCP_PROJECT_ID,
    GCP_LOCATION: GCP_LOCATION,
    GOOGLE_APPLICATION_CREDENTIALS: GOOGLE_APPLICATION_CREDENTIALS,
    DOCAI_LOCATION: DOCAI_LOCATION,
    DOCAI_PROCESSOR_ID: DOCAI_PROCESSOR_ID,
    GEMINI_PRO_MODEL: GEMINI_PRO_MODEL,
    GEMINI_FLASH_MODEL: GEMINI_FLASH_MODEL,
    GEMINI_FLASH_LITE_MODEL: GEMINI_FLASH_LITE_MODEL,
    AOV_TARGET: AOV_TARGET,
    GROWTH_GOAL: GROWTH_GOAL_PERCENT,
    BASE_RADIUS: MOBILE_BASE_RADIUS_MILES,
    MILE_SURCHARGE: SURCHARGE_PER_MILE
};

const parsed = envSchema.safeParse(rawConfig);

if (!parsed.success) {
    const errorDetails = parsed.error.format();
    console.error('❌ [CRITICAL CONFIG ERROR] Invalid environment variables:', JSON.stringify(errorDetails, null, 2));
    
    // Fail-fast in production
    if (process.env.NODE_ENV === 'production') {
        throw new Error('CONFIG_VALIDATION_FAILED');
    }
}

const config = parsed.success ? parsed.data : envSchema.parse({}); // Fallback to defaults if allowed

export const APP_CONFIG = {
    IS_PRODUCTION: config.NODE_ENV === 'production',
    DATABASE_URL: config.DATABASE_URL,
    ENCRYPTION_KEY: config.ENCRYPTION_KEY,
    SQUARE_ENV: config.SQUARE_ENV,
    USE_MOCKS: config.VITE_USE_MOCKS || (!config.DATABASE_URL && config.NODE_ENV !== 'production')
};

export const GCP_CONFIG = {
    PROJECT_ID: config.GCP_PROJECT_ID,
    LOCATION: config.GCP_LOCATION.trim(),
    KEY_PATH: config.GOOGLE_APPLICATION_CREDENTIALS
};

if (GCP_CONFIG.KEY_PATH && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GCP_CONFIG.KEY_PATH;
}

export const DOCAI_CONFIG = {
    PROJECT_ID: GCP_CONFIG.PROJECT_ID,
    LOCATION: config.DOCAI_LOCATION,
    PROCESSOR_ID: config.DOCAI_PROCESSOR_ID
};

export const GEMINI_CONFIG = {
    LOCATION: GCP_CONFIG.LOCATION,
    MODELS: {
        PRO: config.GEMINI_PRO_MODEL,
        FLASH: config.GEMINI_FLASH_MODEL,
        LITE: config.GEMINI_FLASH_LITE_MODEL
    }
};

export const BUSINESS_CONFIG = {
    AOV_TARGET: config.AOV_TARGET,
    GROWTH_GOAL: config.GROWTH_GOAL,
    BASE_RADIUS: config.BASE_RADIUS,
    MILE_SURCHARGE: config.MILE_SURCHARGE
};

export function validateConfig() {
    if (!parsed.success) {
        throw new Error(`Invalid Configuration: ${Object.keys(parsed.error.format()).join(', ')}`);
    }
}
