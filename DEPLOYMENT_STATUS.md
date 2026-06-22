# SOCVision AI Deployment Status

This document reports the live runtime connectivity status of all subsystems for SOCVision AI.

## Subsystem Status Summary

| Subsystem | Local Environment | Cloud Environment (Render/Vercel) | Status | Notes |
|---|---|---|---|---|
| **Frontend** | `PASS` | `PASS` | **PASS** | Deployed on Vercel; successfully queries backend APIs. |
| **Backend** | `PASS` | `PASS` | **PASS** | Deployed on Render; `/health` and `/ready` return operational. |
| **Database** | `PASS` | `PASS` | **PASS** | Neon PostgreSQL is connected, holds tables, and runs risk scoring. |
| **Splunk Connectivity** | `PASS` | `FAIL` | **PARTIAL** | Succeeds locally. Fails from Render cloud due to private LAN IP routing. |
| **Splunk Event Retrieval** | `PASS` | `FAIL` | **PARTIAL** | Pulls 20 events locally. Fails from Render cloud. |
| **Dashboard Data** | `PASS` | `PASS` | **PASS** | Fully dynamic; updates automatically from database tables. |

---

## Technical Details

### 1. Current Splunk Service Configuration
The exact runtime values loaded from `backend/.env` are:
* **`SPLUNK_URL`**: `https://192.168.1.12:8089`
* **`SPLUNK_HOST`**: `192.168.1.12`
* **`SPLUNK_PORT`**: `8089`
* **`SPLUNK_INDEX`**: `soc`

### 2. Actual Runtime Connectivity Test
Executing `GET /api/v1/splunk/events` locally on the workstation returns:
* **HTTP Status**: `200`
* **Events Count**: `20`
* **Target Network IP**: `192.168.1.12`

---

## Render Cloud Network Bridging Solutions

Because `192.168.1.12` is a private, non-routable IP address (RFC 1918), Render's public AWS/GCP data centers cannot connect to it directly. Below are production-ready solutions to bridge this connectivity gap.

### Solution A: Cloudflare Tunnel (Highly Recommended)
Expose the local Splunk management port securely without opening inbound ports on the LAN firewall.
1. Install the `cloudflared` daemon on the Windows VM hosting Splunk.
2. Run command to establish the tunnel:
   ```bash
   cloudflared tunnel create splunk-tunnel
   ```
3. Map the tunnel to a public hostname (e.g. `splunk-api.yourdomain.com`) forwarding to `https://localhost:8089`.
4. Update Render's environment variable:
   `SPLUNK_URL=https://splunk-api.yourdomain.com`

### Solution B: Tailscale VPN (Mesh network)
Add the Render server to the local private network securely.
1. Install Tailscale on the local Windows VM.
2. If deploying to Render via Docker, install Tailscale in the backend container entrypoint and connect it to your Tailnet.
3. Reference the Splunk instance using its permanent Tailscale IP (e.g., `100.x.y.z`).
4. Set:
   `SPLUNK_URL=https://100.x.y.z:8089`

### Solution C: Secure Public Reverse Proxy (NGINX + Basic Auth)
Expose a single external public IP forwarding port 8089 to the VM.
1. Place an NGINX reverse proxy in a DMZ with a public IP.
2. Direct port `8089` traffic from NGINX securely to `192.168.1.12:8089`.
3. Apply IP whitelist rules restricting access only to Render's outbound IP ranges.
