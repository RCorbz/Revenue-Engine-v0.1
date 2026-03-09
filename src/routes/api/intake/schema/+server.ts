import { json } from '@sveltejs/kit';
import { runInAudit } from '$lib/server/db';

export const GET = async () => {
    try {
        // 1. Fetch Admin Modular Configurations (The "Dynamic" Funnel)
        const customFields = await runInAudit('FETCH_FORM_SCHEMA', async (db) => {
            const res = await db.query(
                `SELECT field_key, field_label, field_type 
                 FROM app_public.form_configurations 
                 WHERE is_active = TRUE 
                 ORDER BY display_order ASC`
            );
            return res.rows;
        });
        
        // Handle mock vs real db array
        const modularFields = Array.isArray(customFields) ? customFields : [];

        // 2. Define the STRICT MCSA Core Requirements
        // Transformed to enforce "Thumb-Friendly" mobile UI bindings (OBT-UX)
        const mcsaCoreSchema = [
            { field_key: 'blood_pressure_sys', field_label: 'Systolic Pressure', field_type: 'slider', required: true, section: 'Vitals', min: 80, max: 200, default_value: 120, unit: 'mmHg' },
            { field_key: 'blood_pressure_dia', field_label: 'Diastolic Pressure', field_type: 'slider', required: true, section: 'Vitals', min: 40, max: 130, default_value: 80, unit: 'mmHg' },
            { field_key: 'vision_acuity_right', field_label: 'Vision Acuity Right (20/X)', field_type: 'slider', required: true, section: 'Vision', min: 10, max: 200, default_value: 20, unit: 'ft' },
            { field_key: 'vision_acuity_left', field_label: 'Vision Acuity Left (20/X)', field_type: 'slider', required: true, section: 'Vision', min: 10, max: 200, default_value: 20, unit: 'ft' },
            { field_key: 'hearing_test_pass', field_label: 'Audiometric Test?', field_type: 'toggle', required: true, section: 'Hearing', default_value: 'Unset' },
            { field_key: 'head_injuries', field_label: 'Head/Brain Injuries?', field_type: 'toggle', required: true, section: 'Health_History', default_value: 'Unset' },
            { field_key: 'seizures_epilepsy', field_label: 'Seizures/Epilepsy?', field_type: 'toggle', required: true, section: 'Health_History', default_value: 'Unset' }
        ];

        // 3. Merge and return unified schema to the frontend parser
        // The UI will dynamically loop through this array to build the swipe cards or form.
        return json({
            mcsa_requirements: mcsaCoreSchema,
            modular_addons: modularFields
        });

    } catch (error) {
        console.error('Failed to generate Intake Schema:', error);
        return json({ error: 'Schema Unavailable' }, { status: 500 });
    }
};
