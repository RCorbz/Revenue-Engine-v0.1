import { json } from '@sveltejs/kit';
import { runInAudit } from '$lib/server/db';

export const GET = async () => {
    try {
        // 1. Fetch Revenue Data via the Audit-Protected Wrapper
        // The wrapper handles local mock data automatically if no DB is connected.
        const result = await runInAudit('AI_STRATEGY_BRIEFING', async (db) => {
            const query = `
                SELECT 
                    COALESCE(AVG(total_amount), 0) as avg_order_value
                FROM app_public.transactions
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `;
            const res = await db.query(query);
            return res.rows;
        });

        // Handle both the mock object { avg_order_value: ... } and the DB row results [ { avg_order_value: ... } ]
        const revenueData = Array.isArray(result) ? (result[0] || { avg_order_value: 0 }) : result;

        // 2. OBT-5 Fallback: Simulation logic based on real or mock data
        const currentAov = Number(revenueData.avg_order_value) || 0;
        const gap = (125 - currentAov).toFixed(2);

        const briefing = {
            current_aov: currentAov,
            revenue_gap: gap,
            strategy_pivot: currentAov < 125 
                ? "AOV is below the $125 anchor. Recommend triggering OBT-2 surcharge logic." 
                : "AOV Target achieved. Maintain current mathematical routing."
        };

        return json(briefing);

    } catch (e) {
        const error = e as Error;
        console.error('OBT-5 Fatal:', error.message);
        return json({ 
            current_aov: 0, 
            revenue_gap: "125.00", 
            strategy_pivot: "Intelligence Engine Offline - Check Database Connection" 
        }, { status: 200 });
    }
};

