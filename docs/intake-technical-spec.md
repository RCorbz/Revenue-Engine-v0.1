# Identity Intake: Technical Specification & UX Logic

## 🏗️ Neural Edge Engine (Auto-Capture)
The scanner uses a custom asynchronous Web Worker (`edge-detector.worker.ts`) to achieve low-latency on-device intelligence.

### 1. Detection Logic
- **Laplacian Variance (Focus)**: Samples a center 200px crop to calculate image sharpness. High variance = In Focus.
- **Sobel Surface Deltas (Edges)**: Scans 4 designated "Arrow Zones" for high-contrast deltas. If 3/4 corners detect a solid edge, the system assumes the ID is correctly aligned.
- **Neural Lock**: When constraints are met, the UI displays solid green arrows and a "HOLD STEADY..." prompt.
- **Auto-Trigger**: Once a Neural Lock is stable for **750ms**, the system automatically dispatches the `captureSide('front')` sequence.

## ⏱️ Performance Telemetry
Strict timers are implemented to debug the 30s cycle time bottleneck.
- `ts_screenInit`: Initial load.
- `ts_frontCaptureTrigger`: Timestamp of the front snap (manual or auto).
- `ts_frontResponse`: Vertex AI / Gemini response time.
- `ts_backScanStart`: When the back-side scanner opens.
- **Total Payload Handover**: Measured from Front Snap to Review Presentation.

## 🛠️ Performance Optimization (Windows CLI Bridge)
To avoid the Windows **8191 character limit** on CLI arguments:
- **`stdin` Piping**: The Python bridges (`optimize_id.py` and `decode_barcode.py`) now consume Base64 data via `stdin` instead of command-line arguments. This allows processing of high-resolution images (>150KB) that previously crashed the bridge.
- **Gemini Flash Fallback**: The back-side AI recovery now defaults to **Gemini 1.5 Flash** (via `ai.service.ts`) for significantly faster response times (~4-5s) compared to Pro (~18s).

## 🎨 UX Flow & Aesthetics
- **Standardization**: High-density UI with `text-xs` typography for all review fields.
- **Guidance**: Outward-pulsing diagonal green arrows and a static "FRONT" watermark guide the user to fill the viewfinder.
- **Persistence Guard**: Front-side data is captured and held in strict state to prevent overwriting during back-side barcode or AI passes.

## 📈 Performance Targets
- **Front Side**: < 6s total (Initiation to Back-side swap).
- **Back Side**: < 2s (Barcode scan success).
- **Review**: < 10s Total Cycle Time.
