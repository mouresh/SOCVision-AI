# SOCVision AI — Deployment Guide

This document provides setup guidelines for deploying the SOCVision AI platform to production environments.

---

## 1. Database Deployment: PostgreSQL

SOCVision AI requires PostgreSQL v15+ to store core tables (alerts, incidents, caching, risk history).

### Cloud Providers
Recommend utilizing managed databases:
* **Supabase** (Postgres hosting with built-in connection pooling)
* **AWS RDS** (Highly available PostgreSQL instance)
* **Railway Database Add-on** (Easy single-project environment binding)

### DDL Initialization
Once the database instance is running, connect using your client tool (e.g. `psql` or pgAdmin) and run the `database/schema.sql` file to build the tables:

```bash
psql -h <DB_HOST> -p 5432 -U <DB_USER> -d <DB_NAME> -f database/schema.sql
```

---

## 2. Backend Deployment: Railway & Render

The backend is a Node.js Express server. It compiles TypeScript (`tsc`) and runs node on the generated Javascript (`dist/server.js`).

### Option A: Railway
1. Sign in to Railway and click **New Project** -> **GitHub Repo**.
2. Set the root directory of the backend component to `backend/`.
3. In **Settings** -> **Build & Deploy**, configure the Build Command and Start Command:
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
4. In **Variables**, add the required backend environment variables listed below.
5. Expose a public domain under **Networking** (Railway binds Express to the automatically supplied `PORT` variable).

### Option B: Render
1. Create a new **Web Service** on Render and connect the repository.
2. Configure settings:
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build` (set directory to `backend`)
   * **Start Command**: `node dist/server.js`
3. Add the backend environment variables under **Environment**.
4. Render will deploy and allocate an HTTPS endpoint (e.g., `https://socvision-api.onrender.com`).

---

## 3. Frontend Deployment: Vercel

The frontend is a TanStack Start / Next.js-compatible Vite application. It should be deployed as a static or SSR serverless application.

### Vercel Setup
1. Create a new project in Vercel and connect your Git repository.
2. Set the Root Directory to `frontend`.
3. Vercel automatically detects the Vite config.
4. Set the build command and output folder:
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist/client`
5. In **Environment Variables**, add the frontend configurations.
6. Click **Deploy**. Vercel will allocate a secure production domain.

---

## 4. Production Environment Variables Reference

### Backend Service Environment Variables (`backend/`)
Provide these variables in your hosting provider's panel (Railway/Render):

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables helmet CSP headers and turns off detailed stack traces |
| `PORT` | `8080` | Express listening port |
| `DB_HOST` | `<postgres-url>` | Database host endpoint |
| `DB_PORT` | `5432` | Database connection port |
| `DB_NAME` | `socvision` | Target database name |
| `DB_USER` | `postgres` | Database admin username |
| `DB_PASSWORD` | `<secure-pass>` | Database admin password |
| `DB_SSL` | `require` | Enforces SSL encryption for database queries |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Restricts API access to your deployed frontend domain |
| `SPLUNK_SIMULATION_MODE` | `false` | Bypasses local mocks; requires a live Splunk connection |
| `SPLUNK_HOST` | `<splunk-ip>` | Address of your central Splunk management node |
| `SPLUNK_PORT` | `8089` | Port for the Splunk Management API |
| `SPLUNK_USERNAME` | `admin` | Splunk API user |
| `SPLUNK_PASSWORD` | `<secure-pass>` | Splunk API password |
| `GEMINI_API_KEY` | `<google-key>` | Google Gemini API key |

### Frontend Application Environment Variables (`frontend/`)
Provide this variable in the Vercel variables panel:

| Variable | Deployed Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://your-backend.railway.app/api/v1` | URL mapping to the live backend API |

---

## 5. Splunk Configuration

To allow SOCVision AI to query events, Splunk must be configured as follows:
1. **Enable the REST API**: Confirm Splunk Management API listener is active on port `8089` (default).
2. **Access Control**: Create a service account in Splunk with the `user` or `admin` role, and map its username and password (or generate a Bearer Token) to the backend environment configurations.
3. **Firewall Access**: Ensure that port 8089 on the Splunk host accepts inbound HTTPS connections originating from the IP addresses of your deployed backend servers.
