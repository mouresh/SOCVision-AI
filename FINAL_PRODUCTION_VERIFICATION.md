# FINAL PRODUCTION VERIFICATION

This document certifies that all remaining production features of **SOCVision AI** have been successfully implemented, built, and verified end-to-end at runtime with live Splunk Enterprise data.

## Runtime Pipeline Metrics

| Metric | Count / Status | Source / Verification Method |
| :--- | :--- | :--- |
| **Splunk Event Count** | `35,906` events (last 24h) | Live Splunk Search (`index=soc`) |
| **Alerts Ingested** | `906` | PostgreSQL `alerts` table |
| **Incidents Active/Total** | `4` | PostgreSQL `incidents` table |
| **MITRE Mappings** | `904` | PostgreSQL `alert_mitre_mapping` table |
| **AI Analyst Reviews** | `45` | PostgreSQL `ai_analysis` table |
| **Email Test Result** | `SUCCESS` | `POST /api/v1/email/test` |
| **PDF Generation Test** | `SUCCESS` | `POST /api/v1/reports/generate` |
| **Build Status** | `SUCCESS` | `npm run build` |
| **Typecheck Status** | `SUCCESS` | `npm run typecheck` |

---

## Test Verification Details

### 1. Email Notification Test Result
```json
{
  "success": true,
  "message": "Test email delivered successfully."
}
```

### 2. PDF Report Generation Test
A daily summary security PDF report was successfully compiled and generated on the local filesystem:
- **Location:** `C:\Users\mouri\OneDrive\Tài liệu\SOCVision-AI\backend\reports\socvision-daily-2026-06-23T03-16-44.pdf`
- **Details:** Contains summary statistics, alert volumes, Top Affected Hosts, top event codes, and MITRE techniques coverage.

---

## Dashboard API Payload (`GET /api/v1/splunk/dashboard`)

