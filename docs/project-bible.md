# 📘 MASTER PROJECT MANIFEST: Universal Revenue Engine (2026)

**System Directive:** You are the Lead Architect and Developer Agent for the "Universal Revenue Engine," a self-optimizing business system operating on the BMADv6 (Breakthrough Method for Agile AI-Driven Development) framework. Your goal is to transform physical and mobile business units into a high-velocity revenue engine targeting +20% YoY growth using Gemini 3.1 Adaptive Thinking.

## 1. System Architecture & Tech Stack

This web application is architected for a GCP-Native, Serverless "Edge-First" deployment to ensure enterprise-grade compliance, scale-to-zero efficiency, and strict budget adherence.

*   **Frontend:** The SvelteKit frontend is deployed using `@sveltejs/adapter-node` configured with `out: 'build'`, `precompress: true`, and the `GCP_` environment prefix. The UI uses Tailwind CSS in a **mobile-first, thumb-driven "No-Scroll" layout**. All forms must utilize thumb-friendly UI bindings (sliders, dials) rather than keyboard text inputs for numerical data. 
    *   **Strict No-Scroll:** Forms exceeding height limits must be chunked into progressive disclosure sections (e.g., Scan -> Vitals -> History).
    *   **3-State Interactions:** Binary/Checklist questions MUST default to an 'Unset' state (e.g., a centered `?`). Users must explicitly swipe left (Fail/No) or swipe right (Pass/Yes) to prevent accidental submissions.
    *   **Swipe-to-Submit:** Destructive or final actions must use horizontal swipe interactions to confirm intent.
*   **Compute:** Google Cloud Run containerized via a multi-stage, non-root Dockerfile.
*   **Database:** Cloud SQL (PostgreSQL 15) utilizing a Private IP configured with a partitioned schema.
*   **Storage & Identity:** Google Cloud Storage (GCS) with lifecycle policies for generated compliance documents, and Google Cloud Identity Platform for backend Multi-Factor Authentication (MFA).
*   **Intelligence Layer (Vertex AI):** 
    *   *Gemini 3.1 Pro:* Strategy & Forecasting ("Deep Think" Mode).
    *   *Gemini 3.1 Flash:* Intake, real-time UI logic, and fuzzy data mapping.
    *   *Gemini 3.1 Flash-Lite:* Low-cost competitor scraping and automated SMS retention generation.
*   **Payments:** Unified Square API. The system uses the Terminal API for stationary locations and Web Payments SDK (Tap-to-Pay) for mobile field operations.

## 2. ToolHive & Token Optimization Architecture (The Munch Strategy)

To manage context limits and enforce enterprise-grade builds, you must strictly follow the "Munch" Strategy context architecture using `jcodemunch-mcp`.

*   **Token-Dense Mapping:** Utilize `.toolhive/context_map.xml` as the source of truth for the project structure. 
*   **Symbol Extraction:** Use `jcodemunch-mcp` for AST-based symbol retrieval (classes, functions, methods) to avoid reading entire large files.
*   **Exclusions:** The `node_modules`, `.git`, and `build` (or `dist`) folders are strictly excluded from context to save tokens via ToolHive's `Hard Excluded` strategy. 
*   **Symbol-Only Operations:** All deep code analysis must first use `jcodemunch.outline_file` for structural awareness, followed by `jcodemunch.get_symbol` for specific logic retrieval. Reading >100 lines of contiguous implementation code is prohibited unless no AST symbols exist for that file.
*   **Grounded Access:** The `bible-server` (filesystem MCP) provides read-only access to `/projects/project-bible.pdf`.
*   **Optimization Flow:** The build sequence relies on `thv run filesystem` to mount the Bible, followed by `thv client register` for real-time IDE file syncing. 
*   **Caching:** Complex snippets (e.g., encryption utilities) must be cached in ToolHive's persistent secret manager to preserve tokens.

## 3. Data Architecture & Enterprise Security

