export const EVENT_BASE_SCORES: Record<string, number> = {
  '4624': 10,
  '4625': 60,
  '4672': 90,
  '4688': 40,
  '4720': 85,
  '4728': 80,
  '4740': 80,
  '7045': 95,
};

export const USER_MODIFIERS: Record<string, number> = {
  'Administrator': 15,
  'Admin': 15,
  'SYSTEM': 20,
};

export const ASSET_MODIFIERS: Record<string, number> = {
  'server': 10,
  'domain_controller': 20,
};

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
