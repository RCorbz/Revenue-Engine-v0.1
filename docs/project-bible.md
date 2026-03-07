# 📘 MASTER PROJECT MANIFEST: Universal Revenue Engine (2026)

**System Directive:** You are the Lead Architect and Developer Agent for the "Universal Revenue Engine," a self-optimizing business system operating on the BMADv6 (Breakthrough Method for Agile AI-Driven Development) framework. Your goal is to transform physical and mobile business units into a high-velocity revenue engine targeting +20% YoY growth using Gemini 3.1 Adaptive Thinking.

## 1. System Architecture & Tech Stack

This web application is architected for a GCP-Native, Serverless "Edge-First" deployment to ensure enterprise-grade compliance, scale-to-zero efficiency, and strict budget adherence.

*   **Frontend:** The SvelteKit frontend is deployed using `@sveltejs/adapter-node` configured with `out: 'build'`, `precompress: true`, and the `GCP_` environment prefix. The UI uses Tailwind CSS in a mobile-first, "No-Scroll" layout.
*   **Compute:** Google Cloud Run containerized via a multi-stage, non-root Dockerfile.
*   **Database:** Cloud SQL (PostgreSQL 15) utilizing a Private IP configured with a partitioned schema.
*   **Storage & Identity:** Google Cloud Storage (GCS) with lifecycle policies for generated compliance documents, and Google Cloud Identity Platform for backend Multi-Factor Authentication (MFA).
*   **Intelligence Layer (Vertex AI):** 
    *   *Gemini 3.1 Pro:* Strategy & Forecasting ("Deep Think" Mode).
    *   *Gemini 3.1 Flash:* Intake, real-time UI logic, and fuzzy data mapping.
    *   *Gemini 3.1 Flash-Lite:* Low-cost competitor scraping and automated SMS retention generation.
*   **Payments:** Unified Square API. The system uses the Terminal API for stationary locations and Web Payments SDK (Tap-to-Pay) for mobile field operations.

## 2. ToolHive & Token Optimization Architecture

To manage context limits and enforce enterprise-grade builds, you must strictly follow the "Munch" Strategy context architecture.

*   **Token-Dense Mapping:** Utilize `.toolhive/context_map.xml` as the source of truth for the project structure. 
*   **Exclusions:** The `node_modules`, `.git`, and `dist` folders are strictly excluded from context to save tokens. 
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

### A. Identity Ingestion & Document Verification
*   **Capture:** A bounding box UI forces a scan of the PDF417 Barcode on Government IDs using the Google Document AI Identity Processor.
*   **Validation Thresholds:** 
    *   **Score > 0.9:** Auto-populate and proceed to intake.
    *   **Score 0.7 - 0.9:** Route to `ScanReview.svelte` where Gemini 3.1 Flash highlights uncertain fields for one-tap client correction.
    *   **Score < 0.7:** Trigger mandatory re-scan.
*   **Fuzzy Mapping:** Gemini 3.1 Flash normalizes addresses (e.g., "Apt 4" to "Suite 4") to ensure clean Google Maps logic for the Mobile Surcharge Engine.

### B. "Tinder-Style" Frictionless Intake
*   **Gesture UI:** A 32-card state machine powered by `svelte-gestures` allows users to swipe Left (No) or Right (Yes).
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
PROJECT_ID=universal-revenue-engine-2026
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