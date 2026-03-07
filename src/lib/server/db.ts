import pg from 'pg';
import { env } from '$env/dynamic/private';
import { maskPII } from '$lib/utils/security';
import { randomBytes, createHash } from 'node:crypto';

const { Pool } = pg;

// Singleton pattern for Postgres pool to prevent connection exhaustion
let pool: pg.Pool;

export function getDbPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: env.DATABASE_URL,
            max: 20, // Prevent exhaustion on scale-up
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return pool;
}

interface AuditLogRecord {
    actionType: string;
    actorId: string;
    resourceId: string;
    clientTimestamp: Date;
    contextParams?: any[];
}

// Wrapper for executing queries against phi_vault to automatically enforce OBT-18
export async function runInAudit<T>(
    query: string,
    params: any[],
    auditContext: AuditLogRecord
): Promise<T[]> {
    const db = getDbPool();
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Generate State Hash for immutability check
        const queryHash = createHash('sha256')
            .update(query + JSON.stringify(params) + auditContext.clientTimestamp.toISOString())
            .digest('hex');

        // 2. Perform the actual restricted query
        const result = await client.query(query, params);

        // 3. Write to Audit Log (OBT-18)
        const auditLogQuery = `
            INSERT INTO app_public.audit_logs 
            (action_type, actor_id, resource_id, state_hash, client_timestamp)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const auditParams = [
            auditContext.actionType,
            auditContext.actorId,
            auditContext.resourceId,
            queryHash,
            auditContext.clientTimestamp
        ];
        await client.query(auditLogQuery, auditParams);

        await client.query('COMMIT');
        return result.rows as T[];

    } catch (e: any) {
        await client.query('ROLLBACK');

        // Mask PII before logging to prevent leakage into application logs
        let maskedError = e.message;
        if (params && params.length > 0) {
            maskedError += ` | Params: ${params.map(p => typeof p === 'string' ? maskPII(p) : p).join(', ')}`;
        }
        console.error(`[AUDIT_ERROR] Failed sensitive query execution: ${maskedError}`);
        throw new Error('A database error occurred during a secure operation.');
    } finally {
        client.release();
    }
}
