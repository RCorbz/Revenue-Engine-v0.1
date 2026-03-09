
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/RCorbz/Desktop/Revenue Engine v0.1/.env' });

const { PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS } = process.env;
process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;

const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });

const models = [
    'gemini-3.1-flash',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash'
];

async function testModels() {
    for (const modelName of models) {
        console.log(`Testing ${modelName}...`);
        try {
            const generativeModel = vertexAI.getGenerativeModel({ model: modelName });
            const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
            console.log(`✅ ${modelName} works!`);
            process.exit(0);
        } catch (e) {
            console.log(`❌ ${modelName} failed: ${e.message}`);
        }
    }
}

testModels();
