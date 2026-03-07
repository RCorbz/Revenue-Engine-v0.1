import { runInAudit } from './db';
import { encryptSensitiveData } from '$lib/utils/security';
import { env } from '$env/dynamic/private';

/**
 * PHI Vault interaction layer.
 * Strictly enforces OBT-11 (Data Isolation) and OBT-20 (Field-Level Encryption).
 */

export async function createDriverRecord(payload: {
    ssn: string;
    dob: string;
    licenseNumber: string;
    userId: string;
}) {
    if (!env.ENCRYPTION_KEY) {
        throw new Error('System Misconfiguration: Missing ENCRYPTION_KEY');
    }

    // Encrypt sensitive fields before database insertion
    const encryptedSsn = encryptSensitiveData(payload.ssn, env.ENCRYPTION_KEY);
    const encryptedDob = encryptSensitiveData(payload.dob, env.ENCRYPTION_KEY);
    const encryptedLicense = encryptSensitiveData(payload.licenseNumber, env.ENCRYPTION_KEY);

    const result = await runInAudit('CREATE_PHI_RECORD', async (db) => {
        const query = `
            INSERT INTO phi_vault.drivers (ssn_encrypted, dob_encrypted, license_number_encrypted)
            VALUES ($1, $2, $3)
            RETURNING id
        `;
        const res = await db.query(query, [encryptedSsn, encryptedDob, encryptedLicense]);
        return res.rows;
    });

    // Handle both mock string result and DB row results
    if (typeof result === 'string') {
        return { id: result };
    }
    
    return result[0];
}

