import { runInAudit } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // 1. Fetch Revenue Data directly through the Audit Wrapper (avoid local fetch hop)
    const result = await runInAudit('AI_STRATEGY_BRIEFING', async (db) => {
        const query = `
            SELECT 
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                SUM(total_amount) as gross_revenue,
                COUNT(id) as total_transactions
            FROM app_public.transactions
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `;
        const res = await db.query(query);
        return res.rows;
    });

    // Handle Mock object vs DB rows
    const revenueData = Array.isArray(result) ? (result[0] || {}) : result;
    
    const currentAov = Number(revenueData.avg_order_value) || 0;
    const grossRev = Number(revenueData.gross_revenue || revenueData.gross_rev) || 0; // alias handler for mock
    const totalTx = Number(revenueData.total_transactions || revenueData.total_tx) || 0;
    
    const targetAov = 125.00;
    const gap = (targetAov - currentAov).toFixed(2);
    const percentToTarget = Math.min(Math.round((currentAov / targetAov) * 100), 100);

    const briefing = {
        current_aov: currentAov,
        target_aov: targetAov,
        revenue_gap: gap,
        percent_to_target: percentToTarget,
        gross_revenue: grossRev,
        total_transactions: totalTx,
        strategy_pivot: currentAov < targetAov 
            ? "AOV is below the $125 anchor. Recommend triggering OBT-2 surcharge logic." 
            : "AOV Target achieved. Maintain current mathematical routing."
    };

    return { briefing };
};
