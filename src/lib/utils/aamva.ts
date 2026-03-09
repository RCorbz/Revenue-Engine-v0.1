/**
 * Simple parser for AAMVA Standard PDF417 barcode data found on US/Canada DLs.
 * Standard format: @\nANSI 636000080002DL00410278ZN03100007DLDAA...
 */
export function parseAAMVA(data: string) {
    try {
        const result: any = {
            driverName: '',
            licenseNumber: '',
            dob: '',
            address: '',
            verificationStatus: 'Verified'
        };

        // Standard mappings (AAMVA 2016)
        const mappings: Record<string, string> = {
            'DAA': 'fullName',
            'DCS': 'familyName',
            'DAC': 'givenName',
            'DAQ': 'licenseNumber',
            'DBB': 'dob',
            'DAG': 'address',
            'DAI': 'city',
            'DAJ': 'state',
            'DAK': 'zip'
        };

        // Find the start of the subfile (usually follows the header)
        const dlStart = data.indexOf('DL');
        if (dlStart === -1) return null;

        const content = data.substring(dlStart + 2);
        
        // Split by lines or just look for the 3-letter codes
        for (const [code, key] of Object.entries(mappings)) {
            const index = content.indexOf(code);
            if (index !== -1) {
                // Find end of field (usually \n or next code)
                const valueStart = index + 3;
                let valueEnd = content.indexOf('\n', valueStart);
                if (valueEnd === -1) valueEnd = content.length;
                
                let value = content.substring(valueStart, valueEnd).trim();
                
                if (key === 'fullName' && !result.driverName) result.driverName = value;
                if (key === 'familyName' && result.driverName) result.driverName += ' ' + value;
                if (key === 'givenName' && !result.driverName) result.driverName = value;
                if (key === 'licenseNumber') result.licenseNumber = value;
                if (key === 'dob') {
                    // MMDDYYYY to YYYY-MM-DD
                    if (value.length === 8) {
                        result.dob = `${value.substring(4, 8)}-${value.substring(0, 2)}-${value.substring(2, 4)}`;
                    } else {
                        result.dob = value;
                    }
                }
            }
        }

        if (result.driverName && result.licenseNumber) return result;
        
        return null;
    } catch (e) {
        console.error('Failed to parse AAMVA data', e);
        return null;
    }
}
