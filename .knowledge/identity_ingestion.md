# Knowledge Item: Identity Ingestion (DocAI + Gemini Flash)

## Architectural Summary
The Identity Ingestion module uses a hybrid OCR/AI approach. It captures Government ID images (front/back) using WebRTC, processes them through the **Google Document AI Identity Processor**, and then normalizes/normalizes the extracted text using **Gemini 3.1 Flash (Vertex AI)**. This ensures that field values like addresses and names are cleaned for downstream business logic (like mobile surcharge calculations).

## Logic Implementation
- **`/intake/extract` (+server.ts)**: Validates image payloads and calls DocAI Client.
- **`src/lib/server/gemini.ts`**: The "Fuzzy Mapping" engine. It takes DocAI raw JSON and performs semantic normalization.
- **`ScanReview.svelte`**: A dedicated Svelte component that triggers if field-level confidence falls below 0.9. It highlights uncertain data for "one-tap" client correction.
- **`+page.svelte` (Step 1)**: Manages the camera state machine (front -> back -> extracting -> review -> done).

## Grounded Pitfalls
- **DocAI Confidence**: The Document AI `confidence` score is per-entity. We now aggregate these into a `fieldConfidences` map for the UI.
- **Device Orientation**: The WebRTC stream uses `facingMode: 'environment'`, which may fail on desktops without back cameras (simulation mode handles this).
- **Vertex AI Latency**: Gemini Flash is used asynchronously to prevent UI lag.

---
*Verified against OBT-1 and OBT-20 (2026-03-08)*
