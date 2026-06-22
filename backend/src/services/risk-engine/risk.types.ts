import { RISK_LEVELS } from './risk.constants';

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];

export interface RiskCalculationResult {
  score: number;
  level: RiskLevel;
  factors: {
    baseScore: number;
    userModifier: number;
    frequencyModifier: number;
    assetModifier: number;
    matchedEventId?: string;
    matchedUser?: string;
    frequencyCount?: number;
    matchedAssetType?: string;
  };
}
