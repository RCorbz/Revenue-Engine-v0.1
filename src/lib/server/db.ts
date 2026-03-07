import pg from 'pg';
const { Pool } = pg;

const isLocal = process.env.NODE_ENV !== 'production';
const hasDb = !!process.env.DATABASE_URL;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/revenue_engine',
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

export async function runInAudit(action: string, callback: (db: any) => Promise<any>) {
    console.log(`[AUDIT-LOG] Action: ${action} | User: system_local`);

    // OBT-11: If local and no DB, return mock data immediately
    if (isLocal && !hasDb) {
        if (action === 'AI_STRATEGY_BRIEFING') {
            return { total_tx: 42, gross_rev: 4850.00, avg_order_value: 115.47 };
        }
        if (action === 'VIEW_AUDIT_LOGS') {
            return [
                { id: 1, timestamp: new Date().toISOString(), action: 'MOCK_INIT', user: 'system_local', detail: 'Local environment started without DB.' }
            ];
        }
        // For 'VAULT_WRITE', return a fake ID
        return "mock-tx-id-12345";
    }

    // Only attempt connection if we are in production or have a real URL
    const client = await pool.connect();
    try {
        return await callback(client);
    } finally {
        client.release();
    }
}