*   **VPC-Locked Database:** Cloud SQL connects via a Serverless VPC Access connector (`10.8.0.0/28` range) to guarantee sensitive client data never touches the public internet. 
*   **Schema Isolation (OBT-11 & OBT-07):** SQL migrations must separate the `secure_vault` schema (handling PII) from `app_public` schemas (handling transactions). 
*   **Immutable Audits (OBT-18):** Every write or update to the `secure_vault` must generate a hash-linked, undeletable entry in `app_public.audit_logs`, enforced by PostgreSQL triggers.
*   **Least-Privilege Container:** The Docker deployment must create and use a restricted `nodejs` user group so the application never runs as root.
*   **Application-Layer Encryption:** A security utility enforces manual AES-256-GCM encryption of sensitive data (like SSNs and DOBs) and masking of PII before SQL injection.

## 4. The Core Functional Modules

### A. Identity Ingestion & Document Verification (Hybrid Waterfall)
*   **Phase 1: High-Fidelity Capture (Frontend):** 
    *   Targets 1920x1080 resolution with on-device pre-processing (`brightness(1.1)`, `contrast(1.1)`) to maximize OCR success in low-light environments.
    *   **The Waterfall Logic:** 
        1. **Edge Decoder (0-8s):** Dedicated Web Worker (`barcode.worker.ts`) attempts real-time PDF417 decoding on the client side using a "Sweet Spot" bounding zone.
        2. **Cloud Fallback (>8s):** If edge decoding fails, the system automatically captures a high-res full frame and routes it to the **Google Document AI Identity Processor**.
*   **Phase 2: Neural Grounding (Backend):**
    *   **DocAI Integration:** Extracts structural entities (Name, DOB, ID Number) and analyzes fraud signals (OBT-15).
    *   **Gemini 3.1 Flash (Adaptive Thinking):** Performs "Fuzzy Mapping" and semantic normalization on the DocAI result. It cleans addresses and standardizes formats (e.g., `YYYY-MM-DD`).
*   **Strategic Mandate (Edge Excellence):** The Local Edge Decoder must meet or exceed the performance benchmarks of the **Scanbot SDK**. This is critical for:
    *   **UI/UX Friction Reduction:** Eliminating the "Network Wait" for the 80% of users with clear documents.
    *   **Cost Optimization:** Reducing recurring Vertex AI/DocAI API overhead by handling valid high-density PDF417 barcodes locally.
    *   **Commercial Parity:** Implementing Scanbot-level "Sweet Spot" bounding and high-frequency decoding inside a non-blocking Web Worker.
    *   **Confidence Routing:** 
        *   **Score > 0.9:** Auto-populate and proceed.
        *   **Score 0.7 - 0.9:** Highlights uncertain fields in `ScanReview.svelte` for one-tap correction.
        *   **Score < 0.7:** Mandatory re-scan.
    *   **Interactive Confirmation:** Uses a dual-action slider: Swipe Right (Verify/Confirm) or Swipe Left (Manual Failover).

### B. "Tinder-Style" Frictionless Intake
*   **Gesture UI:** A 32-card state machine powered by `svelte-gestures` allows users to swipe Left (No) or Right (Yes). **Strict Rule**: Forms must present *only one question at a time* to prevent vertical scrolling. As a card is swiped, it must animate out and the next card animates in.
*   **Failure Prompts:** If a user swipes Left (Fail/No), the state machine must pause and display a 3-button modal/prompt capturing the *reason* for the failure (e.g., "Prior Condition", "Current Issue", "Other") before allowing progression.
*   **Smart-Fill:** A Right-Swipe immediately triggers Gemini 3.1 Flash to fetch the most likely specific compliance details (e.g., common field notes or item lists), allowing zero-typing selection.
*   **Red Flags:** Business-tunable "Hard Stops" intercept disqualifying conditions automatically.

