import { json, type RequestEvent } from '@sveltejs/kit';
import { VertexAI } from '@google-cloud/vertexai';
import { runInAudit } from '$lib/server/db';
import { maskPII } from '$lib/utils/security';

// Initialize Vertex AI with your 2026 Project ID
const vertexAI = new VertexAI({
    project: 'universal-revenue-engine-2026',
    location: 'us-central1'
});

export const GET = async ({ locals }: RequestEvent) => {
    try {
        // 1. Fetch Revenue Data via the Audit-Protected Wrapper
        const result = await runInAudit(
            `
                SELECT 
                    COUNT(*) as total_tx,
                    SUM(total_amount) as gross_rev,
                    AVG(total_amount) as avg_order_value
                FROM app_public.transactions
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `,
            [],
            {
                actionType: 'AI_STRATEGY_BRIEFING',
                actorId: '00000000-0000-0000-0000-000000000000',
                resourceId: '00000000-0000-0000-0000-000000000000',
                clientTimestamp: new Date()
            }
        );
        const revenueData = result[0];

        // 2. Initialize Gemini 3.1 Pro (High Fidelity)
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-3.1-pro',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `
            Analyze this 24-hour revenue snapshot: ${JSON.stringify(revenueData)}.
            The target AOV anchor is $125.00 (OBT-2).
            Provide a JSON briefing with:
            - current_aov
            - revenue_gap (difference from $125)
            - strategy_pivot (one sentence for the dashboard)
        `;

        const response = await model.generateContent(prompt);
        const briefingText = response.response.candidates?.[0]?.content.parts[0].text;
        const briefing = briefingText ? JSON.parse(briefingText) : {};

        return json(briefing);

    } catch (error: any) {
        console.error('OBT-5 Failure:', maskPII(error.message));
        return json({ error: 'Briefing Unavailable' }, { status: 500 });
    }
};