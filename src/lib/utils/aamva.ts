export interface IdentityData {
    firstName: string;
    lastName: string;
    idNumber: string;
    dob: string;
    expirationDate: string;
    isExpired: boolean;
    source: 'barcode' | 'ocr';
}

export function parseAAMVA(raw: string): IdentityData {
    const extract = (key: string) => {
        const match = raw.match(new RegExp(`${key}([^\\n\\r\\f]+)`));
        return match ? match[1].trim() : '';
    };

    const expStr = extract('DBA'); // MMDDYYYY
    let isExpired = false;
    
    if (expStr && expStr.length === 8) {
        const month = parseInt(expStr.substring(0, 2));
        const day = parseInt(expStr.substring(2, 4));
        const year = parseInt(expStr.substring(4, 8));
        const expDate = new Date(year, month - 1, day);
        isExpired = expDate < new Date();
    }

    return {
        firstName: extract('DAC'),
        lastName: extract('DCS'),
        idNumber: extract('DAQ'),
        dob: extract('DBB'),
        expirationDate: expStr,
        isExpired: isExpired,
        source: 'barcode'
    };
}

