import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Standard dotenv loading
dotenv.config({ path: join(__dirname, '../.env') });

const PROJECT_ID = process.env.GCP_PROJECT_ID || "351328298118";
const MODEL_NAME = process.env.GEMINI_FLASH_LITE_MODEL || "gemini-3.1-flash-lite-preview";
    const regions = ['us-central1', 'us-east4', 'europe-west1', 'us-west1'];
    const models = [
        'gemini-1.5-flash-002',
        'gemini-1.5-flash-8b',
        'gemini-1.5-flash'
    ];

    console.log(`🚀 [PROBE] Starting Regional Sweep for Project: ${PROJECT_ID}`);

    for (const region of regions) {
        console.log(`\n📍 Testing Region: ${region}`);
        const client = new GoogleGenAI({
            project: PROJECT_ID,
            location: region,
            vertexai: true,
            apiVersion: "v1beta1"
        } as any);

        for (const modelId of models) {
            process.stdout.write(`🧠 [PROBE] Testing ${modelId}... `);
            try {
                const result = await client.models.generateContent({
                    model: modelId,
                    contents: [{ role: 'user', parts: [{ text: "Respond with exactly 'PONG'" }] }],
                    config: { temperature: 0.1, maxOutputTokens: 10 }
                });

                const text = result.response?.text() || '';
                if (text.includes('PONG')) {
                    console.log(`✅ SUCCESS!`);
                    console.log(`\n🎉 Connection Verified! The ${modelId} model is live in ${region}.`);
                    return;
                } else {
                    console.log(`⚠️ UNEXPECTED: ${text}`);
                }
            } catch (e: any) {
                console.log(`❌ FAILED: ${e.message.split('\n')[0].substring(0, 100)}`);
            }
        }
    }

    console.error("\n💀 [FATAL] All probe models and regions failed.");
    console.log("🔍 [DIAGNOSTIC] ACTION REQUIRED:");
    console.log("   - 1. Billing: Linked to project?");
    console.log("   - 2. IAM: Service Account has 'Vertex AI User' role?");
    console.log("   - 3. Search Loop: Go to GCP Search bar, type 'Gemini' and select to trigger enable.");
}

probe();
