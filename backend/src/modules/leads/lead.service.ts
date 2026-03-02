import prisma from '../../config/database';
import { ConflictError, NotFoundError, ValidationError, UnprocessableError } from '../../utils/errors';
import { logActivity } from '../../utils/activityLogger';

export class LeadService {
    async create(data: any) {
        // Check for duplicate email if one is provided
        if (data.email) {
            const existing = await prisma.lead.findUnique({ where: { email: data.email } });
            if (existing) {
                throw new ConflictError('A lead with this email already exists');
            }
        }

        // Auto-calculate score if not provided
        if (data.score === undefined) {
            data.score = this.calculateScore(data);
        }

        const lead = await prisma.lead.create({
            data,
            include: { assigned_user: { select: { id: true, first_name: true, last_name: true } } },
        });

        // The controller should ideally pass the user ID, but as a fallback or for system actions:
        if (data.assigned_user_id) {
            await logActivity(data.assigned_user_id, 'Lead', lead.id, 'Created Lead', null, lead.name);
        }

        return lead;
    }

    async findAll(filters: {
        page?: number;
        limit?: number;
        stage?: string;
        source?: string;
        assigned_user_id?: string;
        search?: string;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filters.stage) {
            where.stage = filters.stage;
        }
        if (filters.source) {
            where.source = filters.source;
        }
        if (filters.assigned_user_id) {
            where.assigned_user_id = filters.assigned_user_id;
        }
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search } },
                { email: { contains: filters.search } },
                { company: { contains: filters.search } },
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    assigned_user: { select: { id: true, first_name: true, last_name: true } },
                    _count: { select: { attachments: true } },
                    converted_client: { select: { frozen: true } },
                },
            }),
            prisma.lead.count({ where }),
        ]);

        return { leads, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const lead = await prisma.lead.findUnique({
            where: { id },
            include: {
                assigned_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                attachments: true,
                converted_client: { select: { id: true, name: true, frozen: true } },
            },
        });

        if (!lead) {
            throw new NotFoundError('Lead');
        }

        return lead;
    }

    async update(id: string, data: any) {
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) {
            throw new NotFoundError('Lead');
        }

        // Check duplicate email if email is being changed
        if (data.email && data.email !== lead.email) {
            const existing = await prisma.lead.findUnique({ where: { email: data.email } });
            if (existing) {
                throw new ConflictError('A lead with this email already exists');
            }
        }

        // Handle stage transition to LOST
        if (data.stage === 'LOST' && lead.stage !== 'LOST') {
            if (!data.lost_reason) {
                throw new ValidationError('A reason is required when marking a lead as Lost');
            }
        }

        // Handle stage transition away from WON → FREEZE the client (don't delete!)
        if (lead.stage === 'WON' && data.stage && data.stage !== 'WON') {
            const linkedClient = await prisma.client.findFirst({ where: { lead_id: id } });
            if (linkedClient) {
                await prisma.client.update({
                    where: { id: linkedClient.id },
                    data: { frozen: true },
                });
            }
        }

        // Handle stage transition TO WON → UNFREEZE existing client, or create new one
        if (data.stage === 'WON' && lead.stage !== 'WON') {
            const existingClient = await prisma.client.findFirst({ where: { lead_id: id } });
            if (existingClient) {
                // Unfreeze the existing client
                await prisma.client.update({
                    where: { id: existingClient.id },
                    data: { frozen: false },
                });
                // Just update the lead stage normally
                const updated = await prisma.lead.update({
                    where: { id },
                    data,
                    include: {
                        assigned_user: { select: { id: true, first_name: true, last_name: true } },
                    },
                });
                return updated;
            } else {
                // No existing client — create one via convertLeadToClient
                const updated = await this.convertLeadToClient(id, lead, data);
                return updated;
            }
        }

        // Normal update (no stage change to WON)
        const updated = await prisma.lead.update({
            where: { id },
            data,
            include: {
                assigned_user: { select: { id: true, first_name: true, last_name: true } },
            },
        });

        return updated;
    }

    async delete(id: string) {
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) {
            throw new NotFoundError('Lead');
        }

        await prisma.lead.delete({ where: { id } });
        return { message: 'Lead deleted successfully' };
    }

    async getKanbanData() {
        const stages = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'] as const;
        const pipeline: Record<string, any[]> = {};

        for (const stage of stages) {
            pipeline[stage] = await prisma.lead.findMany({
                where: { stage },
                orderBy: { updated_at: 'desc' },
                include: {
                    assigned_user: { select: { id: true, first_name: true, last_name: true } },
                    converted_client: { select: { frozen: true } },
                },
            });
        }

        return pipeline;
    }

    async updateStage(id: string, stage: string, lost_reason?: string) {
        return this.update(id, { stage, lost_reason });
    }

    async convertToClient(leadId: string) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new NotFoundError('Lead');

        // Check if already converted
        const existingClient = await prisma.client.findFirst({ where: { lead_id: leadId } });
        if (existingClient) {
            throw new ConflictError('This lead has already been converted to a client');
        }

        // Check if a client with this email already exists, provided the lead has an email
        if (lead.email) {
            const existingClientByEmail = await prisma.client.findFirst({ where: { email: lead.email, deleted_at: null } });
            if (existingClientByEmail) {
                throw new ConflictError('A client with this email already exists');
            }
        }

        return this.convertLeadToClient(leadId, lead, {});
    }

    async checkDuplicate(email: string) {
        const existing = await prisma.lead.findUnique({ where: { email } });
        return { isDuplicate: !!existing, lead: existing };
    }

    private async convertLeadToClient(leadId: string, lead: any, updateData: any) {
        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Update lead to WON
            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data: { ...updateData, stage: 'WON' },
            });

            // Create client from lead or restore soft-deleted one if email matches
            let client;
            if (lead.email) {
                const softDeletedClient = await tx.client.findFirst({
                    where: { email: lead.email, deleted_at: { not: null } }
                });
                if (softDeletedClient) {
                    client = await tx.client.update({
                        where: { id: softDeletedClient.id },
                        data: {
                            deleted_at: null,
                            lead_id: leadId,
                            name: lead.name,
                            company: lead.company,
                            phone: lead.phone,
                            frozen: false
                        }
                    });
                }
            }

            if (!client) {
                client = await tx.client.create({
                    data: {
                        name: lead.name,
                        email: lead.email,
                        company: lead.company,
                        phone: lead.phone,
                        lead_id: leadId,
                    },
                });
            }

            // Create initial project
            const project = await tx.project.create({
                data: {
                    client_id: client.id,
                    title: `${lead.company || lead.name} - Initial Project`,
                    description: `Auto-created project from lead conversion`,
                    status: 'PLANNING',
                },
            });

            // Add default milestones to the project
            const defaultMilestones = [
                { label: 'Requirements Gathering', sort_order: 1 },
                { label: 'Design Phase', sort_order: 2 },
                { label: 'Development', sort_order: 3 },
                { label: 'Testing & QA', sort_order: 4 },
                { label: 'Deployment & Handover', sort_order: 5 }
            ];

            await tx.projectChecklist.createMany({
                data: defaultMilestones.map(m => ({
                    ...m,
                    project_id: project.id,
                    is_completed: false
                }))
            });

            return { lead: updatedLead, client, project };
        });

        // Log the conversion
        // Using assigned user as a fallback if the req user is not passed down directly
        if (result.lead.assigned_user_id) {
            await logActivity(
                result.lead.assigned_user_id,
                'Lead',
                leadId,
                'Converted to Client',
                null,
                result.client.name
            );
        }

        return result;
    }

    private calculateScore(data: any): number {
        let score = 10; // Base score
        if (data.company) score += 15;
        if (data.phone) score += 10;
        if (data.source === 'REFERRAL') score += 25;
        else if (data.source === 'WEBSITE') score += 15;
        else if (data.source === 'ADS') score += 10;
        if (data.notes) score += 5;
        return Math.min(score, 100);
    }
}

export const leadService = new LeadService();