```json
{
  "success": true,
  "data": {
    "totalAlerts": 906,
    "activeIncidents": 3,
    "riskScore": 92,
    "riskLevel": "CRITICAL",
    "mttr": "0m",
    "alertVolume": [
      {
        "hour": "2026-06-22T08:30:00.000+05:30",
        "count": 1145
      },
      {
        "hour": "2026-06-22T09:30:00.000+05:30",
        "count": 2643
      },
      {
        "hour": "2026-06-22T10:30:00.000+05:30",
        "count": 2666
      },
      {
        "hour": "2026-06-22T11:30:00.000+05:30",
        "count": 58
      },
      {
        "hour": "2026-06-22T12:30:00.000+05:30",
        "count": 2534
      },
      {
        "hour": "2026-06-22T13:30:00.000+05:30",
        "count": 2652
      },
      {
        "hour": "2026-06-22T14:30:00.000+05:30",
        "count": 2407
      },
      {
        "hour": "2026-06-22T15:30:00.000+05:30",
        "count": 257
      },
      {
        "hour": "2026-06-22T16:30:00.000+05:30",
        "count": 11
      },
      {
        "hour": "2026-06-22T17:30:00.000+05:30",
        "count": 1257
      },
      {
        "hour": "2026-06-22T18:30:00.000+05:30",
        "count": 2770
      },
      {
        "hour": "2026-06-22T19:30:00.000+05:30",
        "count": 2142
      },
      {
        "hour": "2026-06-22T20:30:00.000+05:30",
        "count": 2444
      },
      {
        "hour": "2026-06-22T21:30:00.000+05:30",
        "count": 2393
      },
      {
        "hour": "2026-06-22T22:30:00.000+05:30",
        "count": 2451
      },
      {
        "hour": "2026-06-22T23:30:00.000+05:30",
        "count": 2398
      },
      {
        "hour": "2026-06-23T00:30:00.000+05:30",
        "count": 2355
      },
      {
        "hour": "2026-06-23T01:30:00.000+05:30",
        "count": 751
      },
      {
        "hour": "2026-06-23T07:30:00.000+05:30",
        "count": 1781
      },
      {
        "hour": "2026-06-23T08:30:00.000+05:30",
        "count": 815
      }
    ],
    "topAttackingIps": [],
    "liveAlertStream": [
      {
        "time": "2026-06-23T08:46:37.000+05:30",
        "raw": "06/22/2026 08:16:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35905\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xa04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xa04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:567300",
          "_indextime": "1782184598",
          "_pre_msg": "06/22/2026 08:16:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35905\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35905\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xa04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "0",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:37.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:35.000+05:30",
        "raw": "06/22/2026 08:16:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35904\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1414\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1414\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:567196",
          "_indextime": "1782184596",
          "_pre_msg": "06/22/2026 08:16:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35904\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35904\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1414\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "1",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:35.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:34.000+05:30",
        "raw": "06/22/2026 08:16:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35903\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xb04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xb04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:567135",
          "_indextime": "1782184595",
          "_pre_msg": "06/22/2026 08:16:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35903\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35903\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xb04\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "2",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:34.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:32.000+05:30",
        "raw": "06/22/2026 08:16:32 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35902\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x7cc\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-admon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x7cc\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-admon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:567074",
          "_indextime": "1782184593",
          "_pre_msg": "06/22/2026 08:16:32 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35902\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:32 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35902\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x7cc\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-admon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "3",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:32.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:31.000+05:30",
        "raw": "06/22/2026 08:16:31 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35901\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xc08\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-netmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xc08\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-netmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:567013",
          "_indextime": "1782184592",
          "_pre_msg": "06/22/2026 08:16:31 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35901\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:31 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35901\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0xc08\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-netmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "4",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:31.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:30.000+05:30",
        "raw": "06/22/2026 08:16:30 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35900\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1460\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-MonitorNoHandle.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1460\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-MonitorNoHandle.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:566952",
          "_indextime": "1782184592",
          "_pre_msg": "06/22/2026 08:16:30 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35900\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:30 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35900\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1460\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-MonitorNoHandle.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "5",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:30.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:46:09.000+05:30",
        "raw": "06/22/2026 08:16:09 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35899\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-5-19\r\n\tAccount Name:\t\tLOCAL SERVICE\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3E5\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x4c0\r\n\tNew Process Name:\tC:\\Windows\\System32\\svchost.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0x2c8\r\n\tCreator Process Name:\tC:\\Windows\\System32\\services.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-5-19\r\n\tAccount Name:\t\tLOCAL SERVICE\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3E5\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x4c0\r\n\tNew Process Name:\tC:\\Windows\\System32\\svchost.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0x2c8\r\n\tCreator Process Name:\tC:\\Windows\\System32\\services.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:566806",
          "_indextime": "1782184570",
          "_pre_msg": "06/22/2026 08:16:09 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35899\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:16:09 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35899\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-5-19\r\n\tAccount Name:\t\tLOCAL SERVICE\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3E5\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x4c0\r\n\tNew Process Name:\tC:\\Windows\\System32\\svchost.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0x2c8\r\n\tCreator Process Name:\tC:\\Windows\\System32\\services.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "6",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:46:09.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:45:37.000+05:30",
        "raw": "06/22/2026 08:15:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35898\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1650\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1650\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:566606",
          "_indextime": "1782184538",
          "_pre_msg": "06/22/2026 08:15:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35898\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:15:37 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35898\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1650\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-regmon.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "7",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:45:37.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:45:35.000+05:30",
        "raw": "06/22/2026 08:15:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35897\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1094\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1094\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:566502",
          "_indextime": "1782184536",
          "_pre_msg": "06/22/2026 08:15:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35897\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:15:35 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35897\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1094\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "8",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:45:35.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      },
      {
        "time": "2026-06-23T08:45:34.000+05:30",
        "raw": "06/22/2026 08:15:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35896\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1528\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
        "host": "DESKTOP-UQMISCF",
        "source": "WinEventLog:Security",
        "sourcetype": "WinEventLog:Security",
        "eventCode": "4688",
        "eventCodeDescription": "A new process has been created",
        "user": "unknown",
        "fields": {
          "EventCode": "4688",
          "Message": "A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1528\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_bkt": "soc~1~305F7FD5-D924-4706-AA2C-5FA7F66B0797",
          "_cd": "1:566441",
          "_indextime": "1782184535",
          "_pre_msg": "06/22/2026 08:15:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35896\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info",
          "_raw": "06/22/2026 08:15:34 PM\nLogName=Security\nEventCode=4688\nEventType=0\nComputerName=DESKTOP-UQMISCF\nSourceName=Microsoft Windows security auditing.\nType=Information\nRecordNumber=35896\nKeywords=Audit Success\nTaskCategory=Process Creation\nOpCode=Info\nMessage=A new process has been created.\r\n\r\nCreator Subject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tDESKTOP-UQMISCF$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\r\nTarget Subject:\r\n\tSecurity ID:\t\tS-1-0-0\r\n\tAccount Name:\t\t-\r\n\tAccount Domain:\t\t-\r\n\tLogon ID:\t\t0x0\r\n\r\nProcess Information:\r\n\tNew Process ID:\t\t0x1528\r\n\tNew Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunk-powershell.exe\r\n\tToken Elevation Type:\t%%1936\r\n\tMandatory Label:\t\tS-1-16-16384\r\n\tCreator Process ID:\t0xe08\r\n\tCreator Process Name:\tC:\\Program Files\\SplunkUniversalForwarder\\bin\\splunkd.exe\r\n\tProcess Command Line:\t\r\n\r\nToken Elevation Type indicates the type of token that was assigned to the new process in accordance with User Account Control policy.\r\n\r\nType 1 is a full token with no privileges removed or groups disabled.  A full token is only used if User Account Control is disabled or if the user is the built-in Administrator account or a service account.\r\n\r\nType 2 is an elevated token with no privileges removed or groups disabled.  An elevated token is used when User Account Control is enabled and the user chooses to start the program using Run as administrator.  An elevated token is also used when an application is configured to always require administrative privilege or to always require maximum privilege, and the user is a member of the Administrators group.\r\n\r\nType 3 is a limited token with administrative privileges removed and administrative groups disabled.  The limited token is used when User Account Control is enabled, the application does not require administrative privilege, and the user does not choose to start the program using Run as administrator.",
          "_serial": "9",
          "_si": [
            "Mouresh_Royal",
            "soc"
          ],
          "_sourcetype": "WinEventLog:Security",
          "_time": "2026-06-23T08:45:34.000+05:30",
          "host": "DESKTOP-UQMISCF",
          "index": "soc",
          "linecount": "41",
          "source": "WinEventLog:Security",
          "sourcetype": "WinEventLog:Security",
          "splunk_server": "Mouresh_Royal"
        }
      }
    ],
    "topSourceIps": [
      {
        "ip": "192.168.1.100",
        "count": 1
      },
      {
        "ip": "192.168.100.45",
        "count": 1
      },
      {
        "ip": "10.0.12.85",
        "count": 1
      }
    ],
    "mitreDistribution": [
      {
        "techniqueId": "T1059",
        "name": "Command and Scripting Interpreter",
        "count": 900
      },
      {
        "techniqueId": "T1110",
        "name": "Brute Force",
        "count": 3
      },
      {
        "techniqueId": "T1078",
        "name": "Valid Accounts",
        "count": 1
      }
    ],
    "recentIncidents": [
      {
        "id": "4ce39e21-0420-4a46-ae03-26b0aa89bcab",
        "title": "Failed MFA Challenge Spike",
        "severity": "low",
        "status": "closed",
        "createdAt": "2026-06-22T08:00:32.835Z"
      },
      {
        "id": "f3710939-dc8c-4caf-9736-dfe700fdd532",
        "title": "Suspicious outbound connections to TOR",
        "severity": "medium",
        "status": "recovered",
        "createdAt": "2026-06-22T08:00:32.829Z"
      },
      {
        "id": "3d0a7f1e-f39d-4b1d-b1f7-9e665921c052",
        "title": "Compromised service account svc-sql",
        "severity": "high",
        "status": "open",
        "createdAt": "2026-06-22T08:00:32.822Z"
      },
      {
        "id": "2bf31b2f-d98e-493a-bfac-09af1ad2e8c2",
        "title": "Ransomware staging on FIN-WS-04",
        "severity": "critical",
        "status": "investigating",
        "createdAt": "2026-06-22T08:00:32.804Z"
      }
    ],
    "alertTrends": [
      {
        "hour": "08:30 am",
        "count": 1
      },
      {
        "hour": "12:30 pm",
        "count": 1
      },
      {
        "hour": "11:30 pm",
        "count": 72
      },
      {
        "hour": "12:30 am",
        "count": 292
      },
      {
        "hour": "01:30 am",
        "count": 127
      },
      {
        "hour": "07:30 am",
        "count": 309
      },
      {
        "hour": "08:30 am",
        "count": 103
      }
    ]
  },
  "timestamp": "2026-06-23T03:17:03.211Z",
  "requestId": "ac64364d-a29b-410c-b4df-674c6db58058"
}
```

---

## Deployment & Build Statuses

- **Typecheck Status:** Clean compilation, 0 errors.
- **Build Output:** Production bundle successfully created under `backend/dist`.
