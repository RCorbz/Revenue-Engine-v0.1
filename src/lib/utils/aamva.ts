export interface IdentityData {
    [key: string]: any;
    firstName: string;
    lastName: string;
    idNumber: string;
    dob: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    issueDate?: string;
    expirationDate: string;
    physical: {
        sex?: string;
        height?: string;
        eyes?: string;
        weight?: string;
    };
    licenseDetails?: {
        class?: string;
        restrictions?: string;
        endorsements?: string;
    };
    documentDiscriminator?: string;
    isExpired: boolean;
    source: string;
    raw?: string;
    comparison?: {
        isMatch: boolean;
        mismatchFields: string[];
        confidence: number;
    };
}

/**
 * Standardizes AAMVA date formats (YYYYMMDD, MMDDYYYY, etc) to YYYY-MM-DD
 */
function standardizeDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 8) return dateStr;
    
    // Often CCYYMMDD
    if (dateStr.length === 8) {
        // If the first 4 chars look like a year (e.g. 19xx or 20xx)
        if (dateStr.startsWith('19') || dateStr.startsWith('20')) {
            return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }
        // Else check if it's MMDDYYYY
        const month = parseInt(dateStr.substring(0, 2));
        const year = parseInt(dateStr.substring(4, 8));
        if (month >= 1 && month <= 12 && year > 1900) {
            return `${dateStr.substring(4, 8)}-${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}`;
        }
    }
    return dateStr;
}

export function parseAAMVA(raw: string): IdentityData {
    const extract = (key: string) => {
        const match = raw.match(new RegExp(`${key}([^\\n\\r\\f]+)`));
        return match ? match[1].trim() : '';
    };

    const expStr = standardizeDate(extract('DBA'));
    let isExpired = false;
    
    if (expStr && expStr.includes('-')) {
        const expDate = new Date(expStr);
        isExpired = expDate < new Date();
    }

    const firstName = extract('DAC') || extract('DCT'); // Given Names
    const lastName = extract('DCS'); // Family Name
    const dob = standardizeDate(extract('DBB'));
    const idNumber = extract('DAQ');
    
    const street = extract('DAG');
    const city = extract('DAI');
    const state = extract('DAJ');
    const postal = extract('DAK');

    return {
        firstName,
        lastName,
        idNumber,
        dob,
        expirationDate: expStr,
        address: street,
        city,
        state,
        postalCode: postal,
        physical: {
            sex: extract('DBC'),
            height: extract('DAU'),
            eyes: extract('DAY')
        },
        licenseDetails: {
            class: extract('DCA'),
            restrictions: extract('DCB'),
            endorsements: extract('DCD')
        },
        isExpired: isExpired,
        source: 'barcode',
        raw: raw
    };
}