### C. The "3 Rs" Back-Office Dashboard
*   **Revenue:** Tracks Average Order Value (AOV) and provides the 30-day velocity forecast against the +20% target. The Gemini 3.1 Pro "Deep Think" engine evaluates the equation: $R_{run} = (B_{confirmed} \times AOV) + \left[ (C_{4w} \times AOV) \times \left( \frac{D_{remaining}}{7} \right) \times P_{util} \right]$.
*   **Retention:** Highlights expiring contracts. Connects to `retention-agent.ts` where Gemini 3.1 Flash-Lite drafts personalized 160-character SMS nudges referencing past reviews and competitor vulnerabilities.
*   **Reputation:** Automated sentiment analysis tracking competitor gaps.

### D. Multi-Tenant Payments & Surcharges
*   **Surcharge Engine:** For mobile profiles, calculates distance past a base 20-mile radius at $2.50/mile, mathematically rounded to $10 increments (OBT-4).
*   **Dynamic Rail Switcher:** The `isMobile` flag routes stationary traffic to the Square Terminal API, and mobile traffic to the Square Web Payments SDK (Tap-to-Pay) (OBT-10).

## 5. Outcomes-Based Testing (OBT) Suite

The IDE must not consider any module "Done" until its associated OBT passes 100%.

| ID | Title | Success Metric / Threshold |
| :--- | :--- | :--- |
| **OBT-1** | **The Friction Test** | Scan-to-signature < 120s; Barcode extraction < 4s. |
| **OBT-2** | **AOV Lift Test** | +15% AOV; mid-tier anchored visually on mobile above the fold. |
| **OBT-3** | **Red-Flag Safety** | 100% intercept of "Hard Stop" conditions before booking. |
| **OBT-4** | **Surcharge Logic** | Mileage calculation mapped/rounded to **$10 increments**. |
| **OBT-5** | **Deep Think Briefing** | Gemini 3.1 Pro returns structured JSON revenue gap analysis. |
| **OBT-6** | **Latency Test** | Swipe-to-card transitions < 100ms. |
| **OBT-7** | **Data Isolation** | Zero access path from Marketing API to secure Cloud SQL tables. |
| **OBT-8** | **Budget Efficiency** | Monthly API run-cost < $45 for active operations. |
| **OBT-9** | **Competitor Pivot** | Agent identifies rival negative reviews & suggests LP variants. |
| **OBT-10** | **Payment Rail Auto-Detect** | Dynamic routing: Square Terminal (Stationary) vs Tap-to-Pay (Mobile). |
| **OBT-11** | **Scale-to-Zero Isolation** | Build < 3m; Cold boot < 1.5s; VPC Connector for secure Cloud SQL. |
| **OBT-12** | **Mobile Context** | Forecast logic accounts for travel time/surcharge revenue. |
| **OBT-13** | **AOV Attribution** | Dashboard correctly attributes premium add-on upsells to DB. |
| **OBT-14** | **SMS Segment** | < 160 chars; personalized; cost < $0.50 per 1,000. |
| **OBT-15** | **Compliance Check** | Identify expired/non-compliant client IDs; block payment intents. |
| **OBT-16** | **Forecast Accuracy** | Auto-adjust baseline volume variables; flag revenue drops within 48h. |
| **OBT-17** | **Growth Trajectory** | If run-rate < target, prioritize "Revenue Action" over "Reputation". |
| **OBT-18** | **Immutable Audit Trail** | Log entries for sensitive data access must be hash-linked and undeletable. |
| **OBT-19** | **Clock-Skew Integrity** | System blocks transactions if server-to-client clock drift > 5s. |
| **OBT-20** | **Correction Efficiency** | Gemini 3.1 Flash enables client correction of OCR uncertainties in < 10s. |
| **OBT-21** | **Breach Perimeter** | Alerting triggers within < 60s of unauthorized schema access attempts. |
| **OBT-22** | **The Revenue Win** | End-to-End "First Customer" Playwright test populates Dashboard immediately. |
| **OBT-23** | **Retention Purge** | Automated script to scrub PII exactly at the end of compliance lifecycle. |
| **OBT-24** | **Security Guardrail** | System rejects all 3rd-party webhooks lacking a verified enterprise token. |
| **OBT-25** | **De-ID Research Export** | One-click export strips 18 identifiers for safe analytics. |

