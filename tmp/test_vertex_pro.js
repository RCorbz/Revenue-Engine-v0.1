
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/RCorbz/Desktop/Revenue Engine v0.1/.env' });

const { PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;

const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });

async function testPro() {
    console.log(`Testing gemini-2.5-pro...`);
    try {
        const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
        const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
        console.log(`✅ gemini-2.5-pro works!`);
    } catch (e) {
        console.log(`❌ gemini-2.5-pro failed: ${e.message}`);
    }
}

testPro();
