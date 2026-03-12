export interface ComparisonResult {
    isMatch: boolean;
    mismatchFields: string[];
    confidence: number;
}

/**
 * Compares data extracted from the Front (OCR) and the Back (Barcode) of an ID.
 * Returns a score and specific mismatching fields.
 */
export function compareIdentity(front: any, back: any): ComparisonResult {
    const fieldsToCompare = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'idNumber', label: 'ID Number' },
        { key: 'dob', label: 'Date of Birth' }
    ];

    const mismatchFields: string[] = [];
    let matches = 0;

    fieldsToCompare.forEach(f => {
        const val1 = (front[f.key] || '').toString().toLowerCase().trim();
        const val2 = (back[f.key] || '').toString().toLowerCase().trim();

        if (val1 && val2) {
            if (val1 === val2) {
                matches++;
            } else {
                // Fuzzy check for names (sometimes OCR adds a middle initial or handles typos)
                if (f.key.includes('Name') && (val1.includes(val2) || val2.includes(val1))) {
                    matches += 0.8;
                } else {
                    mismatchFields.push(f.label);
                }
            }
        }
    });

    const confidence = fieldsToCompare.length > 0 ? (matches / fieldsToCompare.length) : 0;

    return {
        isMatch: confidence > 0.8,
        mismatchFields,
        confidence
    };
}
