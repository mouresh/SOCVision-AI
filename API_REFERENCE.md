# SOCVision AI — API Reference

All requests must be prefixed with the base API URL: `http://localhost:8080/api/v1`.

Responses follow a standard JSON envelope format:
```json
{
  "success": true,
  "data": {},
  "meta": {},
  "timestamp": "2026-06-22T08:00:00.000Z",
  "requestId": "uuid"
}
```

---

## 1. Alerts Endpoints

### `GET /alerts`
Retrieves a paginated list of alerts.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | No | Page number (defaults to `1`) |
| `limit` | Integer | No | Results per page (defaults to `20`) |
| `source` | String | No | Filter by source (e.g. `splunk`, `wazuh`) |
| `severity` | String | No | Filter by severity (`info`, `low`, `medium`, `high`, `critical`) |
| `status` | String | No | Filter by status (`new`, `acknowledged`, `in_progress`, `resolved`) |
| `search` | String | No | Text search against titles or descriptions |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "fc6932d0-bb58-4237-b056-8621caaf9102",
      "externalId": "splunk-4625-win-prod-dc01",
      "title": "Splunk: An account failed to log on",
      "description": "Event Code 4625 detected on host win-prod-dc01. Source: WinEventLog:Security",
      "severity": "low",
      "status": "new",
      "source": "splunk",
      "sourceRuleId": "4625",
      "sourceRuleName": "An account failed to log on",
      "assetId": null,
      "agentId": null,
      "assignedTo": null,
      "riskScore": 30,
      "riskLevel": "LOW",
      "rawEvent": {
        "host": "win-prod-dc01",
        "EventCode": "4625",
        "IpAddress": "10.0.12.85",
        "TargetUserName": "administrator"
      },
      "enrichment": {},
      "tags": ["splunk", "event-4625"],
      "firedAt": "2026-06-22T08:00:00.000Z",
      "createdAt": "2026-06-22T08:00:05.000Z",
      "updatedAt": "2026-06-22T08:00:05.000Z"
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "count": 1
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-01"
}
```

---

### `GET /alerts/stats`
Retrieves count summaries grouped by severity and status.

#### Example Response
```json
{
  "success": true,
  "data": {
    "severity": {
      "info": 1,
      "low": 12,
      "medium": 5,
      "high": 3,
      "critical": 1
    },
    "status": {
      "new": 18,
      "acknowledged": 2,
      "in_progress": 1,
      "resolved": 1
    }
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-02"
}
```

---

## 2. Incidents Endpoints

### `GET /incidents`
Retrieves a list of all active incidents.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | String | No | Filter by status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`) |
| `severity` | String | No | Filter by severity (`info`, `low`, `medium`, `high`, `critical`) |
| `search` | String | No | Search text in title or description |
| `limit` | Integer | No | Max incidents to return (defaults to `100`) |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
      "incidentNumber": 1001,
      "title": "Failed MFA Challenge Spike",
      "description": "Detected spike in MFA failures from external IP address.",
      "severity": "high",
      "status": "INVESTIGATING",
      "priority": 2,
      "assignedAnalyst": "analyst1",
      "createdBy": "system",
      "assignedTeam": "SOC Tier 2",
      "metadata": {
        "alertIds": ["fc6932d0-bb58-4237-b056-8621caaf9102"]
      },
      "createdAt": "2026-06-22T06:00:00.000Z",
      "updatedAt": "2026-06-22T06:10:00.000Z"
    }
  ],
  "meta": {
    "limit": 100,
    "offset": 0,
    "count": 1
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-03"
}
```

---

### `GET /incidents/:id`
Retrieves complete details of an incident, including comments timelines and linked alert IDs list.

#### Example Response
```json
{
  "success": true,
  "data": {
    "incident": {
      "id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
      "incidentNumber": 1001,
      "title": "Failed MFA Challenge Spike",
      "description": "Detected spike in MFA failures from external IP address.",
      "severity": "high",
      "status": "INVESTIGATING",
      "priority": 2,
      "assignedAnalyst": "analyst1",
      "createdBy": "system",
      "assignedTeam": "SOC Tier 2",
      "metadata": {
        "alertIds": ["fc6932d0-bb58-4237-b056-8621caaf9102"]
      },
      "createdAt": "2026-06-22T06:00:00.000Z",
      "updatedAt": "2026-06-22T06:10:00.000Z"
    },
    "comments": [
      {
        "id": "5e822dac-a30c-48b8-b7c9-e98f070954fd",
        "incident_id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
        "author_id": "11111111-1111-1111-1111-111111111111",
        "body": "Analyzing failed MFA logs in Azure AD portal.",
        "is_internal": true,
        "created_at": "2026-06-22T06:05:00.000Z"
      }
    ],
    "alertIds": ["fc6932d0-bb58-4237-b056-8621caaf9102"]
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-04"
}
```

---

### `POST /incidents/:id/comment`
Creates a comment notes entry on an incident.

#### Request Body
```json
{
  "body": "Analyzing failed MFA logs in Azure AD portal.",
  "authorId": "11111111-1111-1111-1111-111111111111",
  "isInternal": true
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "5e822dac-a30c-48b8-b7c9-e98f070954fd",
    "incident_id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
    "author_id": "11111111-1111-1111-1111-111111111111",
    "body": "Analyzing failed MFA logs in Azure AD portal.",
    "is_internal": true,
    "created_at": "2026-06-22T06:05:00.000Z"
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-05"
}
```

---

## 3. Risk Engine Endpoints

### `GET /risk`
Retrieves the overall average risk score, level, and 30-day risk average trend list.

#### Example Response
```json
{
  "success": true,
  "data": {
    "overallRiskScore": 73,
    "riskLevel": "HIGH",
    "trend": [
      { "day": "D-29", "score": 68 },
      { "day": "D-28", "score": 70 },
      { "day": "D-0", "score": 73 }
    ]
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-06"
}
```

---

### `GET /risk/score/:alertId`
Retrieves computed risk score details and factored multipliers for a specific alert.

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "risk-score-uuid",
    "entity_type": "alert",
    "entity_id": "fc6932d0-bb58-4237-b056-8621caaf9102",
    "score": 30.00,
    "score_prev": null,
    "delta": 30.00,
    "factors": {
      "baseScore": 25,
      "userModifier": 1,
      "frequencyModifier": 1.2,
      "assetModifier": 1,
      "matchedEventId": "4625",
      "matchedUser": "administrator",
      "frequencyCount": 10,
      "matchedAssetType": "Domain Controller"
    },
    "model_version": "1.0",
    "computed_by": "system-risk-engine",
    "computed_at": "2026-06-22T08:00:00.000Z"
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-07"
}
```

---

## 4. Splunk Integration Endpoints

### `GET /splunk/events`
Executes searches against Splunk to retrieve security log events.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `query` | String | No | Raw SPL query text (defaults to `search index=*`) |
| `type` | String | No | Saved hunt type (`brute_force`, `privilege_escalation`, `powershell`, `recent`) |
| `limit` | Integer | No | Max logs to retrieve (defaults to `20`) |
| `offset` | Integer | No | Result offset (defaults to `0`) |

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "time": "2026-06-22T07:55:00.000Z",
      "raw": "Security: An account failed to log on. TargetUserName: administrator. Status: 0xC000006D.",
      "host": "win-prod-dc01",
      "source": "WinEventLog:Security",
      "sourcetype": "WinEventLog:Security",
      "eventCode": "4625",
      "eventCodeDescription": "An account failed to log on",
      "user": "administrator",
      "srcIp": "10.0.12.85",
      "fields": {
        "EventCode": "4625",
        "TargetUserName": "administrator",
        "IpAddress": "10.0.12.85",
        "host": "win-prod-dc01"
      }
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "count": 1
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-08"
}
```

---

## 5. AI Analyst Endpoints

### `GET /ai/analyze/:alertId`
Fetches a detailed AI-generated triage assessment. Returns instantly from local cache if a record exists.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `force` | Boolean | No | Pass `true` to force bypass cache and regenerate (defaults to `false`) |

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "alert_id": "fc6932d0-bb58-4237-b056-8621caaf9102",
    "incident_id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "executive_summary": "An alert titled 'Test Verification Alert: Suspicious Activity Detected' was triggered. The risk score was computed as 30.",
    "technical_analysis": "The analysis shows abnormal logon activity on win-prod-dc01 by administrator.",
    "mitre_explanation": "Corresponds to Credential Access.",
    "mitre_mappings": [
      {
        "attackType": "Credential Access",
        "techniqueId": "T1110",
        "techniqueName": "Brute Force"
      }
    ],
    "risk_explanation": "Low risk due to failed attempts originating from standard subnets.",
    "recommended_actions": [
      "Review logon attempts from source IP.",
      "Reset user password if lockout persists."
    ],
    "investigation_steps": [
      "Check firewall records for IP 10.0.12.85."
    ],
    "created_at": "2026-06-22T08:01:00.000Z",
    "updated_at": "2026-06-22T08:01:00.000Z"
  },
  "timestamp": "2026-06-22T08:05:00.000Z",
  "requestId": "req-09"
}
```
