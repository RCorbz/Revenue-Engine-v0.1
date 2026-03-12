import pg from 'pg';
import { APP_CONFIG } from './config';
import { generateStateHash } from '$lib/utils/security';
import { MOCK_STRATEGY_BRIEFING, MOCK_AUDIT_LOGS } from '$lib/mocks/intake.mock';

const { Pool } = pg;

export const pool = new Pool({
    connectionString: APP_CONFIG.DATABASE_URL,
    ssl: APP_CONFIG.IS_PRODUCTION ? { rejectUnauthorized: false } : false
});

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

/**
 * 🛡️ runInAudit (BMADv6)
 * Enterprise-grade wrapper for transaction auditability.
 * Switches to Mock Provider automatically based on USE_MOCKS config.
 */
export async function runInAudit(
    action: string, 
    callback: (db: any) => Promise<any>,
    options: { actorId?: string; resourceId?: string } = {}
) {
    const actorId = options.actorId || SYSTEM_ACTOR_ID;
    console.log(`[AUDIT] Initiating: ${action} | Actor: ${actorId}`);

    // TEST-4: Decoupled Mock Provider
    if (APP_CONFIG.USE_MOCKS) {
        return await handleMockAction(action);
    }

    const client = await pool.connect();
    try {
        const result = await callback(client);
        
        // SEC-2: Immutable Audit Implementation
        const stateHash = generateStateHash(result || {});
        const potentialResourceId = options.resourceId || (typeof result === 'string' ? result : (result?.id || null)) || SYSTEM_ACTOR_ID;
        const finalResourceId = (typeof potentialResourceId === 'string' && potentialResourceId.length >= 32) ? potentialResourceId : SYSTEM_ACTOR_ID;

        await client.query(
            `INSERT INTO app_public.audit_logs (action_type, actor_id, resource_id, state_hash, client_timestamp)
             VALUES ($1, $2, $3, $4, NOW())`,
            [action, actorId, finalResourceId, stateHash]
        );

        return result;
    } catch (error) {
        console.error(`[AUDIT-ERROR] Failed to log action ${action}:`, error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * 🧪 Mock Provider Engine
 */
async function handleMockAction(action: string) {
    console.log(`🧪 [MOCK PROVIDER] Simulating action: ${action}`);
    switch (action) {
        case 'AI_STRATEGY_BRIEFING':
            return MOCK_STRATEGY_BRIEFING;
        case 'VIEW_AUDIT_LOGS':
            return MOCK_AUDIT_LOGS;
        case 'VAULT_WRITE':
            return "mock-tx-uuid-5875";
        default:
            return { status: "simulated_success", timestamp: new Date().toISOString() };
    }
}