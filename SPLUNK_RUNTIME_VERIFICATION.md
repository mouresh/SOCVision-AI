# SOCVision AI Splunk Runtime Verification Report

This report presents verification evidence of the active connection to the local Splunk Enterprise instances.

## 1. Executed Verification Searches

A test run of specific security log searches on `index=soc` at `https://192.168.1.12:8089` returned the following event counts:

* **`index=soc`**: Success! Returned **5 events** (sample checked).
* **`index=soc EventCode=4624`**: Success! Returned **5 events** (sample checked).
* **`index=soc EventCode=4625`**: Success! Returned **5 events** (sample checked).
* **`index=soc EventCode=4740`**: Success! Returned **0 events** (no active lockouts).
* **`index=soc EventCode=4688`**: Success! Returned **5 events** (sample checked).
* **`index=soc earliest=-24h`**: Success! Returned **5 events** (sample checked).

---

## 2. Sample Ingested Splunk Security Log (JSON)

Here is a verified sample event extracted from the `GET /api/v1/splunk/events` endpoint:

```json
{
  "time": "2026-06-23T00:15:46.000+05:30",
  "raw": "06/22/2026 11:45:46.152 -0700\ncollection=\"Network Interface\"\nobject=\"Network Interface\"\ncounter=\"Bytes Sent/sec\"\ninstance=\"Intel[R] PRO_1000 MT Desktop Adapter _2\"\nValue=235.2349620895335",
  "host": "DESKTOP-UQMISCF",
  "source": "Perfmon:Network Interface",
  "sourcetype": "Perfmon:Network Interface",
  "eventCode": "unknown",
  "eventCodeDescription": "Unknown Windows Security Event",
  "user": "unknown",
  "fields": {
    "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
    "_cd": "1:462392",
    "_indextime": "1782154000",
    "_raw": "06/22/2026 11:45:46.152 -0700\ncollection=\"Network Interface\"\nobject=\"Network Interface\"\ncounter=\"Bytes Sent/sec\"\ninstance=\"Intel[R] PRO_1000 MT Desktop Adapter _2\"\nValue=235.2349620895335",
    "_serial": "0",
    "_si": [
      "Mouresh_Royal",
      "soc"
    ],
    "_sourcetype": "Perfmon:Network Interface",
    "_time": "2026-06-23T00:15:46.000+05:30",
    "host": "DESKTOP-UQMISCF",
    "index": "soc",
    "linecount": "6",
    "source": "Perfmon:Network Interface",
    "sourcetype": "Perfmon:Network Interface",
    "splunk_server": "Mouresh_Royal"
  }
}
```

---

## 3. Database Ingestion Status (Neon PostgreSQL)
Ingesting the Splunk events into the PostgreSQL database produces the following telemetry:
* **Alert Count**: **13 alerts** successfully parsed and loaded.
* **Risk Score Calculations**: **5 risk factors** mapped and persisted in `risk_scores`.
* **Incident Generations**: **5 high-severity incidents** automatically created (qualified by risk score $\ge 80$).
