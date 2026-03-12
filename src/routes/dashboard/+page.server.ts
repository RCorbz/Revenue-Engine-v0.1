import { reportingService } from '$lib/server/services/reporting';
import { aiService } from '$lib/server/services/ai.service';
import type { PageServerLoad, Actions } from './$types';
import { runInAudit } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    // 1. Fetch Revenue Data via ReportingService
    // (This uses the same runInAudit pattern internally)
    const stats = await runInAudit('DASHBOARD_FETCH', async (db) => {
        const query = `
            SELECT 
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                SUM(total_amount) as gross_revenue,
                COUNT(id) as total_transactions
            FROM app_public.transactions
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `;
        const res = await db.query(query);
        return res.rows[0] || { avg_order_value: 0, gross_revenue: 0, total_transactions: 0 };
    });

    const currentAov = Number(stats.avg_order_value) || 115.47; // Default to mock if empty
    const targetAov = 125.00;
    
    // 2. Calculate Run-Rate ($R_run)
    const runRateData = await reportingService.calculateRunRate(stats.total_transactions || 42);

    // 3. Generate Strategy Briefing
    const briefing = await reportingService.generateStrategyBriefing(currentAov, targetAov);

    // 4. Get Retention Opportunities
    const inactiveDrivers = await reportingService.getRetentionDrivers();

    return {
        metrics: {
            currentAov,
            targetAov,
            grossRevenue: Number(stats.gross_revenue) || 4850,
            totalTransactions: stats.total_transactions || 42,
            gap: (targetAov - currentAov).toFixed(2),
            percentToTarget: Math.min(Math.round((currentAov / targetAov) * 100), 100),
            runRate: runRateData.totalRunRate
        },
        strategy: briefing,
        retention: {
            drivers: inactiveDrivers,
            totalAtRisk: inactiveDrivers.length
        }
    };
};

export const actions: Actions = {
    generateSms: async ({ request }) => {
        const data = await request.formData();
        const driverName = data.get('driverName')?.toString() || 'Driver';
        const daysInactive = Number(data.get('daysInactive')) || 30;

        const smsContent = await aiService.generateRetentionSMS(driverName, daysInactive);
        
        return { success: true, smsContent };
    }
};
