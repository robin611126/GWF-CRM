import { z } from 'zod';

export const createLeadSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.enum(['MANUAL', 'WEBSITE', 'REFERRAL', 'ADS']).optional(),
        stage: z.enum(['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
        score: z.number().int().min(0).max(100).optional(),
        assigned_user_id: z.string().uuid().optional(),
        notes: z.string().optional(),
    }),
});

export const updateLeadSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        email: z.union([z.string().email(), z.literal('')]).optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.enum(['MANUAL', 'WEBSITE', 'REFERRAL', 'ADS']).optional(),
        stage: z.enum(['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
        score: z.number().int().min(0).max(100).optional(),
        assigned_user_id: z.string().uuid().nullable().optional(),
        notes: z.string().optional(),
        lost_reason: z.string().optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const listLeadsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        stage: z.string().optional(),
        source: z.string().optional(),
        assigned_user_id: z.string().optional(),
        search: z.string().optional(),
    }),
});
