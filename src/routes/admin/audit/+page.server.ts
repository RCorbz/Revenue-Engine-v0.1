import { runInAudit } from '$lib/server/db';

export const load = async () => {
    try {
        const logs = await runInAudit('VIEW_AUDIT_LOGS', async (db) => {
            // This part only runs if a real DB exists
            const res = await db.query('SELECT * FROM app_public.audit_logs ORDER BY created_at DESC LIMIT 50');
            return res.rows;
        });

        return { logs: logs || [] };
    } catch (e) {
        return { logs: [{ id: 0, timestamp: new Date().toISOString(), action: 'ERROR', user: 'system', detail: 'Audit table not found.' }] };
    }
};