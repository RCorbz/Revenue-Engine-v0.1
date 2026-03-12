import { json } from '@sveltejs/kit';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { normalizeIdentityData } from '$lib/server/gemini';
import { 
    DOCAI_LOCATION, 
    DOCAI_PROCESSOR_ID, 
    GCP_PROJECT_ID,
    GEMINI_FLASH_MODEL,
    GEMINI_FLASH_LITE_MODEL,
    GOOGLE_APPLICATION_CREDENTIALS
} from '$env/static/private';

// OBT-11: Detect local vs prod for auth method
const authOptions = process.env.NODE_ENV === 'development' 
    ? { keyFilename: GOOGLE_APPLICATION_CREDENTIALS } 
    : {};

const client = new DocumentProcessorServiceClient(authOptions);

export async function POST({ request }) {
    const { imageBase64, side } = await request.json();
    const sideLabel = side?.toUpperCase() || 'FRONT';

    console.log(`🚀 [PHASE 1: CLOUD INGEST] Identity Extraction (${sideLabel}) Starting...`);

    // SIMULATION MODE
    if (!DOCAI_PROCESSOR_ID || DOCAI_PROCESSOR_ID === 'PLACEHOLDER' || DOCAI_PROCESSOR_ID.includes('insert')) {
        console.log(`🧪 [SIMULATION] Returning OBT-Grounded Mock Identity ${sideLabel}...`);
        return json({
            success: true, verified: true,
            data: { 
                firstName: 'JANE', 
                lastName: 'SAMPLE', 
                idNumber: 'S8901234', 
                dob: '1990-01-01', 
                source: 'simulation',
                confidence: 0.99
            }
        });
    }

    try {
        const name = `projects/${GCP_PROJECT_ID}/locations/${DOCAI_LOCATION}/processors/${DOCAI_PROCESSOR_ID}`;
        console.log(`🔗 [PHASE 2: DOCAI TRIAGE] Requesting processor: ${DOCAI_PROCESSOR_ID} for ${sideLabel}`);
        
        let result;
        let entityCount = 0;
        try {
            [result] = await client.processDocument({
                name,
                rawDocument: { content: imageBase64, mimeType: 'image/jpeg' },
            });
            entityCount = result.document?.entities?.length || 0;
            console.log(`🧠 [PHASE 2: DOCAI SUCCESS] Found ${entityCount} entities for ${sideLabel}`);
        } catch (docAiError: any) {
            console.warn(`⚠️ [PHASE 2: DOCAI SKIP] Proceeding to Gemini Waterfall: ${docAiError.message}`);
            // We don't throw here; we let the next block handle the empty 'extracted' object
        }

        const entities = result?.document?.entities || [];
        
        // DEBUG DUMP FOR EDGE CASES
        if (entities.length > 0 && process.env.NODE_ENV !== 'production') {
            entities.forEach(e => console.log(`  🔍 [ENTITY] ${e.type}: "${e.mentionText}" (${e.confidence})`));
        }

        const getVal = (type: string) => entities.find(e => e.type === type);

        // Map DocAI fields to shared schema
        let extracted: any = {
            firstName: getVal('given_name')?.mentionText || getVal('Given Names')?.mentionText || '',
            lastName: getVal('family_name')?.mentionText || getVal('Family Name')?.mentionText || '',
            idNumber: getVal('document_number')?.mentionText || getVal('Document Id')?.mentionText || '',
            dob: getVal('date_of_birth')?.mentionText || getVal('Date Of Birth')?.mentionText || '',
            source: 'docai',
            confidence: getVal('document_number')?.confidence || 0
        };

        // OB-20: If DocAI returns empty or low signal, fall back to Gemini Flash for fuzzy visual capture
        if (!extracted.idNumber || extracted.idNumber === '' || extracted.confidence < 0.3) {
            console.warn(`🤖 [PHASE 3: WATERFALL] DocAI Signal Weak. Initializing Gemini Neural Pass for ${sideLabel}...`);
            const normalized = await normalizeIdentityData(extracted, imageBase64, sideLabel);
            
            // Waterfall Merge
            extracted = {
                firstName: normalized.data?.firstName || extracted.firstName,
                lastName: normalized.data?.lastName || extracted.lastName,
                idNumber: normalized.data?.idNumber || extracted.idNumber,
                dob: normalized.data?.dob || extracted.dob,
                source: 'gemini-flash',
                raw_log: normalized.raw_log
            };
        } else {
            console.log(`✅ [PHASE 3: NORMALIZATION] DocAI Pass Confirmed for ${sideLabel}. Data Merged.`);
        }

        console.log(`💼 [INTAKE_COMPLETE] Side: ${sideLabel} | Source: ${extracted.source} | ID: ${extracted.idNumber}`);
        const verified = !!extracted.idNumber && extracted.idNumber.length > 3;

        return json({ success: true, verified, data: extracted, docAiEntityCount: entityCount });

    } catch (error: any) {
        console.error(`❌ [PHASE 2/3 ERROR] ${sideLabel} scan failed:`, error.message);
        
        // Final fallback if Gemini also fails or if we caught a DocAI error that we want to try to recover from elsewhere
        // But here we return a 500 to the client to trigger re-scan UI
        return json({ success: false, error: error.message }, { status: 500 });
    }
}

