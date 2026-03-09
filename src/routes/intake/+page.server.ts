import type { Actions } from './$types';
import { createDriverRecord } from '../../lib/server/phi_vault';
import { runInAudit } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        
        // 1. Identity & Baseline MCSA Core
        const ssn = formData.get('ssn')?.toString();
        const dob = formData.get('dob')?.toString();
        const licenseNumber = formData.get('licenseNumber')?.toString();
        const driverName = formData.get('driverName')?.toString() || 'Unknown';
        
        // Validation (OBT-15/20)
        if (!ssn || !dob || !licenseNumber) {
            return fail(400, { missing: true });
        }

        // 2. Extract Modular Submissions (Catch-all for dynamic fields)
        // Everything not explicitly mapped above goes to the JSONB modular store
        const modularAnswers: Record<string, string | boolean> = {};
        for (const [key, value] of formData.entries()) {
            if (!['ssn', 'dob', 'licenseNumber', 'driverName'].includes(key)) {
                modularAnswers[key] = value.toString();
            }
        }

        try {
            const actorId = '00000000-0000-0000-0000-000000000000'; // System Fallback
            
            // 3. Registering the driver in the SECURE PHI VAULT
            // This handles writing Identity and strictly protected Health History
            const newRecord = await createDriverRecord({
                ssn,
                dob,
                licenseNumber,
                userId: actorId
            });

            // 4. Register Non-PHI form responses into APP_PUBLIC (Modular Store)
            // Ensures admin-defined Funnels don't contaminate the HIPAA vault
            if (Object.keys(modularAnswers).length > 0) {
                 await runInAudit('STORE_MODULAR_DATA', async (db) => {
                     const query = `
                         INSERT INTO app_public.driver_modular_data (driver_id, responses)
                         VALUES ($1, $2)
                     `;
                     const res = await db.query(query, [newRecord.id, JSON.stringify(modularAnswers)]);
                     return res.rows;
                 });
            }

            return { success: true, id: newRecord.id };
        } catch (e) {
            const error = e as Error;
            console.error(`[INTAKE_FAILURE] ${error.message}`);
            
            return fail(500, { 
                message: 'An internal error occurred while processing sensitive information.',
                error: error.message 
            });
        }
    }
};
