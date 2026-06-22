import { z } from 'zod';

const severityEnum = z.enum(['info', 'low', 'medium', 'high', 'critical']);
const statusEnum = z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']);

export const createIncidentSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty').max(512),
    description: z.string().optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    priority: z.number().int().min(1).max(5).optional(),
    assignedAnalyst: z.string().uuid('Assigned Analyst must be a valid UUID').optional(),
    createdBy: z.string().uuid('Created By must be a valid UUID').optional(),
    assignedTeam: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
    alertIds: z.array(z.string().uuid('Alert ID must be a valid UUID')).optional()
  })
});

export const updateIncidentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Incident ID must be a valid UUID')
  }),
  body: z.object({
    title: z.string().min(1).max(512).optional(),
    description: z.string().optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    priority: z.number().int().min(1).max(5).optional(),
    assignedAnalyst: z.string().uuid('Assigned Analyst must be a valid UUID').nullable().optional(),
    assignedTeam: z.string().nullable().optional(),
    rootCause: z.string().nullable().optional(),
    executiveSummary: z.string().nullable().optional(),
    lessonsLearned: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional()
  })
});

export const assignAnalystSchema = z.object({
  params: z.object({
    id: z.string().uuid('Incident ID must be a valid UUID')
  }),
  body: z.object({
    assignedAnalyst: z.string().uuid('Assigned Analyst must be a valid UUID').nullable()
  })
});

export const addCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Incident ID must be a valid UUID')
  }),
  body: z.object({
    body: z.string({ required_error: 'Comment body is required' }).min(1, 'Comment body cannot be empty'),
    authorId: z.string().uuid('Author ID must be a valid UUID'),
    isInternal: z.boolean().optional(),
    parentId: z.string().uuid('Parent ID must be a valid UUID').optional()
  })
});

export const getIncidentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Incident ID must be a valid UUID')
  })
});

export const listIncidentsSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    severity: severityEnum.optional(),
    assignedAnalyst: z.string().uuid('Assigned Analyst must be a valid UUID').optional(),
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional()
  }).optional()
});
