import type { Actions } from './$types';
import { createDriverRecord } from '../../lib/server/phi_vault';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const formData = await request.formData();
        
        const ssn = formData.get('ssn')?.toString();
        const dob = formData.get('dob')?.toString();
        const licenseNumber = formData.get('licenseNumber')?.toString();

        // Validation (OBT-15/20)
        if (!ssn || !dob || !licenseNumber) {
            return fail(400, { missing: true });
        }

        try {
            // Registering the driver in the secure vault
            const newRecord = await createDriverRecord({
                ssn,
                dob,
                licenseNumber,
                userId: '00000000-0000-0000-0000-000000000000' // Placeholder for authenticated actor
            });

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