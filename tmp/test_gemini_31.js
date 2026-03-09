
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/RCorbz/Desktop/Revenue Engine v0.1/.env' });

const { PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;

const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });

const modelsToTest = [
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro'
];

async function runTest() {
    for (const modelName of modelsToTest) {
        console.log(`Testing ${modelName}...`);
        try {
            const generativeModel = vertexAI.getGenerativeModel({ model: modelName });
            const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'Identify this: SAMPLE JANE' }] }] });
            console.log(`✅ ${modelName} is AVAILABLE`);
        } catch (e) {
            console.log(`❌ ${modelName} FAILED: ${e.message}`);
        }
    }
}

runTest();
