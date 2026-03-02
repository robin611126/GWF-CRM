import prisma from '../../config/database';
import { NotFoundError, UnprocessableError, ValidationError } from '../../utils/errors';
import { logActivity } from '../../utils/activityLogger';

export class ProjectService {
    async create(data: any) {
        // Clean empty strings
        if (!data.start_date) delete data.start_date;
        else data.start_date = new Date(data.start_date);
        if (!data.end_date) delete data.end_date;
        else data.end_date = new Date(data.end_date);
        if (!data.budget) delete data.budget;

        const client = await prisma.client.findUnique({ where: { id: data.client_id } });
        if (!client || client.deleted_at) {
            throw new NotFoundError('Client');
        }

        const project = await prisma.project.create({
            data,
            include: { client: { select: { id: true, name: true, company: true } } },
        });

        // Auto-create default web dev checklist
        const defaultChecklist = [
            'Requirements & Scope Finalized',
            'UI/UX Design & Wireframes',
            'Design Approved by Client',
            'Framework & Tech Stack Setup',
            'Homepage Development',
            'Inner Pages Development',
            'Content Integration',
            'Contact Forms & CTAs',
            'Mobile Responsiveness',
            'SEO Setup & Meta Tags',
            'Domain & Hosting Configuration',
            'SSL Certificate Setup',
            'Testing & QA',
            'Client Review & Feedback',
            'Go Live & Deployment',
        ];

        await prisma.projectChecklist.createMany({
            data: defaultChecklist.map((label, i) => ({
                project_id: project.id,
                label,
                sort_order: i,
            })),
        });

        // We don't have direct access to req.user here in service create method signature yet, 
        // but for now we log it without a user, or we could modify the signature.
        // For simplicity, let's log it as a system action if userId is missing, but usually project creation doesn't have an assigned user like lead, so we'll pass 'SYSTEM' for now unless we update the signature.
        await logActivity('SYSTEM', 'Project', project.id, 'Created Project', null, project.title);

        return project;
    }

    async findAll(filters: { page?: number; limit?: number; status?: string; client_id?: string; search?: string }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where: any = {
            client: { deleted_at: null }
        };

        if (filters.status) where.status = filters.status;
        if (filters.client_id) where.client_id = filters.client_id;
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search } },
                { description: { contains: filters.search } },
            ];
        }

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    client: { select: { id: true, name: true, company: true } },
                    _count: { select: { tasks: true } },
                },
            }),
            prisma.project.count({ where }),
        ]);

        return { projects, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, name: true, company: true, email: true, phone: true, domain: true, plan: true } },
                tasks: {
                    orderBy: { created_at: 'desc' },
                    include: { assigned_user: { select: { id: true, first_name: true, last_name: true } } },
                },
                files: true,
                invoices: { include: { items: true } },
                checklist: { orderBy: { sort_order: 'asc' } },
            },
        });

        if (!project) {
            throw new NotFoundError('Project');
        }

        return project;
    }

    async update(id: string, data: any, userId: string) {
        // Clean date strings
        if (data.start_date) data.start_date = new Date(data.start_date).toISOString();
        if (data.end_date) data.end_date = new Date(data.end_date).toISOString();

        const project = await prisma.project.findUnique({
            where: { id },
            include: { tasks: { where: { status: { not: 'DONE' } } } },
        });

        if (!project) {
            throw new NotFoundError('Project');
        }

        // Cannot mark Completed if open tasks exist
        if (data.status === 'COMPLETED' && project.tasks.length > 0) {
            throw new UnprocessableError('Cannot mark project as Completed while open tasks exist');
        }

        // Track revision history for key fields
        const trackedFields = ['title', 'description', 'status', 'budget', 'start_date', 'end_date'];
        const revisions: any[] = [];

        for (const field of trackedFields) {
            if (data[field] !== undefined && String(data[field]) !== String((project as any)[field])) {
                revisions.push({
                    entity_type: 'Project',
                    entity_id: id,
                    field,
                    old_value: String((project as any)[field]),
                    new_value: String(data[field]),
                    changed_by: userId,
                });
            }
        }

        const [updated] = await prisma.$transaction([
            prisma.project.update({ where: { id }, data }),
            ...(revisions.length > 0 ? [prisma.revisionHistory.createMany({ data: revisions })] : []),
        ]);

        return updated;
    }

    async delete(id: string) {
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) throw new NotFoundError('Project');
        await prisma.project.delete({ where: { id } });
        return { message: 'Project deleted successfully' };
    }

    // Checklist operations
    async addChecklistItem(projectId: string, label: string) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project');

        const maxOrder = await prisma.projectChecklist.findFirst({
            where: { project_id: projectId },
            orderBy: { sort_order: 'desc' },
        });

        return prisma.projectChecklist.create({
            data: {
                project_id: projectId,
                label,
                sort_order: (maxOrder?.sort_order || 0) + 1,
            },
        });
    }

    async toggleChecklistItem(itemId: string) {
        const item = await prisma.projectChecklist.findUnique({ where: { id: itemId } });
        if (!item) throw new NotFoundError('Checklist item');

        return prisma.projectChecklist.update({
            where: { id: itemId },
            data: {
                is_completed: !item.is_completed,
                completed_at: !item.is_completed ? new Date() : null,
            },
        });
    }

    async deleteChecklistItem(itemId: string) {
        const item = await prisma.projectChecklist.findUnique({ where: { id: itemId } });
        if (!item) throw new NotFoundError('Checklist item');
        await prisma.projectChecklist.delete({ where: { id: itemId } });
        return { message: 'Checklist item removed' };
    }

    // File operations
    async addFile(projectId: string, file: Express.Multer.File) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project');

        return prisma.projectFile.create({
            data: {
                project_id: projectId,
                filename: file.originalname,
                filepath: file.path,
                mimetype: file.mimetype,
                size: file.size,
            },
        });
    }

    async deleteFile(fileId: string) {
        const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
        if (!file) throw new NotFoundError('File');
        await prisma.projectFile.delete({ where: { id: fileId } });
        return { message: 'File deleted' };
    }
}

export const projectService = new ProjectService();
