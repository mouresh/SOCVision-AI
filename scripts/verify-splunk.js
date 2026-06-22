const path = require('path');
const fs = require('fs');

console.log("===================================================");
console.log("SOCVision AI Splunk Runtime Verification Script");
console.log("===================================================\n");

// Locate env file
const backendDir = path.join(__dirname, '..', 'backend');
const envPath = path.join(backendDir, '.env');

if (!fs.existsSync(envPath)) {
  console.error(`Error: Backend .env file not found at ${envPath}`);
  process.exit(1);
}

// Load env variables
const dotenv = require(path.join(backendDir, 'node_modules', 'dotenv'));
dotenv.config({ path: envPath });

const { initDatabase, query, closeDatabase } = require(path.join(backendDir, 'dist', 'config', 'database'));
const { SplunkService } = require(path.join(backendDir, 'dist', 'services', 'splunk', 'splunk.service'));

async function verify() {
  try {
    // 1. Database connection check
    console.log("Checking Neon PostgreSQL database connection...");
    await initDatabase();
    console.log("- Database connected successfully!\n");

    // 2. Splunk connection check
    console.log(`Checking Splunk Management API connection at ${process.env.SPLUNK_URL || 'https://localhost:8089'}...`);
    const splunkService = new SplunkService();
    const events = await splunkService.getRecentEvents(5);
    console.log("- Splunk connected successfully!");
    console.log(`- Retrieved ${events.length} security events from index ${process.env.SPLUNK_INDEX || 'soc'}.\n`);

    // 3. Database records check
    console.log("Checking database ingestion status...");
    const alertCountRes = await query('SELECT COUNT(*) FROM alerts');
    const incidentCountRes = await query('SELECT COUNT(*) FROM incidents');
    const riskCountRes = await query('SELECT COUNT(*) FROM risk_scores');
    console.log(`- Total Alerts in DB: ${alertCountRes.rows[0].count}`);
    console.log(`- Total Incidents in DB: ${incidentCountRes.rows[0].count}`);
    console.log(`- Total Risk Score Records in DB: ${riskCountRes.rows[0].count}\n`);

    console.log("STATUS: SUCCESS - All connections are verified operational.");
  } catch (err) {
    console.error("STATUS: FAILED - Connection error encountered:");
    console.error(err.message);
  } finally {
    try {
      await closeDatabase();
    } catch (_) {}
  }
}

verify();
