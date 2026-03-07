import { json } from '@sveltejs/kit';
import { runInAudit } from '$lib/server/db';

export const GET = async () => {
    try {
        // OBT-18: Audit the health check itself
        const status = await runInAudit('SYSTEM_HEALTH_CHECK', async (db) => {
            const res = await db.query('SELECT NOW() as cloud_time');
            return {
                database: 'CONNECTED',
                cloud_time: res.rows[0].cloud_time,
                project: process.env.PROJECT_ID || 'revenue-engine-v01'
            };
        });

        return json({ status: 'HEALTHY', ...status });
    } catch (e) {
        const error = e as Error;
        console.error('HEALTH_CHECK_FAILURE:', error.message);
        return json({ 
            status: 'UNHEALTHY', 
            error: error.message,
            tip: "Check if the Cloud SQL Auth Proxy is running or if the Secret is correct."
        }, { status: 500 });
    }
};
