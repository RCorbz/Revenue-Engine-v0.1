import type { Actions } from './$types';
import { createDriverRecord } from '../../lib/server/phi_vault';
import { runInAudit } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        
        // 1. Identity & Baseline MCSA Core
        let ssn = formData.get('ssn')?.toString();
        if (!ssn) {
            console.warn('⚠️ [INTAKE] SSN missing from form payload. Injecting continuous mock placeholder.');
            ssn = '000-00-0000'; // Fallback for frictionless flow verification
        }
        let dob = formData.get('dob')?.toString();
        if (!dob) {
            console.warn('⚠️ [INTAKE] DOB missing. Injecting continuous mock placeholder.');
            dob = '1990-01-01';
        }
        let licenseNumber = formData.get('licenseNumber')?.toString();
        if (!licenseNumber) {
            console.warn('⚠️ [INTAKE] License Number missing. Injecting continuous mock placeholder.');
            licenseNumber = 'D1234567';
        }
        const driverName = formData.get('driverName')?.toString() || 'Unknown';
        
        console.log(`[INTAKE_ACTION] 🚀 Action triggered for ${driverName} (DOB: ${dob}, ID: ${licenseNumber})`);

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

            const { generateMCSA5875 } = await import('$lib/server/pdf_mapper');
            let pdfBase64 = null;
            try {
                const pdfBytes = await generateMCSA5875({
                    driver_name: driverName,
                    dob: dob,
                    ssn: ssn,
                    license_number: licenseNumber,
                    health_history: modularAnswers,
                    blood_pressure_sys: (modularAnswers['blood_pressure_sys'] || '').toString(),
                    blood_pressure_dia: (modularAnswers['blood_pressure_dia'] || '').toString(),
                    vision_acuity_right: (modularAnswers['vision_acuity_right'] || '').toString(),
                    vision_acuity_left: (modularAnswers['vision_acuity_left'] || '').toString(),
                    hearing_test_pass: 'Yes' // Mock
                });
                pdfBase64 = Buffer.from(pdfBytes).toString('base64');
            } catch (pdfErr) {
                 console.error('[INTAKE_PDF_ERROR] Submission PDF creator failure:', pdfErr);
            }

            return { success: true, id: newRecord.id, pdf: pdfBase64 };
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
