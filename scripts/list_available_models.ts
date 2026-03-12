import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const REGIONS = ["us-central1", "us-east4", "global"];
const PROJECTS = [process.env.GCP_PROJECT_ID || "351328298118", "revenue-engine-v01"];

async function sweep() {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = join(__dirname, '../gcp-key.json');
    console.log("🕵️ [SWEEP] Starting Multi-Region Model Discovery...");

    for (const project of PROJECTS) {
        for (const location of REGIONS) {
            console.log(`\n🔍 Checking ${project} in ${location}...`);
            try {
                const client = new GoogleGenAI({
                    project,
                    location,
                    vertexai: true,
                    apiVersion: "v1beta1"
                } as any);

                const response = await client.models.list();
                const count = response.models?.length || 0;
                console.log(`✅ [FOUND] ${count} models.`);
                
                if (count > 0) {
                    response.models?.slice(0, 5).forEach((m: any) => {
                        console.log(`  - ${m.name} (${m.modelId})`);
                    });
                }
            } catch (e: any) {
                console.log(`❌ [FAIL] ${e.message.split('\n')[0].substring(0, 100)}`);
            }
        }
    }
}

sweep();
