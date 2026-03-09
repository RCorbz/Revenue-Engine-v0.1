
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/RCorbz/Desktop/Revenue Engine v0.1/.env' });

const { PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;

const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });

async function testFullResource() {
    const fullPath = `projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-3.1-flash-lite`;
    console.log(`Testing Full Path: ${fullPath}...`);
    try {
        const generativeModel = vertexAI.getGenerativeModel({ model: fullPath });
        const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
        console.log(`✅ Full Path SUCCESS`);
    } catch (e) {
        console.log(`❌ Full Path FAIL: ${e.message}`);
    }
}

testFullResource();
