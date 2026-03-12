import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { APP_CONFIG } from './config';
import { decryptSensitiveData } from '$lib/utils/security';
import path from 'node:path';

/**
 * MCSA-5875 / 5876 Data Mapper
 * This utility maps securely fetched PHI data to the exact PDF form field IDs
 * required by the Department of Transportation's official medical clearance PDFs.
 */

export interface MCSADriverData {
    // Identity (Decrypted from phi_vault.drivers)
    driver_name: string;
    dob: string;
    ssn: string;
    license_number: string;
    
    // Core Health (Decrypted from phi_vault.mcsa_records)
    health_history: Record<string, string>; // e.g., "head/brain injuries": "No"
    blood_pressure_sys: string;
    blood_pressure_dia: string;
    vision_acuity_right: string;
    vision_acuity_left: string;
    hearing_test_pass: string;
    
    // Modular Funnel Data (From app_public.driver_modular_data)
    modular_data: Record<string, any>; // Used for business logic, not PDF submission
}

/**
 * Generates the Official MCSA-5875 PDF
 * NOTE: For local development, this requires the blank 'mcsa_5875.pdf' in the /static folder.
 */
export async function generateMCSA5875(data: MCSADriverData): Promise<Uint8Array> {
    try {
        // In a real production edge environment, this PDF template would be loaded from GCS
        // For development, we assume it's stored locally
        const templatePath = path.resolve(process.cwd(), 'static', 'mcsa_5875.pdf');
        
        let pdfBytes;
        try {
             pdfBytes = readFileSync(templatePath);
        } catch (e) {
             console.warn('[PDF_MAPPER] Running in Simulation - Blank MCSA-5875 PDF not found.');
             // Create a blank PDF as a fallback for local testing
             const pdfDoc = await PDFDocument.create();
             const page = pdfDoc.addPage();
             page.drawText('Simulation Document: MCSA-5875', { x: 50, y: 700, size: 24 });
             page.drawText(`Driver: ${data.driver_name}`, { x: 50, y: 650, size: 14 });
             page.drawText(`BP: ${data.blood_pressure_sys}/${data.blood_pressure_dia}`, { x: 50, y: 600, size: 14 });
             return await pdfDoc.save();
        }

        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // -------------------------------------------------------------
        // Field Mapping Logic (Matching FMCSA exact text field names)
        // -------------------------------------------------------------
        
        // Section 1: Identity
        try {
            form.getTextField('DriverName').setText(data.driver_name);
            form.getTextField('DOB').setText(data.dob);
            form.getTextField('SSN').setText(data.ssn); // PII injected straight to PDF
            form.getTextField('LicenseNumber').setText(data.license_number);
        } catch(e) { /* Skip if field ID missing in template */ }

        // Section 2: Health History (Checkbox Mapping)
        try {
            // Example mapping of the 32-question checklist
            if (data.health_history['head_injuries'] === 'Yes') {
                form.getCheckBox('HeadInjuries_Yes').check();
            } else if (data.health_history['head_injuries'] === 'No') {
                form.getCheckBox('HeadInjuries_No').check();
            }
        } catch(e) { /* Skip */ }

        // Section 3: Vitals
        try {
            form.getTextField('BloodPressure_Systolic').setText(data.blood_pressure_sys);
            form.getTextField('BloodPressure_Diastolic').setText(data.blood_pressure_dia);
            form.getTextField('Vision_RightEye').setText(data.vision_acuity_right);
            form.getTextField('Vision_LeftEye').setText(data.vision_acuity_left);
            
            if(data.hearing_test_pass === 'Yes') {
               form.getCheckBox('Hearing_Pass').check();
            }
        } catch(e) { /* Skip */ }

        // Secure the PDF (Optional - prevent further editing)
        form.flatten();

        return await pdfDoc.save();

    } catch (error) {
        console.error('[PDF_MAPPER_ERROR] Failed to map MCSA-5875:', error);
        throw new Error('Failed to generate submissible PDF document.');
    }
}
