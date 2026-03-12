/**
 * 🧪 MOCK DATA REPOSITORY (TEST-4)
 * For local development and OBT bypass.
 */

export const MOCK_IDENTITY_RESULT = {
    firstName: 'JOHN',
    lastName: 'DOE',
    driverName: 'JOHN DOE',
    idNumber: 'DL-999888',
    dob: '1985-06-15',
    licenseNumber: 'DL-999888',
    expirationDate: '2030-01-01',
    address: '123 MAIN ST, SPRINGFIELD, IL 62704',
    physical: {
        sex: 'M',
        height: '6-00',
        eyes: 'BRO'
    },
    licenseDetails: {
        class: 'A',
        restrictions: 'B',
        endorsements: 'P'
    },
    isExpired: false,
    source: 'simulation'
};

export const MOCK_STRATEGY_BRIEFING = {
    total_tx: 42,
    gross_rev: 4850.00,
    avg_order_value: 115.47,
    forecast_30d: 5800.00,
    growth_trajectory: '+21%'
};

export const MOCK_AUDIT_LOGS = [
    { 
        id: 1, 
        timestamp: new Date().toISOString(), 
        action: 'MOCK_INIT', 
        user: 'system_local', 
        detail: 'Local environment started with MOCK_DATA enabled.' 
    }
];
