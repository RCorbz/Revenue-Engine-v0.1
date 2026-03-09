
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/RCorbz/Desktop/Revenue Engine v0.1/.env' });

const { PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;

const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });

async function testFamily() {
    const families = ['gemini-3.1-flash-lite', 'gemini-3.1-pro', 'gemini-3-flash', 'gemini-3-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    for (const modelName of families) {
        console.log(`Testing ${modelName}...`);
        try {
            const resp = await vertexAI.getGenerativeModel({ model: modelName }).generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
            console.log(`✅ SUCCESS: ${modelName}`);
        } catch (e) {
            console.log(`❌ FAIL: ${modelName} - ${e.message}`);
        }
    }
}

testFamily();
