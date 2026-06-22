export const EVENT_IDS = {
  LOGON_SUCCESS: '4624',
  LOGON_FAILURE: '4625',
  SPECIAL_PRIVILEGES: '4672',
  PROCESS_CREATION: '4688',
  USER_CREATION: '4720',
  GROUP_ADDED: '4728',
  ACCOUNT_LOCKOUT: '4740',
  SERVICE_INSTALLED: '7045',
} as const;

export const EVENT_ID_DESCRIPTIONS: Record<string, string> = {
  '4624': 'An account was successfully logged on',
  '4625': 'An account failed to log on',
  '4672': 'Special privileges assigned to new logon',
  '4688': 'A new process has been created',
  '4720': 'A user account was created',
  '4728': 'A member was added to a security-enabled global group',
  '4740': 'A user account was locked out',
  '7045': 'A service was installed in the system',
};

import { env } from '../../config/env';

export const getSplunkQueries = () => {
  const index = env.SPLUNK_INDEX || 'soc';
  return {
    RECENT_EVENTS: `search index=${index} (EventCode IN (4624, 4625, 4672, 4688, 4720, 4728, 4740, 7045) OR EventID IN (4624, 4625, 4672, 4688, 4720, 4728, 4740, 7045))`,
    BRUTE_FORCE: `search index=${index} (EventCode=4625 OR EventID=4625)`,
    PRIVILEGE_ESCALATION: `search index=${index} (EventCode IN (4672, 4728) OR EventID IN (4672, 4728))`,
    POWERSHELL: `search index=${index} ((EventCode=4688 OR EventID=4688) AND (NewProcessName="*powershell.exe" OR ProcessName="*powershell.exe" OR CommandLine="*powershell*"))`,
  };
};

export const SPLUNK_QUERIES = {
  get RECENT_EVENTS() { return getSplunkQueries().RECENT_EVENTS; },
  get BRUTE_FORCE() { return getSplunkQueries().BRUTE_FORCE; },
  get PRIVILEGE_ESCALATION() { return getSplunkQueries().PRIVILEGE_ESCALATION; },
  get POWERSHELL() { return getSplunkQueries().POWERSHELL; }
};
