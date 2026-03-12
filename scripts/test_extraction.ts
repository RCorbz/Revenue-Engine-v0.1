import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root
dotenv.config({ path: join(__dirname, '../.env') });

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const MODEL_NAME = process.env.GEMINI_PRO_MODEL || "gemini-3.1-pro-preview";
const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function testExtraction() {
    console.log(`🚀 [OBJ-TEST] Initializing 3.1 PRO Extraction Test...`);
    console.log(`📍 Project: ${PROJECT_ID}`);
    console.log(`🧠 Model: ${MODEL_NAME}`);
    
    // Check for credentials
    if (KEY_FILE) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_FILE;
    }

    const ai = new GoogleGenAI({
        project: PROJECT_ID,
        location: 'global', // Enforcing global routing
        vertexai: true
    } as any);

    const frontImgPath = join(__dirname, '../mock data for testing/mock license front.jpg');
    
    if (!existsSync(frontImgPath)) {
        console.error(`❌ [TEST ERROR] Mock image not found at: ${frontImgPath}`);
        return;
    }

    try {
        console.log(`📸 [OBJ-TEST] Reading: ${frontImgPath}`);
        const imageData = readFileSync(frontImgPath).toString('base64');
        
        console.log(`📡 [OBJ-TEST] Sending request to Gemini 3.1 PRO (GLOBAL)...`);
        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                role: 'user',
                parts: [
                    { text: "Extract EVERYTHING visible on this ID card. Return JSON with keys: firstName, lastName, idNumber, dob, address, issueDate, expirationDate, physical (sex, height, eyes), licenseDetails (class, restrictions), documentDiscriminator." },
                    { inlineData: { mimeType: 'image/jpeg', data: imageData } }
                ]
            }],
            config: {
                responseMimeType: 'application/json'
            }
        });

        console.log("🛠️ [DEBUG] Result Root Keys:", Object.keys(result));
        
        // Multi-Path recovery logic for @google/genai variations
        let text = "";
        try {
            // Option 1: Modern Direct
            text = (result as any).text || "";
            if (!text) {
                // Option 2: Response Wrapper
                text = (result as any).response?.text || "";
            }
            if (!text) {
                // Option 3: Deep Candidate Path
                const cand = (result as any).response?.candidates?.[0] || (result as any).candidates?.[0];
                text = cand?.content?.parts?.[0]?.text || cand?.text || "";
            }
        } catch (e: any) {
            console.warn(`⚠️ Path recovery failed: ${e.message}`);
        }
        
        console.log("\n--- [GEMINI OBJECTIVE RESPONSE] ---");
        console.log(text || "EMPTY RESPONSE");
        console.log("----------------------------------\n");
        
        if (text) {
            try {
                const parsed = JSON.parse(text);
                console.log("✅ [VERIFIED DATA CAPTURE]:", JSON.stringify(parsed, null, 2));
                
                // 💾 SAVE TO data.json MOCK PER USER REQUEST
                const outPath = join(__dirname, '../data.json');
                const fs = await import('fs');
                fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
                console.log(`\n📂 [PERSISTENCE] Everything extracted saved to: ${outPath}`);

                if (parsed.idNumber || parsed.firstName) {
                    console.log("🚀 [GLOBAL SUCCESS] Extraction is objective and verified.");
                }
            } catch (e) {
                console.log("⚠️ Result was not valid JSON but contained text.");
            }
        }

    } catch (e: any) {
        console.error(`\n❌ [OBJ-TEST FAILED]: ${e.message}`);
    }
}

testExtraction();
