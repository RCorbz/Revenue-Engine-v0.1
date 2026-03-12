import { BUSINESS_CONFIG } from '../config';
import { runInAudit } from '../db';

/**
 * 📈 ReportingService: Business Intelligence Engine (BMADv6)
 * Calculates the 3 Rs: Revenue, Retention, Reputation.
 */
class ReportingService {
    /**
     * Calculate Revenue Run-Rate (R_run)
     * Formula: (Transaction Count * AOV_Target) * Surcharge_Factor
     */
    async calculateRunRate(transactionsCount: number, avgDistance: number = 0) {
        const { AOV_TARGET, MILE_SURCHARGE } = BUSINESS_CONFIG;
        
        // Base Revenue: Count * Target Avg Order Value
        const baseRevenue = transactionsCount * AOV_TARGET;
        
        // Surcharge Impact: Avg Distance * Surcharge per Mile
        // (A standard multiplier for mobile service range expansion)
        const surchargeFactor = 1 + (avgDistance * MILE_SURCHARGE / 100); 
        
        const runRate = baseRevenue * surchargeFactor;

        return {
            baseRevenue: Math.round(baseRevenue),
            surchargeImpact: Math.round(runRate - baseRevenue),
            totalRunRate: Math.round(runRate),
            metricsUsed: { AOV_TARGET, MILE_SURCHARGE }
        };
    }

    /**
     * Retrieve Retention Glance
     * Fetches snapshot of driver re-engagement status.
     */
    async getRetentionSummary() {
        return await runInAudit('AI_STRATEGY_BRIEFING', async (db) => {
            // In a real scenario, this would be a complex query.
            // Using runInAudit ensures this summary is logged and hashed.
            const stats = {
                activeDrivers: 124,
                retainedDrivers: 88,
                retentionRate: '71%',
                lookbackDays: 90
            };
            return stats;
        });
    }

    /**
     * Strategy Engine: Generate localized revenue insights
     */
    async generateStrategyBriefing(currentRev: number, lastMonthRev: number) {
        const growth = ((currentRev - lastMonthRev) / lastMonthRev) * 100;
        const status = growth >= BUSINESS_CONFIG.GROWTH_GOAL ? 'target_met' : 'target_missed';
        
        return {
            growth: growth.toFixed(1) + '%',
            status,
            goal: BUSINESS_CONFIG.GROWTH_GOAL + '%',
            recommendation: status === 'target_met' ? 'Optimize logistics for sustainability.' : 'Initiate retention SMS blitz for past 90d inactive drivers.'
        };
    }
}

export const reportingService = new ReportingService();