## 6. Pre-Flight Configuration Suite

The IDE must configure the following core files to establish guardrails.

**1. `package.json` (Tech-Stack Lock):**
```json
{
  "name": "universal-revenue-engine",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "test:obt": "playwright test"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.0.0",
    "@sveltejs/kit": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "@playwright/test": "^1.40.0"
  },
  "dependencies": {
    "@google-cloud/documentai": "^3.0.0",
    "@google-cloud/vertexai": "^1.0.0",
    "square": "^31.0.0",
    "pdf-lib": "^1.17.1",
    "svelte-gestures": "^1.5.0",
    "pg": "^8.11.0"
  }
}
2. .env.example (Secret Guardrail):
# REVENUE ENGINE CORE
PROJECT_ID=revenue-engine-v01
DATABASE_URL=postgresql://localhost:5432/revenue_engine

# AI MODELS (Vertex AI)
GEMINI_PRO_MODEL=gemini-3.1-pro
GEMINI_FLASH_MODEL=gemini-3.1-flash

# BUSINESS METRICS (BMADv6)
AOV_TARGET=125
GROWTH_GOAL_PERCENT=20
MOBILE_BASE_RADIUS_MILES=20
SURCHARGE_PER_MILE=2.50

# PAYMENTS
SQUARE_ENVIRONMENT=sandbox
3. src/lib/utils/security.ts (Compliance Guard):
// Enterprise Security Helper
export const encryptSensitiveData = (data: string) => {
  // Logic for AES-256-GCM encryption before SQL injection
  return `ENC_${data}`; 
};

export const maskPII = (name: string) => {
  return name.charAt(0) + "***" + name.charAt(name.length - 1);
};

---

## 7. Identity Intake: Extraction Architecture & OBT Status

### The Hybrid Waterfall Logic Matrix
| Mechanism | Role | Target | Technology |
| :--- | :--- | :--- | :--- |
| **Edge Worker** | Primary (Speed) | Back (Barcode) | `@zxing/library` (PDF417) |
| **Document AI** | Fallback (Power) | Front/Back (OCR) | `Identity Processor` |
| **Gemini 3.1 Flash** | Normalizer | Semantics | `normalizeIdentityData` |

### QA Testing Matrix (TC-01 to TC-07)
| Test ID | Scenario | Status | Implementation Reference |
| :--- | :--- | :--- | :--- |
| **TC-01** | Ideal Edge Scan (Decodes < 2s) | 🟢 DONE | `barcode.worker.ts`, `Scanner.svelte` |
| **TC-02** | Live Guidance UI (4s Prompt) | 🟢 DONE | `Scanner.svelte:L182` ("MOVE BARCODE CLOSER") |
| **TC-03** | Cloud Fallback Trigger (8s) | 🟢 DONE | `Scanner.svelte:L165` (`elapsed > 8000`) |
| **TC-04** | AI Normalization (Post-OCR) | 🟢 DONE | `gemini.ts` (Adaptive Pass) |
| **TC-05** | Image Pre-processing | 🟢 DONE | `Scanner.svelte:L189` (`preprocessImage`) |
| **TC-06** | AAMVA Data Integrity | 🟢 DONE | `aamva.ts` (Parsed Regex mapping) |

### Active OBT Progress Tracking
| OBT-ID | Description | Status | Verification Path |
| :--- | :--- | :--- | :--- |
| **OBT-1** | Scan-to-signature < 120s | 🟡 60% | Waterfall active; Cloud grounding validated. |
| **OBT-15** | Compliance Check (Expired IDs) | 🟢 100% | `aamva.ts` + DocAI Fraud Signal map. |
| **OBT-20** | Correction Efficiency | 🟡 80% | `ScanReview.svelte` integrated with `fieldConfidences`. |