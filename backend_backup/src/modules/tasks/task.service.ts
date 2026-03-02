import prisma from '../../config/database';
import { NotFoundError, UnprocessableError } from '../../utils/errors';
import { logActivity } from '../../utils/activityLogger';

// Clean empty strings to undefined so Prisma doesn't choke on invalid dates/UUIDs
function sanitize(data: any) {
    const cleaned = { ...data };
    const optionalFields = ['due_date', 'assigned_user_id', 'dependency_task_id', 'description'];
    for (const field of optionalFields) {
        if (cleaned[field] === '' || cleaned[field] === null) {
            delete cleaned[field];
        }
    }
    if (cleaned.due_date && typeof cleaned.due_date === 'string') {
        cleaned.due_date = new Date(cleaned.due_date);
    }
    return cleaned;
}

export class TaskService {
    async create(data: any) {
        const clean = sanitize(data);
        // Validate project exists
        const project = await prisma.project.findUnique({ where: { id: clean.project_id } });
        if (!project) throw new NotFoundError('Project');

        if (clean.assigned_user_id) {
            const user = await prisma.user.findUnique({ where: { id: clean.assigned_user_id } });
            if (!user || !user.is_active) {
                throw new UnprocessableError('Cannot assign task to inactive or non-existent user');
            }
        }

        // Validate dependency exists if specified
        if (clean.dependency_task_id) {
            const dep = await prisma.task.findUnique({ where: { id: clean.dependency_task_id } });
            if (!dep) throw new NotFoundError('Dependency task');
        }

        const task = await prisma.task.create({
            data: clean,
            include: { assigned_user: { select: { id: true, first_name: true, last_name: true } } },
        });

        return task;
    }

    async findAll(filters: { project_id?: string; assigned_user_id?: string; status?: string; priority?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;
        const where: any = {
            project: { client: { deleted_at: null } }
        };

        if (filters.project_id) where.project_id = filters.project_id;
        if (filters.assigned_user_id) where.assigned_user_id = filters.assigned_user_id;
        if (filters.status) where.status = filters.status;
        if (filters.priority) where.priority = filters.priority;

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    assigned_user: { select: { id: true, first_name: true, last_name: true } },
                    project: { select: { id: true, title: true } },
                },
            }),
            prisma.task.count({ where }),
        ]);

        return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assigned_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                project: { select: { id: true, title: true } },
                dependency: { select: { id: true, title: true, status: true } },
                dependents: { select: { id: true, title: true, status: true } },
            },
        });
        if (!task) throw new NotFoundError('Task');
        return task;
    }

    async update(id: string, data: any) {
        const clean = sanitize(data);
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundError('Task');

        if (clean.assigned_user_id) {
            const user = await prisma.user.findUnique({ where: { id: clean.assigned_user_id } });
            if (!user || !user.is_active) {
                throw new UnprocessableError('Cannot assign task to inactive or non-existent user');
            }
        }

        const updated = await prisma.task.update({
            where: { id },
            data: clean,
            include: { assigned_user: { select: { id: true, first_name: true, last_name: true } } },
        });

        if (clean.status === 'DONE' && task.status !== 'DONE') {
            await logActivity(
                updated.assigned_user_id || 'SYSTEM',
                'Task',
                updated.id,
                'Completed Task',
                null,
                updated.title
            );
        }

        return updated;
    }

    async delete(id: string) {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundError('Task');
        await prisma.task.delete({ where: { id } });
        return { message: 'Task deleted successfully' };
    }

    async getKanbanByProject(projectId: string) {
        const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
        const board: Record<string, any[]> = {};

        for (const status of statuses) {
            board[status] = await prisma.task.findMany({
                where: { project_id: projectId, status },
                orderBy: { updated_at: 'desc' },
                include: {
                    assigned_user: { select: { id: true, first_name: true, last_name: true } },
                },
            });
        }

        return board;
    }
}

export const taskService = new TaskService();
