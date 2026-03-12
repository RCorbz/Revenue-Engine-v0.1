import { aiService } from './src/lib/server/services/ai.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function testExtraction() {
    console.log('🧪 [TEST] Mocking AIService.extractIdentity...');
    const mockRaw = { driverName: '', dob: '', licenseNumber: '' };
    
    // We won't pass an image here, just see if it handles the mock AI result
    // To do this properly, we'd need to mock the AI SDK response
    // But let's just check the mapping logic by seeing if it runs.
    
    try {
        const result = await aiService.extractIdentity(mockRaw, undefined, 'FRONT');
        console.log('✅ [TEST] Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ [TEST] Error:', e);
    }
}

testExtraction();
