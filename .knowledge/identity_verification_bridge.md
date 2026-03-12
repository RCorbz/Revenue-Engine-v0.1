# Knowledge Item: Hybrid Identity Verification (Barcode + OCR)

## Architectural Summary
The Identity Verification system now utilizes a "Hybrid Waterfall" approach to maximize accuracy and minimize hallucinations. The front of the ID is processed via Google Document AI with a Gemini 3.1 semantic normalization pass. The back of the ID is processed through a deterministic backend bridge using `pyzbar` and OpenCV in Python to decode the PDF417 barcode. Finally, a cross-verification layer compares the OCR data from the front with the decoded data from the back to provide a high-confidence match score.

## Logic Implementation
- `scripts/decode_barcode.py`: Python bridge using `pyzbar` for robust PDF417 decoding, bypassing LLM vision limitations.
- `src/lib/utils/aamva.ts`: Enhanced AAMVA parser that standardizes dates (YYYY-MM-DD) and maps comprehensive address fields.
- `src/lib/utils/compare.ts`: Semantic comparison utility that calculates a confidence score between front and back data.
- `src/routes/intake/extract/+server.ts`: Backend route that orchestrates the bridge execution for back-side images.
- `src/lib/components/Scanner.svelte`: Frontend component that manages the capture states and triggers cross-verification.
- `src/lib/components/ScanReview.svelte`: UI component that displays the "Match Score" and highlights data mismatches to the user.

## Grounded Pitfalls
- **Python Dependency**: The system requires Python 3.11+ with `pyzbar` and `opencv-python` installed to execute the backend bridge.
- **Base64 Overhead**: Large high-res images can increase latency; ensure `imageData` is correctly stripped of metadata prefixes before being passed to the bridge.
- **Standard Variations**: While AAMVA is standardized, some states use legacy delimiters; the parser uses fuzzy matching and date stabilization to handle these.
- **Worker Coordination**: Client-side `@zxing` remains as a non-blocking background attempt to provide instant results for clear documents.
