import { z } from 'zod';

const severityEnum = z.enum(['info', 'low', 'medium', 'high', 'critical']);
const statusEnum = z.enum(['new', 'acknowledged', 'in_progress', 'resolved', 'false_positive', 'suppressed']);

export const createAlertSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
    description: z.string().optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    source: z.string({ required_error: 'Source is required' }).min(1, 'Source cannot be empty'),
    externalId: z.string().optional(),
    sourceRuleId: z.string().optional(),
    sourceRuleName: z.string().optional(),
    assetId: z.string().uuid('Asset ID must be a valid UUID').optional(),
    agentId: z.string().uuid('Agent ID must be a valid UUID').optional(),
    assignedTo: z.string().uuid('Assigned To must be a valid UUID').optional(),
    riskScore: z.number().min(0).max(100).optional(),
    rawEvent: z.record(z.any()).optional(),
    enrichment: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    firedAt: z.string().datetime({ message: 'Fired At must be a valid ISO 8601 string' }).optional(),
  }),
});

export const updateAlertSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID must be a valid UUID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    description: z.string().optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    assignedTo: z.string().uuid('Assigned To must be a valid UUID').nullable().optional(),
    acknowledgedBy: z.string().uuid('Acknowledged By must be a valid UUID').nullable().optional(),
    acknowledgedAt: z.string().datetime({ message: 'Acknowledged At must be a valid ISO 8601 string' }).nullable().optional(),
    resolvedBy: z.string().uuid('Resolved By must be a valid UUID').nullable().optional(),
    resolvedAt: z.string().datetime({ message: 'Resolved At must be a valid ISO 8601 string' }).nullable().optional(),
    falsePositiveNote: z.string().optional(),
    riskScore: z.number().min(0).max(100).optional(),
    tags: z.array(z.string()).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

export const getAlertSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID must be a valid UUID'),
  }),
});

export const queryAlertsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    source: z.string().optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    assetId: z.string().uuid('Asset ID must be a valid UUID').optional(),
    agentId: z.string().uuid('Agent ID must be a valid UUID').optional(),
    assignedTo: z.string().uuid('Assigned To must be a valid UUID').optional(),
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO 8601 string' }).optional(),
    endDate: z.string().datetime({ message: 'End date must be a valid ISO 8601 string' }).optional(),
    search: z.string().optional(),
  }),
});
