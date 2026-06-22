# SOCVision AI

SOCVision AI is a premium, AI-powered Security Operations Center (SOC) visualization, orchestration, and threat hunting platform. It serves as a unified glass pane integrating live SIEM/EDR logs (Splunk), automated playbooks (n8n webhooks), customized AI-guided analysis, and a local multi-factor risk-scoring engine to enable Tier 1-3 security analysts to detect, triage, and contain incidents efficiently.

---

## Features

1. **Executive Dashboard**: Unified operational view with live alerts counts, active incidents count, organizational risk gauge, 30-day average risk trends chart, and Top Attacking IPs from live logs.
2. **Alerts Triage Workbench**: Live SIEM stream supporting pagination, severity/status/source filtering, detailed drawer inspections, raw JSON events viewer, and AI analyst integration.
3. **Incident Management (Kanban)**: Drag-and-drop workflow tracking incidents grouped by status (Open, Investigating, Resolved, Closed). Features detailed drawers showing relative creation time, linked alerts, risk factors, and comments timelines.
4. **Threat Hunting Workbench**: Monospace security logs viewer with an interactive SPL (Search Processing Language) editor executing live queries against Splunk.
5. **AI Security Analyst**: Interactive chat assistant utilizing Gemini/GPT to generate executive summaries, risk explanations, recommended containment actions, and confidence ratings, utilizing a PostgreSQL cache.
6. **MITRE ATT&CK Mapping Heatmap**: Dynamic matrix grouping alert detections under standard enterprise threat tactics columns (Initial Access, Execution, Persistence, etc.), with heatmap colors scaling by threat volume.
7. **Executive Reporting & Downloads**: Custom reporting widgets with data visualization and one-click JSON/CSV logs downloader.

---

## Screenshot References

Visual walkthroughs and mockup screenshots of the operational panels can be found in the workspace artifacts directory:
* **Executive Dashboard**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\dashboard_live_screenshot_1782114128965.png`
* **Alerts Triage Workbench**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\alerts_page_live_screenshot_1782114596949.png`
* **Incident Kanban Board**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\incidents_page_live_screenshot_1782115703557.png`
* **Threat Hunting Workbench**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\threat_hunting_page_live_screenshot_1782116171434.png`
* **AI Security Analyst**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\ai_analyst_page_live_screenshot_1782116550210.png`
* **MITRE ATT&CK Matrix**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\mitre_page_live_screenshot_1782116838849.png`
* **Reports page & Export**: `C:\Users\mouri\.gemini\antigravity\brain\9b896b90-35df-4bcc-914c-17f73fd3e4e1\reports_page_live_screenshot_1782117289979.png`

---

## Technology Stack

* **Frontend**: Next.js / TanStack Start with Vite bundler, React, Lucide icons, Recharts, and TanStack Query (React Query) for state management and async data fetching.
* **Backend**: Node.js, TypeScript (`tsc`), Express, Axios, Helmet (security headers), Compression, and Zod (schema validation).
* **Database**: PostgreSQL (pg client) for alerts, incidents, comments, risk calculations, audit logs, and AI report caching.
* **Orchestration**: n8n webhook handlers for automated incident response.
* **External Integrations**: Live Splunk search endpoints.

---

## Folder Structure

```text
SOCVision-AI/
├── backend/                  # Node.js Express server
│   ├── src/
│   │   ├── config/           # Database, logger, and environment configs
│   │   ├── controllers/      # Route request/response controllers
│   │   ├── integrations/     # n8n webhook and orchestration scripts
│   │   ├── middleware/       # Rate limiting, validation, errors, and auth
│   │   ├── modules/          # Core features (alerts, incidents)
│   │   │   ├── alerts/       # Alerts schema, controller, routes, service
│   │   │   └── incidents/    # Incidents schema, controller, routes, service
│   │   ├── routes/           # Express API route bindings
│   │   ├── services/         # Core logic (AI analyst, Splunk integration, Risk Engine)
│   │   ├── types/            # Application type declarations
│   │   └── server.ts         # Backend entrypoint
│   ├── package.json
│   └── tsconfig.json         # TypeScript configuration
├── frontend/                 # TanStack Start / React UI
│   ├── src/
│   │   ├── components/       # Custom cards, badges, Sidebar, and Topbar
│   │   ├── hooks/            # TanStack Query custom query/mutation hooks
│   │   ├── routes/           # Page routes (index, alerts, incidents, threat-hunting, etc.)
│   │   ├── services/         # API HTTP fetch client
│   │   ├── types/            # Frontend global TS type overrides
│   │   └── start.ts          # Frontend entrypoint
│   ├── package.json
│   └── tsconfig.json
├── database/                 # SQL schemas, migrations, and seeds
│   └── schema.sql            # Master DDL script
├── docker-compose.yml        # Docker compose configuration
└── README.md
```

---

## Installation & Setup

### 1. Prerequisites
Ensure you have the following installed:
* Node.js (v20 or higher)
* PostgreSQL (v15 or higher)
* Splunk Enterprise (optional, unless running in live mode)

### 2. Environment Variables Configuration
Copy the `.env.example` file in the backend folder to `.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=socvision
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# API Settings
PORT=8080
API_PREFIX=/api
API_VERSION=v1
CORS_ORIGIN=http://localhost:8081
CORS_CREDENTIALS=true

# Splunk Settings
SPLUNK_HOST=localhost
SPLUNK_PORT=8089
SPLUNK_USERNAME=admin
SPLUNK_PASSWORD=your_password
SPLUNK_SIMULATION_MODE=false

# LLM / AI Configuration
GEMINI_API_KEY=your_key
AI_PROVIDER=gemini
AI_MODEL=gemini-1.5-flash
```

Copy the `.env.example` in the frontend folder to `.env`:
```bash
VITE_API_URL=http://localhost:8080/api/v1
```

### 3. Database Setup
1. Create a database in PostgreSQL:
   ```sql
   CREATE DATABASE socvision;
   ```
2. Apply the schema by importing `database/schema.sql`:
   ```bash
   psql -U postgres -d socvision -f database/schema.sql
   ```

### 4. Splunk Setup
1. Open the Splunk administration panel (`https://localhost:8089`).
2. Verify that the Splunk Management API is enabled on port 8089.
3. Configure the environment variables (`SPLUNK_HOST`, `SPLUNK_PORT`, `SPLUNK_USERNAME`, `SPLUNK_PASSWORD`) to allow backend access.

---

## Running the Application

### Running Backend (Dev Mode)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The server starts listening on `http://localhost:8080/api/v1`.*

### Running Frontend (Dev Mode)
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The dashboard becomes available at `http://localhost:8081`.*
